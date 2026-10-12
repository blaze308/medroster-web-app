'use client';

import { useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { auth } from '../../lib/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
    });
}

const ROSTER_ACCEPT = '.docx,.xlsx,.pdf,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp';
const MAX_ROSTER_BYTES = 10 * 1024 * 1024;

function isRosterImage(file) {
    return String(file.type || '').startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name || '');
}

function compressRosterImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const max = 1600;
            let w = img.width;
            let h = img.height;
            if (w > max || h > max) {
                const scale = Math.min(max / w, max / h);
                w = Math.round(w * scale);
                h = Math.round(h * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (!blob) {
                    reject(new Error('Could not compress image'));
                    return;
                }
                const name = String(file.name || 'roster.jpg').replace(/\.[^.]+$/, '.jpg');
                resolve(new File([blob], name, { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.82);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read image'));
        };
        img.src = url;
    });
}

async function prepareRosterFile(file) {
    if (file.size > MAX_ROSTER_BYTES) throw new Error('File is too large (max 10 MB)');
    if (isRosterImage(file) && file.size > 2 * 1024 * 1024) return compressRosterImage(file);
    return file;
}

/**
 * Import staff from CSV or an existing duty roster (Word, Excel, PDF, or photo).
 * modes: 'hospital' | 'individual' | 'guest'
 */
export default function ImportStaffModal({
    mode = 'hospital',
    hospitalId,
    departments = [],
    wards = [],
    defaultDepartmentId,
    defaultWardId,
    lockWard = false,
    onClose,
    onImported,
}) {
    if (mode !== 'hospital') {
        return (
            <CsvImmediateModal
                mode={mode}
                hospitalId={hospitalId}
                departments={departments}
                wards={wards}
                onClose={onClose}
                onImported={onImported}
            />
        );
    }

    return (
        <HospitalImportModal
            hospitalId={hospitalId}
            departments={departments}
            wards={wards}
            defaultDepartmentId={defaultDepartmentId}
            defaultWardId={defaultWardId}
            lockWard={lockWard}
            onClose={onClose}
            onImported={onImported}
        />
    );
}

function HospitalImportModal({
    hospitalId, departments, wards, onClose, onImported,
    defaultDepartmentId: defaultDepartmentIdProp,
    defaultWardId: defaultWardIdProp,
    lockWard = false,
}) {
    const [step, setStep] = useState('chooser');
    const [path, setPath] = useState(null);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [showGrid, setShowGrid] = useState(false);
    const [defaultDepartmentId, setDefaultDepartmentId] = useState(defaultDepartmentIdProp || departments[0]?._id || '');
    const [defaultWardId, setDefaultWardId] = useState(defaultWardIdProp || wards[0]?._id || '');
    const [rules, setRules] = useState({
        leaveStayOff: true,
        offAndHolidayStayOff: true,
        keepGridAsIs: true,
    });

    const selectedCount = useMemo(
        () => (preview?.staff || []).filter((s) => s.selected !== false).length,
        [preview]
    );

    const downloadTemplate = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`${API_URL}/api/hospitals/${hospitalId}/staff/template/download`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'medroster-staff-template.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message || 'Failed to download template');
        }
    };

    const runParse = async () => {
        if (!file) { setError('Choose a file first'); return; }
        setLoading(true);
        setError('');
        try {
            let data;
            if (path === 'csv') {
                const text = await file.text();
                data = await apiFetch(`/api/hospitals/${hospitalId}/staff/parse-csv`, {
                    method: 'POST',
                    body: JSON.stringify({ csvText: text }),
                });
            } else {
                const ready = await prepareRosterFile(file);
                const dataUrl = await fileToBase64(ready);
                const fileBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
                data = await apiFetch(`/api/hospitals/${hospitalId}/staff/extract`, {
                    method: 'POST',
                    body: JSON.stringify({ fileBase64, fileName: ready.name || file.name }),
                });
            }
            const staff = (data.staff || []).map((s, i) => ({
                ...s,
                key: s.key || s.no || `row-${i}`,
                selected: s.selected !== false && !(s.errors && s.errors.length),
            }));
            setPreview({ ...data, staff });
            setStep('review');
        } catch (err) {
            setError(err.message || 'Could not read that file');
        } finally {
            setLoading(false);
        }
    };

    const updateRow = (key, patch) => {
        setPreview((p) => ({
            ...p,
            staff: p.staff.map((s) => (s.key === key ? { ...s, ...patch } : s)),
        }));
    };

    const confirm = async () => {
        const selected = (preview?.staff || []).filter((s) => s.selected !== false);
        if (!selected.length) { setError('Select at least one staff row'); return; }
        if (!defaultDepartmentId || !defaultWardId) {
            setError('Pick a default department and ward');
            return;
        }
        setLoading(true);
        setError('');
        try {
            let data;
            if (preview.source === 'roster') {
                data = await apiFetch(`/api/hospitals/${hospitalId}/staff/import-roster`, {
                    method: 'POST',
                    body: JSON.stringify({
                        staff: selected,
                        days: preview.days || [],
                        title: preview.title,
                        defaultDepartmentId,
                        defaultWardId,
                        createSchedule: rules.keepGridAsIs,
                        rules,
                    }),
                });
            } else {
                data = await apiFetch(`/api/hospitals/${hospitalId}/staff/import`, {
                    method: 'POST',
                    body: JSON.stringify({
                        staff: selected,
                        defaultDepartmentId,
                        defaultWardId,
                    }),
                });
            }
            setResult(data);
            setStep('done');
        } catch (err) {
            setError(err.message || 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    const wardName = wards.find((w) => String(w._id) === String(defaultWardId))?.name || 'this ward';
    const monthLabel = preview?.days?.[0]?.date
        ? new Date(`${preview.days[0].date}T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : '';
    const stepHint = {
        chooser: 'Start from a spreadsheet, or upload a duty roster you already have.',
        upload: path === 'csv' ? 'Download the template if you need it, then upload your CSV.' : 'Upload a Word, Excel, PDF, or photo of the roster.',
        review: 'Tick who to keep. Nothing is saved yet.',
        rules: 'How should we read the file? Core roster rules stay on.',
        done: 'People are on this ward. Open the roster when you want to edit shifts.',
    }[step];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className={`bg-white rounded-[28px] shadow-xl w-full p-6 max-h-[90vh] overflow-y-auto ${step === 'review' && showGrid ? 'max-w-5xl' : 'max-w-lg'}`}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-extrabold text-ghs-deep">
                            {step === 'done' ? 'Imported' : 'Import roster'}
                        </h3>
                        <p className="text-xs text-ghs-muted font-medium mt-1">{stepHint}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-ghs-muted hover:text-ghs-deep text-xl leading-none">×</button>
                </div>

                {step === 'chooser' && (
                    <div className="grid gap-3">
                        <button
                            type="button"
                            onClick={() => { setPath('csv'); setStep('upload'); setError(''); }}
                            className="text-left rounded-2xl border border-slate-200 p-4 hover:border-ghs-teal hover:bg-ghs-teal/5"
                        >
                            <div className="text-sm font-extrabold text-ghs-deep">I don’t have a roster yet</div>
                            <div className="text-xs text-ghs-muted font-medium mt-1">Fill the CSV template with names and ranks, then review before save.</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setPath('roster'); setStep('upload'); setError(''); }}
                            className="text-left rounded-2xl border border-slate-200 p-4 hover:border-ghs-teal hover:bg-ghs-teal/5"
                        >
                            <div className="text-sm font-extrabold text-ghs-deep">I have an existing duty roster</div>
                            <div className="text-xs text-ghs-muted font-medium mt-1">Upload a Word, Excel, PDF, or photo of the calendar. Review the extract, then we seed a draft schedule you can rearrange.</div>
                        </button>
                    </div>
                )}

                {step === 'upload' && (
                    <div className="space-y-4">
                        {path === 'csv' && (
                            <button
                                type="button"
                                onClick={downloadTemplate}
                                className="w-full h-12 rounded-2xl border border-ghs-teal/30 text-ghs-teal font-bold text-sm hover:bg-ghs-teal/5"
                            >
                                Download CSV template
                            </button>
                        )}
                        {!lockWard && (
                            <DeptWardPickers
                                departments={departments}
                                wards={wards}
                                defaultDepartmentId={defaultDepartmentId}
                                defaultWardId={defaultWardId}
                                setDefaultDepartmentId={setDefaultDepartmentId}
                                setDefaultWardId={setDefaultWardId}
                            />
                        )}
                        {lockWard && (
                            <p className="text-xs font-medium text-ghs-muted">Saving to <span className="font-bold text-ghs-deep">{wardName}</span>.</p>
                        )}
                        <FileDropZone
                            accept={path === 'csv' ? '.csv,text/csv' : ROSTER_ACCEPT}
                            file={file}
                            onFile={setFile}
                            title={path === 'csv' ? 'Drop your CSV here, or click to browse' : 'Drop your roster here, or click to browse'}
                            hint={
                                path === 'csv'
                                    ? 'CSV only · max 10 MB'
                                    : 'Word (.docx), Excel (.xlsx), PDF, or photo (PNG, JPG, WebP) · max 10 MB'
                            }
                        />
                    </div>
                )}

                {step === 'review' && preview && (
                    <ReviewTable
                        preview={preview}
                        updateRow={updateRow}
                        showGrid={showGrid}
                        onToggleGrid={() => setShowGrid((v) => !v)}
                    />
                )}

                {step === 'rules' && (
                    <div className="space-y-3">
                        {[
                            { key: 'leaveStayOff', label: 'People on leave stay off', hint: 'Do not put them on shifts for those days.' },
                            { key: 'offAndHolidayStayOff', label: 'Off and holiday stay off', hint: 'O and H cells are not shifts.' },
                            { key: 'keepGridAsIs', label: 'Keep the uploaded grid', hint: 'Do not auto-generate over what we just read.' },
                        ].map((item) => (
                            <label key={item.key} className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 bg-ghs-surface">
                                <input
                                    type="checkbox"
                                    className="mt-1 accent-ghs-teal"
                                    checked={rules[item.key]}
                                    onChange={(e) => setRules((r) => ({ ...r, [item.key]: e.target.checked }))}
                                />
                                <span>
                                    <span className="block text-sm font-extrabold text-ghs-deep">{item.label}</span>
                                    <span className="block text-[11px] font-medium text-ghs-muted mt-0.5">{item.hint}</span>
                                </span>
                            </label>
                        ))}
                        <p className="text-[11px] font-medium text-ghs-muted px-1">
                            Morning senior cover is always checked on the calendar.
                        </p>
                    </div>
                )}

                {step === 'done' && result && (
                    <div className="py-4">
                        <p className="text-base font-extrabold text-ghs-deep">
                            {result.imported} {result.imported === 1 ? 'staff member' : 'staff'} on {wardName}
                            {monthLabel ? ` for ${monthLabel}` : ''}.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-bold text-rose-600">{error}</div>
                )}

                <div className="flex gap-3 pt-4">
                    {step === 'chooser' || step === 'done' ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (step === 'done') onImported?.({ ...result, stayOnWard: true });
                                else onClose();
                            }}
                            className="flex-1 h-12 rounded-2xl border border-slate-200 font-bold text-sm text-ghs-muted"
                        >
                            {step === 'done' ? 'Stay on this ward' : 'Close'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setError('');
                                if (step === 'rules') setStep('review');
                                else if (step === 'review') { setStep('upload'); setPreview(null); }
                                else { setStep('chooser'); setFile(null); }
                            }}
                            className="flex-1 h-12 rounded-2xl border border-slate-200 font-bold text-sm text-ghs-muted"
                        >
                            Back
                        </button>
                    )}
                    {step === 'upload' && (
                        <button
                            type="button"
                            disabled={loading || !file}
                            onClick={runParse}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm disabled:opacity-50"
                        >
                            {loading ? 'Reading…' : 'Read file'}
                        </button>
                    )}
                    {step === 'review' && (
                        <button
                            type="button"
                            disabled={loading || !selectedCount}
                            onClick={() => {
                                setError('');
                                if (preview?.source === 'roster') setStep('rules');
                                else confirm();
                            }}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm disabled:opacity-50"
                        >
                            {preview?.source === 'roster'
                                ? `Continue with ${selectedCount}`
                                : (loading ? 'Saving…' : `Confirm ${selectedCount} staff`)}
                        </button>
                    )}
                    {step === 'rules' && (
                        <button
                            type="button"
                            disabled={loading || !selectedCount}
                            onClick={confirm}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm disabled:opacity-50"
                        >
                            {loading ? 'Saving…' : 'Save'}
                        </button>
                    )}
                    {step === 'done' && result?.scheduleId && (
                        <button
                            type="button"
                            onClick={() => onImported?.({ ...result, openRoster: true })}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm"
                        >
                            Open roster
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function FileDropZone({ accept, file, onFile, title, hint }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const pick = (next) => {
        if (!next) return;
        onFile(next);
    };

    return (
        <div>
            <p className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1 mb-2">
                Upload file here
            </p>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragging(false);
                    pick(e.dataTransfer.files?.[0] || null);
                }}
                className={`w-full rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                    dragging
                        ? 'border-ghs-teal bg-ghs-teal/10'
                        : file
                            ? 'border-ghs-teal/40 bg-ghs-teal/5'
                            : 'border-slate-200 bg-ghs-surface hover:border-ghs-teal hover:bg-ghs-teal/5'
                }`}
            >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-100 text-ghs-teal">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>
                <p className="text-sm font-extrabold text-ghs-deep">
                    {file ? file.name : title}
                </p>
                <p className="text-[11px] font-medium text-ghs-muted mt-1.5 leading-snug">
                    {file ? 'Click to choose a different file' : hint}
                </p>
            </button>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="sr-only"
                onChange={(e) => {
                    pick(e.target.files?.[0] || null);
                    e.target.value = '';
                }}
            />
        </div>
    );
}

function DeptWardPickers({ departments, wards, defaultDepartmentId, defaultWardId, setDefaultDepartmentId, setDefaultWardId }) {
    const departmentWards = wards.filter((w) => String(w.departmentId) === String(defaultDepartmentId));
    return (
        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Default department</label>
                <select
                    value={defaultDepartmentId}
                    onChange={(e) => {
                        setDefaultDepartmentId(e.target.value);
                        const first = wards.find((w) => String(w.departmentId) === e.target.value);
                        setDefaultWardId(first?._id || '');
                    }}
                    className="w-full h-11 mt-1 rounded-xl border border-slate-100 bg-ghs-surface px-3 text-sm"
                >
                    <option value="">—</option>
                    {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Default ward</label>
                <select
                    value={defaultWardId}
                    onChange={(e) => setDefaultWardId(e.target.value)}
                    className="w-full h-11 mt-1 rounded-xl border border-slate-100 bg-ghs-surface px-3 text-sm"
                >
                    <option value="">—</option>
                    {(departmentWards.length ? departmentWards : wards).map((w) => (
                        <option key={w._id} value={w._id}>{w.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function ReviewTable({ preview, updateRow, showGrid, onToggleGrid }) {
    const days = preview.days || [];
    return (
        <div className="space-y-4">
            {preview.title && (
                <p className="text-xs font-bold text-ghs-deep">
                    {preview.title}
                    {preview.aiUsed ? <span className="ml-2 font-medium text-ghs-muted">· AI extract</span> : <span className="ml-2 font-medium text-ghs-muted">· grid parse</span>}
                </p>
            )}
            {preview.source === 'roster' && (
                <button type="button" onClick={onToggleGrid} className="text-[11px] font-bold text-ghs-teal">
                    {showGrid ? 'Hide day grid' : 'Show day grid'}
                </button>
            )}
            <div className="overflow-auto max-h-[50vh] border border-slate-100 rounded-2xl">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                        <tr className="text-left text-[10px] uppercase tracking-wider text-ghs-muted">
                            <th className="p-2">In</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Rank</th>
                            {preview.source === 'csv' && <th className="p-2">Phone</th>}
                            {preview.source === 'roster' && showGrid && days.slice(0, 16).map((d) => (
                                <th key={d.date} className="p-1 font-bold text-center">{d.dayNum || d.dow}</th>
                            ))}
                            <th className="p-2">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(preview.staff || []).map((s) => (
                            <tr key={s.key} className={s.selected === false ? 'opacity-40' : ''}>
                                <td className="p-2">
                                    <input
                                        type="checkbox"
                                        checked={s.selected !== false}
                                        onChange={(e) => updateRow(s.key, { selected: e.target.checked })}
                                    />
                                </td>
                                <td className="p-2 min-w-[140px]">
                                    <input
                                        className="w-full bg-transparent font-bold"
                                        value={`${s.firstName || ''} ${s.lastName || ''}`.trim()}
                                        onChange={(e) => {
                                            const parts = e.target.value.trim().split(/\s+/);
                                            updateRow(s.key, { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') });
                                        }}
                                    />
                                </td>
                                <td className="p-2 min-w-[120px]">
                                    <input
                                        className="w-full bg-transparent"
                                        value={s.rankFull || s.rank || ''}
                                        onChange={(e) => updateRow(s.key, { rankFull: e.target.value, rank: e.target.value })}
                                    />
                                    {s.rankAbbr && <div className="text-[10px] text-ghs-muted">{s.rankAbbr}</div>}
                                </td>
                                {preview.source === 'csv' && (
                                    <td className="p-2">{s.phone || '—'}</td>
                                )}
                                {preview.source === 'roster' && showGrid && days.slice(0, 16).map((d) => {
                                    const cell = (s.cells || []).find((c) => c.date === d.date);
                                    return (
                                        <td key={d.date} className="p-1 text-center font-bold" title={cell?.unit || cell?.text || ''}>
                                            <div>{cell?.code || cell?.text || ''}</div>
                                        </td>
                                    );
                                })}
                                <td className="p-2 text-ghs-muted">
                                    {s.leaveNote || (s.errors || []).join('; ') || ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CsvImmediateModal({ mode, hospitalId, departments, wards, onClose, onImported }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [defaultDepartmentId, setDefaultDepartmentId] = useState(departments[0]?._id || '');
    const [defaultWardId, setDefaultWardId] = useState(wards[0]?._id || '');

    const templateUrl = mode === 'individual'
        ? `${API_URL}/api/me/staff/template`
        : `${API_URL}/api/guest/staff/template`;

    const downloadTemplate = async () => {
        try {
            if (mode === 'guest') {
                window.open(templateUrl, '_blank');
                return;
            }
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(templateUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'medroster-staff-template.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message || 'Failed to download template');
        }
    };

    const handleUpload = async () => {
        if (!file) { setError('Choose a CSV file first'); return; }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const text = await file.text();
            let data;
            if (mode === 'guest') {
                const res = await fetch(`${API_URL}/api/guest/staff/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ csvText: text }),
                });
                data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Import failed');
            } else {
                data = await apiFetch('/api/me/staff/import', {
                    method: 'POST',
                    body: JSON.stringify({ csvText: text }),
                });
            }
            setResult(data);
            if (data.imported > 0) onImported?.(data);
        } catch (err) {
            setError(err.message || 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-[28px] shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-extrabold text-ghs-deep">Import staff</h3>
                        <p className="text-xs text-ghs-muted font-medium mt-1">
                            Download the CSV template, fill it in Excel, then upload.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-ghs-muted hover:text-ghs-deep text-xl leading-none">×</button>
                </div>

                <div className="space-y-4">
                    <button
                        type="button"
                        onClick={downloadTemplate}
                        className="w-full h-12 rounded-2xl border border-ghs-teal/30 text-ghs-teal font-bold text-sm hover:bg-ghs-teal/5"
                    >
                        Download CSV template
                    </button>

                    {mode === 'hospital' && (
                        <DeptWardPickers
                            departments={departments}
                            wards={wards}
                            defaultDepartmentId={defaultDepartmentId}
                            defaultWardId={defaultWardId}
                            setDefaultDepartmentId={setDefaultDepartmentId}
                            setDefaultWardId={setDefaultWardId}
                        />
                    )}

                    <FileDropZone
                        accept=".csv,text/csv"
                        file={file}
                        onFile={setFile}
                        title="Drop your completed CSV here, or click to browse"
                        hint="CSV only · max 10 MB"
                    />

                    {error && (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-bold text-rose-600">{error}</div>
                    )}

                    {result && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs font-medium text-emerald-800">
                            Imported <strong>{result.imported}</strong>
                            {result.failed ? <> · Failed <strong>{result.failed}</strong></> : null}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 h-12 rounded-2xl border border-slate-200 font-bold text-sm text-ghs-muted">
                            Close
                        </button>
                        <button
                            type="button"
                            disabled={loading || !file}
                            onClick={handleUpload}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm disabled:opacity-50"
                        >
                            {loading ? 'Importing…' : 'Upload & import'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
