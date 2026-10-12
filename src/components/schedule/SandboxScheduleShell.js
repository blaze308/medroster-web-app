'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CalendarGrid from './CalendarGrid';
import ShiftPicker from './ShiftPicker';
import ImportStaffModal from '../modals/ImportStaffModal';
import {
    sandboxShiftTypes,
    generateSandboxAssignments,
} from '../../lib/sandbox-roster';

function formatRange(start, end) {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/**
 * Shared guest / individual roster shell: staff, calendar, generate, import, PDF.
 * Persistence is owned by the parent via `schedule` + `onChange`.
 */
export default function SandboxScheduleShell({
    mode = 'guest',
    schedule,
    onChange,
    maxStaff = 50,
    title = 'Roster',
    subtitle = '',
    backHref = '/',
    backLabel = '← Home',
    banner = null,
    onExportPdf,
    exporting = false,
    extraActions = null,
}) {
    const shiftTypes = useMemo(() => sandboxShiftTypes(), []);
    const [picker, setPicker] = useState(null);
    const [showImport, setShowImport] = useState(false);
    const [newFirst, setNewFirst] = useState('');
    const [newLast, setNewLast] = useState('');
    const [newRank, setNewRank] = useState('Staff Nurse');
    const [generating, setGenerating] = useState(false);
    const [toast, setToast] = useState('');

    const staff = schedule?.staff || [];
    const assignments = schedule?.assignments || [];
    const holidays = schedule?.holidays || [];

    const patch = (partial) => onChange?.({ ...schedule, ...partial });

    const addStaff = () => {
        if (!newFirst.trim() || !newLast.trim()) return;
        if (staff.length >= maxStaff) {
            setToast(`Limited to ${maxStaff} staff. Register or upgrade for more.`);
            return;
        }
        patch({
            staff: [
                ...staff,
                {
                    _id: `${mode}_${Date.now()}`,
                    firstName: newFirst.trim(),
                    lastName: newLast.trim(),
                    rank: newRank,
                    wardRole: 'regular',
                },
            ],
        });
        setNewFirst('');
        setNewLast('');
        setToast('');
    };

    const removeStaff = (id) => {
        patch({
            staff: staff.filter((s) => String(s._id) !== String(id)),
            assignments: assignments.filter((a) => String(a.staffId) !== String(id)),
        });
    };

    const handleCellClick = (person, date) => {
        const dk = date.toISOString().split('T')[0];
        const existing = assignments.find(
            (a) => String(a.staffId) === String(person._id) && new Date(a.date).toISOString().split('T')[0] === dk
        );
        const current = existing?.shiftType;
        const matched = current
            ? shiftTypes.find((st) => st.name === current.name)
            : null;
        setPicker({
            staff: person,
            date,
            currentShiftTypeId: matched?._id || null,
            currentShiftType: current || null,
        });
    };

    const handleAssign = (shiftTypeId) => {
        if (!picker) return;
        const { staff: person, date } = picker;
        const dk = date.toISOString().split('T')[0];
        const without = assignments.filter(
            (a) => !(String(a.staffId) === String(person._id) && new Date(a.date).toISOString().split('T')[0] === dk)
        );
        if (!shiftTypeId) {
            patch({ assignments: without });
            setPicker(null);
            return;
        }
        const st = shiftTypes.find((x) => String(x._id) === String(shiftTypeId));
        if (!st) return;
        patch({
            assignments: [
                ...without,
                {
                    _id: `a_${person._id}_${dk}`,
                    staffId: person._id,
                    date: `${dk}T00:00:00.000Z`,
                    shiftType: {
                        name: st.name,
                        color: st.color,
                        startTime: st.startTime,
                        endTime: st.endTime,
                    },
                },
            ],
        });
        setPicker(null);
    };

    const handleClearAll = () => {
        if (!confirm('Clear every assignment in this roster?')) return;
        patch({ assignments: [] });
    };

    const handleGenerate = () => {
        if (!staff.length) {
            setToast('Add or import staff first.');
            return;
        }
        setGenerating(true);
        try {
            const next = generateSandboxAssignments({
                staff,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
                shiftTypes,
                existing: assignments,
                replace: true,
            });
            patch({ assignments: next });
            setToast(`Generated ${next.length} shift${next.length === 1 ? '' : 's'}.`);
        } finally {
            setGenerating(false);
        }
    };

    const daysInRange = useMemo(() => {
        if (!schedule?.startDate || !schedule?.endDate) return 0;
        return Math.round((new Date(schedule.endDate) - new Date(schedule.startDate)) / 86400000) + 1;
    }, [schedule?.startDate, schedule?.endDate]);

    return (
        <div className="min-h-screen bg-ghs-surface">
            {banner}

            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                    <div>
                        <Link href={backHref} className="text-xs font-bold text-ghs-muted hover:text-ghs-teal">
                            {backLabel}
                        </Link>
                        <h1 className="text-2xl font-extrabold text-ghs-deep mt-2">{title}</h1>
                        {subtitle ? <p className="text-sm text-ghs-muted mt-1">{subtitle}</p> : null}
                        <p className="text-xs text-ghs-muted mt-1">
                            {formatRange(schedule?.startDate, schedule?.endDate)}
                            {daysInRange ? ` · ${daysInRange} days` : ''}
                            {` · ${staff.length}/${maxStaff} staff`}
                            {assignments.length ? ` · ${assignments.length} shifts` : ''}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowImport(true)}
                            className="min-h-11 px-4 py-1.5 rounded-xl border text-sm font-bold leading-tight text-left bg-white"
                        >
                            <span className="block">Import staff data</span>
                            <span className="block text-[10px] font-medium text-ghs-muted normal-case tracking-normal">Photo, PDF, Word, or Excel</span>
                        </button>
                        <button
                            type="button"
                            disabled={generating || !staff.length}
                            onClick={handleGenerate}
                            className="h-11 px-4 rounded-xl border border-ghs-teal text-ghs-teal text-sm font-bold disabled:opacity-50 bg-white"
                        >
                            {generating ? 'Generating…' : 'Auto-generate'}
                        </button>
                        <button
                            type="button"
                            disabled={!assignments.length}
                            onClick={handleClearAll}
                            className="h-11 px-4 rounded-xl border text-sm font-bold text-ghs-muted bg-white disabled:opacity-50"
                        >
                            Clear shifts
                        </button>
                        <button
                            type="button"
                            disabled={exporting}
                            onClick={onExportPdf}
                            className="h-11 px-4 rounded-xl bg-ghs-teal text-white text-sm font-bold disabled:opacity-50"
                        >
                            {exporting ? 'Exporting…' : 'Export PDF'}
                        </button>
                        {extraActions}
                    </div>
                </div>

                {toast && (
                    <div className="mb-4 rounded-xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-ghs-deep">
                        {toast}
                    </div>
                )}

                <div className="bg-white rounded-3xl border border-slate-100 p-5 mb-6 space-y-4">
                    <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-ghs-muted uppercase">Ward / title</label>
                            <input
                                className="w-full h-11 mt-1 rounded-xl border px-3 text-sm"
                                value={schedule?.wardName || schedule?.name || ''}
                                onChange={(e) => patch({ wardName: e.target.value, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ghs-muted uppercase">Start</label>
                            <input
                                type="date"
                                className="w-full h-11 mt-1 rounded-xl border px-3 text-sm"
                                value={schedule?.startDate || ''}
                                onChange={(e) => patch({ startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-ghs-muted uppercase">End</label>
                            <input
                                type="date"
                                className="w-full h-11 mt-1 rounded-xl border px-3 text-sm"
                                value={schedule?.endDate || ''}
                                onChange={(e) => {
                                    const next = e.target.value;
                                    const days = Math.round((new Date(next) - new Date(schedule.startDate)) / 86400000) + 1;
                                    if (mode === 'guest' && days > 31) {
                                        setToast('Guest schedules are limited to 31 days. Register to keep longer cycles in the cloud.');
                                        return;
                                    }
                                    patch({ endDate: next });
                                }}
                            />
                        </div>
                    </div>
                </div>

                {schedule?.startDate && schedule?.endDate && (
                    <div className="mb-6">
                        <CalendarGrid
                            startDate={schedule.startDate}
                            endDate={schedule.endDate}
                            holidays={holidays}
                            staff={staff}
                            assignments={assignments}
                            onCellClick={handleCellClick}
                        />
                    </div>
                )}

                <div className="bg-white rounded-3xl border border-slate-100 p-5 mb-6">
                    <h2 className="font-extrabold text-ghs-deep mb-3">Staff</h2>
                    <div className="flex flex-wrap gap-2 mb-4">
                        <input className="h-11 rounded-xl border px-3 text-sm" placeholder="First name" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} />
                        <input className="h-11 rounded-xl border px-3 text-sm" placeholder="Last name" value={newLast} onChange={(e) => setNewLast(e.target.value)} />
                        <input className="h-11 rounded-xl border px-3 text-sm" placeholder="Rank" value={newRank} onChange={(e) => setNewRank(e.target.value)} />
                        <button type="button" onClick={addStaff} className="h-11 px-4 rounded-xl bg-ghs-teal text-white text-sm font-bold">Add</button>
                    </div>
                    <ul className="divide-y max-h-48 overflow-y-auto">
                        {staff.map((s) => (
                            <li key={s._id} className="py-2.5 flex items-center justify-between text-sm">
                                <span className="font-semibold text-ghs-deep">
                                    {s.firstName} {s.lastName}{' '}
                                    <span className="text-ghs-muted font-medium">· {s.rank}</span>
                                    {s.wardRole && s.wardRole !== 'regular' ? (
                                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-ghs-teal">{s.wardRole}</span>
                                    ) : null}
                                </span>
                                <button type="button" onClick={() => removeStaff(s._id)} className="text-xs font-bold text-rose-500">Remove</button>
                            </li>
                        ))}
                        {staff.length === 0 && (
                            <li className="py-8 text-center text-sm text-ghs-muted">
                                No staff yet — add manually or import a duty roster photo or document.
                            </li>
                        )}
                    </ul>
                </div>
            </div>

            {picker && (
                <ShiftPicker
                    staff={picker.staff}
                    date={picker.date}
                    shiftTypes={shiftTypes}
                    currentShiftTypeId={picker.currentShiftTypeId}
                    onAssign={handleAssign}
                    onClose={() => setPicker(null)}
                />
            )}

            {showImport && (
                <ImportStaffModal
                    mode={mode}
                    savedRosterSetup={schedule?.rosterSetup || null}
                    onClose={() => setShowImport(false)}
                    onImported={(data) => {
                        const incoming = data.staff || [];
                        const mergedStaff = [...staff, ...incoming].slice(0, maxStaff);
                        const byKey = new Map(incoming.map((s) => [s._id, s]));
                        // Prefer assignments from import when present (roster grid)
                        const importedAssign = Array.isArray(data.assignments) ? data.assignments : [];
                        const nextAssign = importedAssign.length
                            ? [
                                ...assignments.filter((a) => !byKey.has(String(a.staffId))),
                                ...importedAssign,
                            ]
                            : assignments;
                        const datePatch = {};
                        if (data.startDate && data.endDate) {
                            datePatch.startDate = data.startDate;
                            datePatch.endDate = data.endDate;
                        }
                        if (data.title) {
                            datePatch.wardName = data.title;
                            datePatch.name = data.title;
                        }
                        if (data.rosterSetup) {
                            datePatch.rosterSetup = data.rosterSetup;
                        }
                        patch({
                            staff: mergedStaff,
                            assignments: nextAssign,
                            ...datePatch,
                        });
                        setShowImport(false);
                        setToast(
                            importedAssign.length
                                ? `Imported ${incoming.length} staff and ${importedAssign.length} shifts.`
                                : `Imported ${incoming.length} staff.`
                        );
                    }}
                />
            )}
        </div>
    );
}
