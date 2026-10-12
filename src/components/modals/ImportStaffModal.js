'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { auth } from '../../lib/firebase';
import { LEAVE_LEGEND, RANKS_BY_CATEGORY, STAFF_CATEGORIES } from '../../lib/ghana-data';

/** Map extracted rank / abbr onto a catalog rank so the review select can prefill. */
function resolveImportedRank(...candidates) {
    const catalog = [];
    for (const list of Object.values(RANKS_BY_CATEGORY)) catalog.push(...list);
    const uniq = [...new Set(catalog)];
    for (const raw of candidates) {
        const t = String(raw || '').trim();
        if (!t) continue;
        const exact = uniq.find((r) => r.toLowerCase() === t.toLowerCase());
        if (exact) return exact;
        const starts = uniq.find((r) => r.toLowerCase().startsWith(t.toLowerCase()) && t.length >= 3);
        if (starts) return starts;
        // Keep non-empty extracted text even if not in catalog (shows under "From file")
        return t;
    }
    return '';
}
import {
    applyRosterSetup,
    buildRosterSetupPayload,
    buildSetupProposal,
    defaultDutyOverlaps,
    DUTY_OVERLAP_OPTIONS,
    isOfficeStyleOverlaps,
    isRegularDutyOverlaps,
    LEGEND_MEANING_OPTIONS,
    LEGEND_MEANINGS,
    ON_DUTY_MEANINGS,
} from '../../lib/roster-setup';
import { mapPreviewToAssignments, sandboxShiftTypes } from '../../lib/sandbox-roster';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function logExtractToBrowser(label, data, extra = {}) {
    const debug = data?.extractDebug || null;
    const clientMs = extra.clientMs ?? null;
    const serverMs = data?.requestMs ?? debug?.durationMs ?? null;
    const summary = {
        ...extra,
        /** Round-trip seen in the browser (upload + parse + network) */
        clientMs,
        /** Server-reported processing time */
        serverMs,
        took: clientMs != null ? `${clientMs}ms client` : undefined,
        serverTook: serverMs != null ? `${serverMs}ms server` : undefined,
        aiUsed: data?.aiUsed ?? debug?.aiUsed ?? false,
        source: data?.source,
        staff: data?.staff?.length || 0,
        days: data?.days?.length || 0,
        codes: (data?.codes || []).map((c) => {
            const unit = c.unit ? ` · ${c.unit}` : '';
            return `${c.label}→${c.meaning || '—'}${unit} (${c.confidence})`;
        }),
        needingConfirm: debug?.needingConfirm || (data?.codes || []).filter((c) => c.needsConfirm).map((c) => c.label),
        blanks: data?.blanks,
        path: debug?.path,
        openai: debug?.openai || data?.openaiDebug || null,
        extractDebug: debug,
    };
    // Browser DevTools — server logs alone don't show here
    console.groupCollapsed(`[MedRoster] ${label}${clientMs != null ? ` · ${clientMs}ms` : ''}`);
    console.log(summary);
    if (debug) console.log('extractDebug', debug);
    console.groupEnd();
}

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

function isCsvFile(file) {
    return /\.csv$/i.test(file?.name || '') || String(file?.type || '') === 'text/csv';
}

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
 * Import staff from CSV or an existing duty roster (photo, PDF, Word, Excel).
 * Same UX for hospital, individual, and guest — only save target differs.
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
    savedRosterSetup = null,
    onClose,
    onImported,
}) {
    return (
        <UnifiedImportModal
            mode={mode}
            hospitalId={hospitalId}
            departments={departments}
            wards={wards}
            defaultDepartmentId={defaultDepartmentId}
            defaultWardId={defaultWardId}
            lockWard={lockWard}
            savedRosterSetup={savedRosterSetup}
            onClose={onClose}
            onImported={onImported}
        />
    );
}

function UnifiedImportModal({
    mode = 'hospital',
    hospitalId, departments, wards, onClose, onImported,
    defaultDepartmentId: defaultDepartmentIdProp,
    defaultWardId: defaultWardIdProp,
    lockWard = false,
    savedRosterSetup = null,
}) {
    const isHospital = mode === 'hospital';
    const [step, setStep] = useState('upload');
    const [path, setPath] = useState('roster');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [rawPreview, setRawPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [showGrid, setShowGrid] = useState(false);
    const [defaultDepartmentId, setDefaultDepartmentId] = useState(defaultDepartmentIdProp || departments[0]?._id || '');
    const [defaultWardId, setDefaultWardId] = useState(defaultWardIdProp || wards[0]?._id || '');
    const [setupDraft, setSetupDraft] = useState(null);
    const [confirmedSetup, setConfirmedSetup] = useState(null);
    const [toast, setToast] = useState(null); // { kind, message }
    const [rules, setRules] = useState({
        leaveStayOff: true,
        offAndHolidayStayOff: true,
        keepGridAsIs: true,
    });

    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(null), 4200);
        return () => clearTimeout(t);
    }, [toast]);

    const activeWard = useMemo(
        () => wards.find((w) => String(w._id) === String(defaultWardId)),
        [wards, defaultWardId]
    );
    const wardPack = savedRosterSetup || activeWard?.rosterSetup || null;

    const selectedCount = useMemo(
        () => (preview?.staff || []).filter((s) => s.selected !== false).length,
        [preview]
    );

    const toLocalStaff = (rows) => rows.map((s, i) => ({
        _id: s._id || `${mode}_${Date.now()}_${i}`,
        firstName: s.firstName || '',
        lastName: s.lastName || '',
        rank: s.rankFull || s.rank || '',
        phone: s.phone || '',
        email: s.email || '',
        wardRole: s.wardRole || 'regular',
        annualLeaveDays: s.annualLeaveDays,
        notes: s.notes || s.leaveNote || '',
        cells: s.cells || [],
        assignments: s.assignments || [],
        leaveType: s.leaveType || '',
    }));

    const downloadTemplate = async () => {
        try {
            const templateUrl = isHospital
                ? `${API_URL}/api/hospitals/${hospitalId}/staff/template/download`
                : mode === 'guest'
                    ? `${API_URL}/api/guest/staff/template`
                    : `${API_URL}/api/me/staff/template`;
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

    const pickFile = (next) => {
        if (!next) return;
        setFile(next);
        setPath(isCsvFile(next) ? 'csv' : 'roster');
        setError('');
    };

    const runParse = async () => {
        if (!file) { setError('Choose a file first'); return; }
        const useCsv = isCsvFile(file) || path === 'csv';
        setPath(useCsv ? 'csv' : 'roster');
        setLoading(true);
        setError('');
        try {
            let data;
            if (useCsv) {
                const text = await file.text();
                if (isHospital) {
                    data = await apiFetch(`/api/hospitals/${hospitalId}/staff/parse-csv`, {
                        method: 'POST',
                        body: JSON.stringify({ csvText: text }),
                    });
                } else if (mode === 'guest') {
                    const res = await fetch(`${API_URL}/api/guest/staff/import`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ csvText: text }),
                    });
                    data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Could not read that CSV');
                    data = { source: 'csv', staff: data.staff || [] };
                } else {
                    data = await apiFetch('/api/me/staff/import', {
                        method: 'POST',
                        body: JSON.stringify({ csvText: text }),
                    });
                    data = { source: 'csv', staff: data.staff || [] };
                }
            } else {
                const ready = await prepareRosterFile(file);
                const dataUrl = await fileToBase64(ready);
                const fileBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
                const body = { fileBase64, fileName: ready.name || file.name };
                const extractT0 = performance.now();
                console.log('[MedRoster] extract request →', {
                    fileName: body.fileName,
                    bytes: ready.size || file.size,
                    mode,
                    startedAt: new Date().toISOString(),
                });
                if (isHospital) {
                    data = await apiFetch(`/api/hospitals/${hospitalId}/staff/extract`, {
                        method: 'POST',
                        body: JSON.stringify({ ...body, wardId: defaultWardId || undefined }),
                    });
                } else if (mode === 'guest') {
                    const res = await fetch(`${API_URL}/api/guest/staff/extract`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                    data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Could not read that roster');
                } else {
                    data = await apiFetch('/api/me/staff/extract', {
                        method: 'POST',
                        body: JSON.stringify(body),
                    });
                }
                const clientMs = Math.round(performance.now() - extractT0);
                logExtractToBrowser('extract response ←', data, {
                    fileName: body.fileName,
                    clientMs,
                });
            }
            const staff = (data.staff || []).map((s, i) => {
                const rankFull = resolveImportedRank(s.rankFull, s.rank, s.rankAbbr);
                return {
                    ...s,
                    firstName: s.firstName || '',
                    lastName: s.lastName || '',
                    rankFull,
                    rank: rankFull,
                    key: s.key || s.no || s._id || `row-${i}`,
                    selected: s.selected !== false && !(s.errors && s.errors.length),
                };
            });
            if (!staff.length) throw new Error('No staff rows found in that file');
            const nextPreview = { ...data, source: data.source || (useCsv ? 'csv' : 'roster'), staff };
            setRawPreview(nextPreview);
            setConfirmedSetup(null);

            if (!useCsv && nextPreview.source === 'roster') {
                const proposal = buildSetupProposal(nextPreview, wardPack);
                const draft = {
                    legend: (proposal.legendDraft || []).map((e) => ({
                        label: e.label,
                        meaning: e.meaning || '',
                        unit: e.unit || '',
                        dutyOverlaps: e.dutyOverlaps?.length
                            ? e.dutyOverlaps
                            : defaultDutyOverlaps(e.meaning || ''),
                        needsConfirm: Boolean(e.needsConfirm),
                        confidence: e.confidence,
                        userChecked: !e.needsConfirm && Boolean(e.meaning),
                    })),
                    inchargeStaffKey: wardPack?.inchargeStaffKey
                        || proposal.roleGuesses.find((r) => r.guessedRole === 'incharge')?.key
                        || '',
                    assistantStaffKey: wardPack?.assistantStaffKey
                        || proposal.roleGuesses.find((r) => r.guessedRole === 'assistant')?.key
                        || '',
                    leaveByKey: Object.fromEntries(
                        (proposal.roleGuesses || [])
                            .filter((r) => r.leaveLikely || r.leaveType)
                            .map((r) => [r.key, { onLeave: true, leaveType: r.leaveType || 'annual' }])
                    ),
                    roleGuesses: proposal.roleGuesses,
                    blanks: proposal.blanks,
                    needsFullSetup: proposal.needsFullSetup,
                    // First-time ward setup: roles are essential (soft) — highlight until set or skipped
                    rolesEssential: !wardPack?.confirmedAt,
                    inchargeSkipped: false,
                    assistantSkipped: false,
                    inchargeChecked: Boolean(wardPack?.inchargeStaffKey)
                        || Boolean(proposal.roleGuesses.find((r) => r.guessedRole === 'incharge')),
                    assistantChecked: Boolean(wardPack?.assistantStaffKey)
                        || Boolean(proposal.roleGuesses.find((r) => r.guessedRole === 'assistant')),
                };
                setSetupDraft(draft);
                if (wardPack?.confirmedAt && !proposal.needsFullSetup) {
                    const payload = buildRosterSetupPayload({
                        ...draft,
                        legend: draft.legend,
                    });
                    const remapped = applyRosterSetup(nextPreview, {
                        ...payload,
                        leaveByKey: draft.leaveByKey || {},
                    });
                    setConfirmedSetup(payload);
                    setPreview({
                        ...remapped,
                        staff: (remapped.staff || []).map((s, i) => ({
                            ...s,
                            key: s.key || s.no || s._id || `row-${i}`,
                            selected: s.selected !== false,
                        })),
                        source: 'roster',
                    });
                    setStep('review');
                } else {
                    setPreview(nextPreview);
                    setStep('setup');
                }
            } else {
                setSetupDraft(null);
                setPreview(nextPreview);
                setStep('review');
            }
        } catch (err) {
            console.error('[MedRoster] extract failed', err);
            setError(err.message || 'Could not read that file');
        } finally {
            setLoading(false);
        }
    };

    const pendingSetupLabels = useMemo(() => {
        if (!setupDraft) return [];
        return (setupDraft.legend || [])
            .filter((e) => e.needsConfirm && !e.userChecked)
            .map((e) => e.label);
    }, [setupDraft]);

    const pendingRoles = useMemo(() => {
        if (!setupDraft?.rolesEssential) return [];
        const missing = [];
        if (!setupDraft.inchargeStaffKey && !setupDraft.inchargeSkipped) missing.push('in-charge');
        if (!setupDraft.assistantStaffKey && !setupDraft.assistantSkipped) missing.push('assistant');
        return missing;
    }, [setupDraft]);

    const applySetupAndReview = () => {
        if (!rawPreview || !setupDraft) {
            setStep('review');
            return;
        }
        if (pendingRoles.length) {
            setToast({
                kind: 'warning',
                message: `Pick ward ${pendingRoles.join(' and ')} (highlighted). You can skip, but set them if you know who they are.`,
            });
            return;
        }
        if (pendingSetupLabels.length) {
            setToast({
                kind: 'warning',
                message: `Check these codes first: ${pendingSetupLabels.join(', ')}. Pick a meaning (or skip) for each highlighted row.`,
            });
            return;
        }
        const payload = buildRosterSetupPayload(setupDraft);
        const remapped = applyRosterSetup(rawPreview, {
            ...payload,
            leaveByKey: setupDraft.leaveByKey || {},
        });
        const staff = (remapped.staff || []).map((s, i) => ({
            ...s,
            key: s.key || s.no || s._id || `row-${i}`,
            selected: s.selected !== false,
        }));
        setConfirmedSetup(payload);
        setPreview({ ...remapped, staff, source: 'roster' });
        setToast(null);
        setStep('review');
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
        if (isHospital && (!defaultDepartmentId || !defaultWardId)) {
            setError('Pick a default department and ward');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (!isHospital) {
                const staff = toLocalStaff(selected);
                const assignments = mapPreviewToAssignments(staff, sandboxShiftTypes());
                const days = preview.days || [];
                const sortedDates = days.map((d) => d.date).filter(Boolean).sort();
                const data = {
                    imported: staff.length,
                    staff: staff.map(({ cells, assignments: _a, ...rest }) => rest),
                    assignments,
                    source: preview.source,
                    title: preview.title || '',
                    startDate: sortedDates[0] || null,
                    endDate: sortedDates[sortedDates.length - 1] || null,
                    rosterSetup: confirmedSetup || null,
                };
                setResult(data);
                setStep('done');
                onImported?.(data);
                return;
            }
            if (confirmedSetup && defaultWardId) {
                await apiFetch(`/api/hospitals/${hospitalId}/wards/${defaultWardId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ rosterSetup: confirmedSetup }),
                });
            }
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
            setResult({ ...data, rosterSetup: confirmedSetup || null });
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
        upload: 'Drop a duty roster photo, PDF, Word, or Excel. We’ll read names and shifts.',
        setup: wardPack?.confirmedAt
            ? 'Only new or unclear codes are shown — the rest comes from this ward’s saved pack.'
            : 'One-time for this ward — we save this so the next roster import is faster.',
        review: 'Tick who to keep. Nothing is saved yet.',
        rules: 'How should we read the file? Core roster rules stay on.',
        done: isHospital
            ? 'People are on this ward. Open the roster when you want to edit shifts.'
            : 'Staff list updated. You can keep editing or export when ready.',
    }[step];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            {toast && (
                <div
                    className={`fixed top-24 right-6 z-[60] max-w-md px-5 py-3 rounded-2xl shadow-lg border text-sm font-bold ${
                        toast.kind === 'error'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : toast.kind === 'warning'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                >
                    {toast.message}
                </div>
            )}
            <div className={`bg-white rounded-[28px] shadow-xl w-full p-6 max-h-[94vh] overflow-y-auto ${
                step === 'review'
                    ? 'max-w-6xl'
                    : step === 'setup' || (step === 'review' && showGrid)
                        ? 'max-w-5xl'
                        : 'max-w-lg'
            }`}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-extrabold text-ghs-deep leading-tight">
                            {step === 'done' ? 'Imported' : 'Import staff data'}
                        </h3>
                        {step !== 'done' && (
                            <p className="text-[11px] font-medium text-ghs-muted mt-0.5">Photo, PDF, Word, or Excel</p>
                        )}
                        <p className="text-xs text-ghs-muted font-medium mt-1">{stepHint}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-ghs-muted hover:text-ghs-deep text-xl leading-none">×</button>
                </div>

                {step === 'upload' && (
                    <div className="space-y-4">
                        {isHospital && !lockWard && (
                            <DeptWardPickers
                                departments={departments}
                                wards={wards}
                                defaultDepartmentId={defaultDepartmentId}
                                defaultWardId={defaultWardId}
                                setDefaultDepartmentId={setDefaultDepartmentId}
                                setDefaultWardId={setDefaultWardId}
                            />
                        )}
                        {isHospital && lockWard && (
                            <p className="text-xs font-medium text-ghs-muted">Saving to <span className="font-bold text-ghs-deep">{wardName}</span>.</p>
                        )}
                        <FileDropZone
                            accept={ROSTER_ACCEPT}
                            file={file}
                            onFile={pickFile}
                            title="Drop your roster here, or click to browse"
                            hint="Photo, PDF, Word, or Excel · max 10 MB"
                        />
                    </div>
                )}

                {step === 'setup' && setupDraft && (
                    <WardSetupStep
                        draft={setupDraft}
                        setDraft={setSetupDraft}
                        wardName={wardName}
                        hasSavedPack={Boolean(wardPack?.confirmedAt)}
                        pendingLabels={pendingSetupLabels}
                        pendingRoles={pendingRoles}
                    />
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
                            {result.imported} {result.imported === 1 ? 'staff member' : 'staff'}
                            {isHospital ? ` on ${wardName}` : ' added'}
                            {monthLabel ? ` for ${monthLabel}` : ''}.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-bold text-rose-600">{error}</div>
                )}

                <div className="flex gap-3 pt-4">
                    {step === 'upload' || step === 'done' ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (step === 'done') {
                                    if (isHospital) onImported?.({ ...result, stayOnWard: true });
                                    else onClose();
                                } else onClose();
                            }}
                            className="flex-1 h-12 rounded-2xl border border-slate-200 font-bold text-sm text-ghs-muted"
                        >
                            {step === 'done' ? (isHospital ? 'Stay on this ward' : 'Done') : 'Close'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setError('');
                                if (step === 'rules') setStep('review');
                                else if (step === 'review') {
                                    if (rawPreview && setupDraft) setStep('setup');
                                    else {
                                        setStep('upload');
                                        setPreview(null);
                                        setRawPreview(null);
                                        setSetupDraft(null);
                                    }
                                } else if (step === 'setup') {
                                    setStep('upload');
                                    setPreview(null);
                                    setRawPreview(null);
                                    setSetupDraft(null);
                                }
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
                            {loading ? 'Reading…' : 'Continue'}
                        </button>
                    )}
                    {step === 'setup' && (
                        <button
                            type="button"
                            onClick={() => {
                                setError('');
                                applySetupAndReview();
                            }}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm"
                        >
                            {pendingRoles.length
                                ? `Set ${pendingRoles.join(' / ')}`
                                : pendingSetupLabels.length
                                    ? `Check ${pendingSetupLabels.length} code${pendingSetupLabels.length === 1 ? '' : 's'}`
                                    : 'Continue to review'}
                        </button>
                    )}
                    {step === 'review' && (
                        <button
                            type="button"
                            disabled={loading || !selectedCount}
                            onClick={() => {
                                setError('');
                                if (isHospital && preview?.source === 'roster') setStep('rules');
                                else confirm();
                            }}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm disabled:opacity-50"
                        >
                            {isHospital && preview?.source === 'roster'
                                ? `Continue with ${selectedCount}`
                                : (loading ? 'Saving…' : `Confirm ${selectedCount} staff`)}
                        </button>
                    )}
                    {step === 'rules' && isHospital && (
                        <button
                            type="button"
                            disabled={loading || !selectedCount}
                            onClick={confirm}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm disabled:opacity-50"
                        >
                            {loading ? 'Saving…' : 'Save'}
                        </button>
                    )}
                    {step === 'done' && isHospital && result?.scheduleId && (
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

function LeaveLegendPanel() {
    const [open, setOpen] = useState(false);
    return (
        <div className="mb-3 rounded-2xl border border-slate-100 bg-ghs-surface overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/60"
            >
                <span>
                    <span className="block text-[10px] font-bold text-ghs-muted uppercase tracking-widest">
                        Leave guide
                    </span>
                    <span className="block text-[11px] font-medium text-ghs-muted mt-0.5">
                        {open ? 'Hide tip sheet' : 'How many days? Annual, maternity, and more'}
                    </span>
                </span>
                <span className="text-sm font-extrabold text-ghs-teal shrink-0" aria-hidden>
                    {open ? '−' : '+'}
                </span>
            </button>
            {open && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-100/80">
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                        {LEAVE_LEGEND.map((item) => (
                            <div key={item.key} className="text-[11px] leading-snug">
                                <span className="font-extrabold text-ghs-deep">{item.label}</span>
                                <span className="font-bold text-ghs-teal"> · {item.days}</span>
                                <span className="block font-medium text-ghs-muted mt-0.5">{item.note}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] font-medium text-ghs-muted mt-3 leading-snug">
                        Tip: annual leave is counted in work days — weekends stretch the calendar time off. Your ward may give more than the minimum.
                    </p>
                </div>
            )}
        </div>
    );
}

function DutyOverlapPills({ value = [], meaning = '', onChange }) {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (shift) => {
        const has = selected.includes(shift);
        // Keep at least one overlap when on duty
        if (has && selected.length === 1) return;
        const next = has
            ? selected.filter((s) => s !== shift)
            : [...selected, shift];
        // Stable Morning → Afternoon → Night order
        const order = DUTY_OVERLAP_OPTIONS.map((o) => o.value);
        onChange(order.filter((s) => next.includes(s)));
    };
    const regular = isRegularDutyOverlaps(selected);
    const officeStyle = isOfficeStyleOverlaps(meaning, selected);

    return (
        <div className="mt-1.5 space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ghs-muted">
                Overlaps
            </p>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Which shifts this duty overlaps">
                {DUTY_OVERLAP_OPTIONS.map((o) => {
                    const active = selected.includes(o.value);
                    return (
                        <button
                            key={o.value}
                            type="button"
                            title={o.hint}
                            onClick={() => toggle(o.value)}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors ${
                                active
                                    ? 'bg-ghs-teal text-white'
                                    : 'bg-slate-100 text-ghs-muted hover:bg-slate-200 hover:text-ghs-deep'
                            }`}
                        >
                            {o.label}
                        </button>
                    );
                })}
            </div>
            {officeStyle && (
                <p className="text-[10px] font-medium text-ghs-muted leading-snug">
                    Office hours (8–2) · overlaps Morning but separate · no typical take-ups
                </p>
            )}
            {!officeStyle && selected.includes('Afternoon') && !regular && (
                <p className="text-[10px] font-medium text-ghs-muted leading-snug">
                    Afternoon tagged — someone can take up after the morning session
                </p>
            )}
            {regular && (
                <p className="text-[10px] font-bold text-amber-800 leading-snug">
                    All shifts tagged — treated as a regular cover shift
                </p>
            )}
        </div>
    );
}

function MeaningPicker({ value, onChange, pending = false, detectedUnit = '' }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);
    const searchRef = useRef(null);

    const options = LEGEND_MEANING_OPTIONS;
    // Step through real meanings first; skip is last (not the default look)
    const cycle = [...LEGEND_MEANINGS, ''];
    const idx = value ? Math.max(0, cycle.indexOf(value)) : 0;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) =>
            `${o.label} ${o.hint} ${o.group} ${o.value}`.toLowerCase().includes(q)
        );
    }, [query, options]);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (ev) => {
            if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    useEffect(() => {
        if (open) {
            setQuery('');
            queueMicrotask(() => searchRef.current?.focus());
        }
    }, [open]);

    const step = (dir) => {
        // From empty/pending, first › lands on Morning (not skip)
        const from = value ? idx : -1;
        const next = cycle[(from + dir + cycle.length) % cycle.length];
        onChange(next);
    };

    const currentLabel = value
        ? (options.find((o) => o.value === value)?.label || value)
        : (pending
            ? (detectedUnit ? `Pick shift (unit: ${detectedUnit})` : 'Pick meaning…')
            : 'Skip / ignore');

    return (
        <div ref={rootRef} className="relative">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    aria-label="Previous meaning"
                    onClick={() => step(-1)}
                    className="h-9 w-8 shrink-0 rounded-lg border border-slate-100 bg-white text-ghs-muted hover:bg-slate-50 font-bold"
                >
                    ‹
                </button>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={`flex-1 min-h-9 rounded-lg border bg-white px-2 py-1.5 text-left ${
                        pending ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-100'
                    }`}
                >
                    <span className={`block text-xs font-bold truncate ${pending ? 'text-amber-900' : 'text-ghs-deep'}`}>
                        {currentLabel}
                    </span>
                    {detectedUnit && (
                        <span className="block text-[10px] font-medium text-ghs-muted truncate mt-0.5">
                            From file: {detectedUnit}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    aria-label="Next meaning"
                    onClick={() => step(1)}
                    className="h-9 w-8 shrink-0 rounded-lg border border-slate-100 bg-white text-ghs-muted hover:bg-slate-50 font-bold"
                >
                    ›
                </button>
            </div>
            {open && (
                <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {detectedUnit && (
                        <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 text-[11px] font-medium text-amber-900 leading-snug">
                            Roster marked this as <span className="font-extrabold">{detectedUnit}</span>
                            {' '}— that is a unit/location. Still pick the shift meaning if this code is also a duty.
                        </div>
                    )}
                    <div className="p-2 border-b border-slate-100">
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search meanings…"
                            className="w-full h-9 rounded-lg border border-slate-100 bg-ghs-surface px-2 text-xs font-medium"
                        />
                    </div>
                    <div className="max-h-52 overflow-y-auto py-1">
                        {['On duty', 'Not on duty'].map((group) => {
                            const rows = filtered.filter((o) => o.group === group);
                            if (!rows.length) return null;
                            return (
                                <div key={group}>
                                    <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-ghs-muted">
                                        {group}
                                    </p>
                                    {rows.map((o) => (
                                        <button
                                            key={o.value}
                                            type="button"
                                            className={`w-full text-left px-3 py-2 hover:bg-ghs-teal/5 ${
                                                value === o.value ? 'bg-ghs-teal/10' : ''
                                            }`}
                                            onClick={() => {
                                                onChange(o.value);
                                                setOpen(false);
                                            }}
                                        >
                                            <span className="block text-xs font-extrabold text-ghs-deep">{o.label}</span>
                                            <span className="block text-[10px] font-medium text-ghs-muted mt-0.5">{o.hint}</span>
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                        <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-ghs-teal/5 border-t border-slate-50 ${
                                !value ? 'font-extrabold text-ghs-deep' : 'font-medium text-ghs-muted'
                            }`}
                            onClick={() => {
                                onChange('');
                                setOpen(false);
                            }}
                        >
                            Skip / ignore
                            {detectedUnit ? (
                                <span className="block text-[10px] font-medium text-ghs-muted mt-0.5">
                                    Keep unit “{detectedUnit}” only — no shift
                                </span>
                            ) : null}
                        </button>
                        {!filtered.length && (
                            <p className="px-3 py-3 text-[11px] font-medium text-ghs-muted">No match for “{query}”.</p>
                        )}
                    </div>
                    <div className="px-3 py-1.5 border-t border-slate-100 text-[9px] font-medium text-ghs-muted">
                        {LEGEND_MEANINGS.length} meanings · use ‹ › to step
                    </div>
                </div>
            )}
        </div>
    );
}

function WardSetupStep({ draft, setDraft, wardName, hasSavedPack, pendingLabels = [], pendingRoles = [] }) {
    const leaveCandidates = (draft.roleGuesses || []).filter((r) => r.leaveLikely || draft.leaveByKey?.[r.key]);
    const legendRows = [...(draft.legend || [])].sort((a, b) => {
        const ap = a.needsConfirm && !a.userChecked ? 0 : 1;
        const bp = b.needsConfirm && !b.userChecked ? 0 : 1;
        return ap - bp;
    });
    const pendingCount = pendingLabels.length;
    const rolesEssential = Boolean(draft.rolesEssential);
    const inchargePending = rolesEssential && !draft.inchargeStaffKey && !draft.inchargeSkipped;
    const assistantPending = rolesEssential && !draft.assistantStaffKey && !draft.assistantSkipped;

    const setLegend = (label, patch) => {
        setDraft((d) => ({
            ...d,
            legend: (d.legend || []).map((e) => (e.label === label ? { ...e, ...patch } : e)),
        }));
    };

    return (
        <div className="space-y-5">
            <div className={`rounded-2xl border px-4 py-3 ${
                pendingRoles.length
                    ? 'border-rose-300 bg-rose-50'
                    : pendingCount
                        ? 'border-amber-300 bg-amber-50'
                        : 'border-ghs-teal/20 bg-ghs-teal/5'
            }`}>
                <p className="text-sm font-extrabold text-ghs-deep">
                    {hasSavedPack ? 'Confirm new codes' : 'Ward setup'}
                    {wardName ? ` · ${wardName}` : ''}
                </p>
                <p className="text-[11px] font-medium text-ghs-muted mt-1 leading-snug">
                    {pendingRoles.length
                        ? `Essential for this ward: set ${pendingRoles.join(' and ')} below. You can skip if you truly don’t know yet.`
                        : pendingCount
                            ? `${pendingCount} code${pendingCount === 1 ? '' : 's'} still need a meaning — confirm or skip each highlighted row.`
                            : hasSavedPack
                                ? 'We reused this ward’s saved legend and roles. Everything below looks checked.'
                                : 'One-time for this ward — we save this so the next roster import is faster.'}
                </p>
            </div>

            {rolesEssential && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold text-rose-700 uppercase tracking-widest ml-1">
                            Essential roles
                        </p>
                        {(inchargePending || assistantPending) && (
                            <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-rose-800">
                                Needs check
                            </span>
                        )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className={`rounded-2xl p-3 ${
                            inchargePending
                                ? 'bg-rose-50 ring-2 ring-rose-300 border border-rose-200'
                                : 'bg-emerald-50/60 border border-emerald-100'
                        }`}>
                            <label className="text-[10px] font-bold uppercase tracking-widest ml-0.5 text-rose-800">
                                Ward in-charge
                            </label>
                            <select
                                className={`w-full h-11 mt-1 rounded-xl border bg-white px-3 text-sm ${
                                    inchargePending ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-100'
                                }`}
                                value={draft.inchargeStaffKey || ''}
                                onChange={(e) => setDraft((d) => ({
                                    ...d,
                                    inchargeStaffKey: e.target.value,
                                    inchargeSkipped: false,
                                    inchargeChecked: true,
                                }))}
                            >
                                <option value="">— pick in-charge —</option>
                                {(draft.roleGuesses || []).map((r) => (
                                    <option key={r.key} value={r.key}>
                                        {r.name}{r.rank ? ` · ${r.rank}` : ''}
                                    </option>
                                ))}
                            </select>
                            {inchargePending && (
                                <button
                                    type="button"
                                    className="mt-2 text-[10px] font-bold text-ghs-muted hover:text-ghs-teal"
                                    onClick={() => setDraft((d) => ({
                                        ...d,
                                        inchargeStaffKey: '',
                                        inchargeSkipped: true,
                                        inchargeChecked: true,
                                    }))}
                                >
                                    Skip for now
                                </button>
                            )}
                            {!inchargePending && (
                                <p className="mt-1.5 text-[10px] font-bold text-emerald-700">
                                    {draft.inchargeSkipped ? 'Skipped' : 'Looks good'}
                                </p>
                            )}
                        </div>
                        <div className={`rounded-2xl p-3 ${
                            assistantPending
                                ? 'bg-rose-50 ring-2 ring-rose-300 border border-rose-200'
                                : 'bg-emerald-50/60 border border-emerald-100'
                        }`}>
                            <label className="text-[10px] font-bold uppercase tracking-widest ml-0.5 text-rose-800">
                                Assistant
                            </label>
                            <select
                                className={`w-full h-11 mt-1 rounded-xl border bg-white px-3 text-sm ${
                                    assistantPending ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-100'
                                }`}
                                value={draft.assistantStaffKey || ''}
                                onChange={(e) => setDraft((d) => ({
                                    ...d,
                                    assistantStaffKey: e.target.value,
                                    assistantSkipped: false,
                                    assistantChecked: true,
                                }))}
                            >
                                <option value="">— pick assistant —</option>
                                {(draft.roleGuesses || []).map((r) => (
                                    <option key={r.key} value={r.key}>
                                        {r.name}{r.rank ? ` · ${r.rank}` : ''}
                                    </option>
                                ))}
                            </select>
                            {assistantPending && (
                                <button
                                    type="button"
                                    className="mt-2 text-[10px] font-bold text-ghs-muted hover:text-ghs-teal"
                                    onClick={() => setDraft((d) => ({
                                        ...d,
                                        assistantStaffKey: '',
                                        assistantSkipped: true,
                                        assistantChecked: true,
                                    }))}
                                >
                                    Skip for now
                                </button>
                            )}
                            {!assistantPending && (
                                <p className="mt-1.5 text-[10px] font-bold text-emerald-700">
                                    {draft.assistantSkipped ? 'Skipped' : 'Looks good'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {legendRows.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1 mb-2">Legend</p>
                    <p className="text-[11px] font-medium text-ghs-muted mb-2 ml-1 leading-snug">
                        Office defaults to <span className="font-bold">Morning</span> only (daily 8–2, overlaps Morning but separate, no take-ups).
                        {' '}Add <span className="font-bold">Afternoon</span> / <span className="font-bold">Night</span> if someone takes up after.
                        {' '}Tag all three and it becomes a regular cover shift. Polyclinic <span className="font-bold">P</span> → Office.
                    </p>
                    <div className="overflow-auto max-h-[32vh] border border-slate-100 rounded-2xl">
                        <table className="min-w-full text-xs">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr className="text-left text-[10px] uppercase tracking-wider text-ghs-muted">
                                    <th className="p-2">Status</th>
                                    <th className="p-2">Code</th>
                                    <th className="p-2">Meaning · overlaps</th>
                                    <th className="p-2">Unit (optional)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {legendRows.map((e) => {
                                    const pending = e.needsConfirm && !e.userChecked;
                                    const ok = e.userChecked || (!e.needsConfirm && e.meaning);
                                    const onDuty = ON_DUTY_MEANINGS.includes(e.meaning);
                                    const dutyOverlaps = e.dutyOverlaps?.length
                                        ? e.dutyOverlaps
                                        : defaultDutyOverlaps(e.meaning || '');
                                    return (
                                        <tr
                                            key={e.label}
                                            className={
                                                pending
                                                    ? 'bg-amber-50 ring-1 ring-inset ring-amber-200'
                                                    : ok
                                                        ? 'bg-emerald-50/50'
                                                        : ''
                                            }
                                        >
                                            <td className="p-2 whitespace-nowrap">
                                                {pending ? (
                                                    <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                                                        Needs check
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                                                        Looks good
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 font-extrabold text-ghs-deep">{e.label}</td>
                                            <td className="p-2 min-w-[240px]">
                                                <MeaningPicker
                                                    value={e.meaning || ''}
                                                    pending={pending}
                                                    detectedUnit={e.unit || ''}
                                                    onChange={(meaning) => setLegend(e.label, {
                                                        meaning,
                                                        dutyOverlaps: ON_DUTY_MEANINGS.includes(meaning)
                                                            ? defaultDutyOverlaps(meaning)
                                                            : [],
                                                        needsConfirm: false,
                                                        userChecked: true,
                                                    })}
                                                />
                                                {onDuty && (
                                                    <DutyOverlapPills
                                                        value={dutyOverlaps}
                                                        meaning={e.meaning || ''}
                                                        onChange={(overlaps) => setLegend(e.label, {
                                                            dutyOverlaps: overlaps,
                                                            userChecked: true,
                                                            needsConfirm: false,
                                                        })}
                                                    />
                                                )}
                                                {pending && (
                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                        {e.meaning ? (
                                                            <button
                                                                type="button"
                                                                className="text-[10px] font-bold text-ghs-teal hover:underline"
                                                                onClick={() => setLegend(e.label, {
                                                                    needsConfirm: false,
                                                                    userChecked: true,
                                                                })}
                                                            >
                                                                Confirm “{e.meaning}”
                                                            </button>
                                                        ) : null}
                                                        <button
                                                            type="button"
                                                            className="text-[10px] font-bold text-ghs-muted hover:text-ghs-teal"
                                                            onClick={() => setLegend(e.label, {
                                                                meaning: '',
                                                                dutyOverlaps: [],
                                                                needsConfirm: false,
                                                                userChecked: true,
                                                            })}
                                                        >
                                                            Skip this code
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <input
                                                    className="w-full h-9 rounded-lg border border-slate-100 bg-white px-2"
                                                    value={e.unit || ''}
                                                    placeholder="e.g. General X-ray"
                                                    onChange={(ev) => setLegend(e.label, { unit: ev.target.value })}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {hasSavedPack && (
                        <p className="text-[11px] font-medium text-ghs-muted mt-2">
                            Known codes from the ward pack stay marked Looks good unless they need a new meaning.
                        </p>
                    )}
                </div>
            )}

            {!legendRows.length && (
                <p className="text-xs font-medium text-ghs-muted">All codes already mapped for this ward.</p>
            )}

            {!rolesEssential && (
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Ward in-charge</label>
                        <select
                            className="w-full h-11 mt-1 rounded-xl border border-slate-100 bg-ghs-surface px-3 text-sm"
                            value={draft.inchargeStaffKey || ''}
                            onChange={(e) => setDraft((d) => ({
                                ...d,
                                inchargeStaffKey: e.target.value,
                                inchargeChecked: true,
                            }))}
                        >
                            <option value="">— optional —</option>
                            {(draft.roleGuesses || []).map((r) => (
                                <option key={r.key} value={r.key}>
                                    {r.name}{r.rank ? ` · ${r.rank}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Assistant</label>
                        <select
                            className="w-full h-11 mt-1 rounded-xl border border-slate-100 bg-ghs-surface px-3 text-sm"
                            value={draft.assistantStaffKey || ''}
                            onChange={(e) => setDraft((d) => ({ ...d, assistantStaffKey: e.target.value }))}
                        >
                            <option value="">— optional —</option>
                            {(draft.roleGuesses || []).map((r) => (
                                <option key={r.key} value={r.key}>
                                    {r.name}{r.rank ? ` · ${r.rank}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {leaveCandidates.length > 0 && (
                <div>
                    <p className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1 mb-2">Leave rows</p>
                    <LeaveLegendPanel />
                    <div className="space-y-2">
                        {leaveCandidates.map((r) => {
                            const leave = draft.leaveByKey?.[r.key];
                            return (
                                <label key={r.key} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-ghs-surface">
                                    <input
                                        type="checkbox"
                                        className="accent-ghs-teal"
                                        checked={Boolean(leave?.onLeave)}
                                        onChange={(e) => {
                                            setDraft((d) => {
                                                const next = { ...(d.leaveByKey || {}) };
                                                if (e.target.checked) {
                                                    next[r.key] = { onLeave: true, leaveType: next[r.key]?.leaveType || r.leaveType || 'annual' };
                                                } else {
                                                    delete next[r.key];
                                                }
                                                return { ...d, leaveByKey: next };
                                            });
                                        }}
                                    />
                                    <span className="flex-1 text-sm font-bold text-ghs-deep">{r.name}</span>
                                    {leave?.onLeave && (
                                        <select
                                            className="h-9 rounded-lg border border-slate-100 bg-white px-2 text-xs"
                                            value={leave.leaveType || 'annual'}
                                            onChange={(e) => {
                                                setDraft((d) => ({
                                                    ...d,
                                                    leaveByKey: {
                                                        ...(d.leaveByKey || {}),
                                                        [r.key]: { onLeave: true, leaveType: e.target.value },
                                                    },
                                                }));
                                            }}
                                        >
                                            {LEAVE_LEGEND.map((item) => (
                                                <option key={item.key} value={item.key}>
                                                    {item.label} · {item.days}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
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

function ReviewRankSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);
    const searchRef = useRef(null);
    const current = value || '';

    const grouped = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rows = [];
        for (const cat of STAFF_CATEGORIES) {
            const ranks = (RANKS_BY_CATEGORY[cat] || []).filter((r) =>
                !q || r.toLowerCase().includes(q) || cat.toLowerCase().includes(q)
            );
            if (ranks.length) rows.push({ cat, ranks });
        }
        if (current && !Object.values(RANKS_BY_CATEGORY).some((list) => list.includes(current))) {
            if (!q || current.toLowerCase().includes(q)) {
                rows.unshift({ cat: 'From file', ranks: [current] });
            }
        }
        return rows;
    }, [query, current]);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (ev) => {
            if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    useEffect(() => {
        if (open) {
            setQuery('');
            queueMicrotask(() => searchRef.current?.focus());
        }
    }, [open]);

    return (
        <div ref={rootRef} className="relative min-w-[11rem]">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`w-full h-10 rounded-xl border bg-white px-2.5 text-left text-xs font-bold truncate ${
                    current ? 'border-slate-100 text-ghs-deep' : 'border-amber-200 text-amber-800'
                }`}
            >
                {current || '— pick rank —'}
            </button>
            {open && (
                <div className="absolute z-30 left-0 right-0 mt-1 min-w-[16rem] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search rank…"
                            className="w-full h-9 rounded-lg border border-slate-100 bg-ghs-surface px-2 text-xs font-medium"
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-ghs-teal/5 ${
                                !current ? 'bg-ghs-teal/10 font-extrabold text-ghs-deep' : 'font-medium text-ghs-muted'
                            }`}
                            onClick={() => {
                                onChange('');
                                setOpen(false);
                            }}
                        >
                            Clear rank
                        </button>
                        {grouped.map(({ cat, ranks }) => (
                            <div key={cat}>
                                <p className="px-3 pt-2.5 pb-1 text-[11px] font-extrabold text-ghs-deep">
                                    {cat}
                                </p>
                                {ranks.map((r) => (
                                    <button
                                        key={`${cat}-${r}`}
                                        type="button"
                                        className={`w-full text-left px-3 py-1.5 pl-4 text-xs font-medium hover:bg-ghs-teal/5 ${
                                            current === r ? 'bg-ghs-teal/10 font-bold text-ghs-teal' : 'text-ghs-muted'
                                        }`}
                                        onClick={() => {
                                            onChange(r);
                                            setOpen(false);
                                        }}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        ))}
                        {!grouped.length && (
                            <p className="px-3 py-3 text-[11px] font-medium text-ghs-muted">
                                No rank matches “{query}”.
                            </p>
                        )}
                    </div>
                </div>
            )}
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
            <div className="overflow-auto max-h-[min(72vh,720px)] border border-slate-100 rounded-2xl">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr className="text-left text-[10px] uppercase tracking-wider text-ghs-muted">
                            <th className="p-2 w-10">In</th>
                            <th className="p-2 min-w-[9rem]">Name</th>
                            <th className="p-2 min-w-[12rem]">Rank</th>
                            {preview.source === 'csv' && <th className="p-2">Phone</th>}
                            {preview.source === 'roster' && showGrid && days.slice(0, 16).map((d) => (
                                <th key={d.date} className="p-1 font-bold text-center">{d.dayNum || d.dow}</th>
                            ))}
                            <th className="p-2 min-w-[16rem] w-[28%]">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(preview.staff || []).map((s) => {
                            const noteValue = s.leaveNote || s.notes || (s.errors || []).join('; ') || '';
                            return (
                                <tr key={s.key} className={s.selected === false ? 'opacity-40' : 'align-top'}>
                                    <td className="p-2 pt-3">
                                        <input
                                            type="checkbox"
                                            checked={s.selected !== false}
                                            onChange={(e) => updateRow(s.key, { selected: e.target.checked })}
                                        />
                                    </td>
                                    <td className="p-2 min-w-[9rem]">
                                        <input
                                            className="w-full h-10 rounded-xl border border-slate-100 bg-white px-2 font-bold text-ghs-deep"
                                            value={`${s.firstName || ''} ${s.lastName || ''}`.trim()}
                                            onChange={(e) => {
                                                const parts = e.target.value.trim().split(/\s+/);
                                                updateRow(s.key, { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') });
                                            }}
                                        />
                                    </td>
                                    <td className="p-2 min-w-[12rem]">
                                        <ReviewRankSelect
                                            value={s.rankFull || s.rank || ''}
                                            onChange={(rank) => updateRow(s.key, { rankFull: rank, rank })}
                                        />
                                        {s.rankAbbr && !s.rankFull && (
                                            <div className="text-[10px] text-ghs-muted mt-1 px-1">{s.rankAbbr}</div>
                                        )}
                                    </td>
                                    {preview.source === 'csv' && (
                                        <td className="p-2 pt-3">{s.phone || '—'}</td>
                                    )}
                                    {preview.source === 'roster' && showGrid && days.slice(0, 16).map((d) => {
                                        const cell = (s.cells || []).find((c) => c.date === d.date);
                                        return (
                                            <td key={d.date} className="p-1 text-center font-bold pt-3" title={cell?.unit || cell?.text || ''}>
                                                <div>{cell?.code || cell?.text || ''}</div>
                                            </td>
                                        );
                                    })}
                                    <td className="p-2 min-w-[16rem]">
                                        <textarea
                                            rows={2}
                                            className="w-full min-h-[2.75rem] rounded-xl border border-slate-100 bg-white px-2.5 py-2 text-xs font-medium text-ghs-deep resize-y leading-snug"
                                            placeholder="Leave type, unit tip, or anything to remember…"
                                            value={noteValue}
                                            onChange={(e) => updateRow(s.key, {
                                                leaveNote: e.target.value,
                                                notes: e.target.value,
                                            })}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

