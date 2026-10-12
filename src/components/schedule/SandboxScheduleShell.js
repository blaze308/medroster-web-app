'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CalendarGrid from './CalendarGrid';
import ShiftPicker from './ShiftPicker';
import ConfirmModal from '../modals/ConfirmModal';
import ImportStaffModal from '../modals/ImportStaffModal';
import {
    sandboxShiftTypes,
    generateSandboxAssignments,
    countGeneratableSlots,
} from '../../lib/sandbox-roster';
import { preferredSourceCode } from '../../lib/roster-setup';

const CLEAR_OPTIONS = [
    {
        id: 'setup',
        label: 'Saved setup',
        hint: 'Shift codes, meanings, overlaps, and in-charge / assistant picks',
        defaultChecked: true,
        locked: true,
    },
    {
        id: 'shifts',
        label: 'Shifts on the calendar',
        hint: 'All assignments for this roster period',
        defaultChecked: false,
    },
    {
        id: 'staff',
        label: 'Staff list',
        hint: 'Remove everyone — also clears their shifts',
        defaultChecked: false,
    },
];

function formatRange(start, end) {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/**
 * Shared guest / individual roster shell: staff, calendar, generate, import, export.
 * Persistence is owned by the parent via `schedule` + `onChange`.
 * `onExport(format)` — format is 'pdf' | 'excel' | 'csv'. Legacy `onExportPdf` still works.
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
    onExport,
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
    const [exportOpen, setExportOpen] = useState(false);
    /** 'clearShifts' | 'resetSetup' | null */
    const [confirmKind, setConfirmKind] = useState(null);

    const runExport = (format) => {
        setExportOpen(false);
        if (onExport) onExport(format);
        else if (format === 'pdf' && onExportPdf) onExportPdf();
    };

    const staff = schedule?.staff || [];
    const assignments = schedule?.assignments || [];
    const holidays = schedule?.holidays || [];
    const hasSetup = Boolean(schedule?.rosterSetup);
    const canReset = hasSetup || assignments.length > 0 || staff.length > 0;

    const patch = (partial) => onChange?.({ ...schedule, ...partial });

    const applyClearSelection = (selected) => {
        const clearSetup = Boolean(selected?.setup ?? selected === true);
        const clearStaff = Boolean(selected?.staff);
        const clearShifts = Boolean(selected?.shifts) || clearStaff;
        const next = { ...schedule };
        if (clearSetup) next.rosterSetup = null;
        if (clearShifts) next.assignments = [];
        if (clearStaff) next.staff = [];
        onChange?.(next);
        const parts = [];
        if (clearSetup) parts.push('setup');
        if (clearShifts) parts.push('shifts');
        if (clearStaff) parts.push('staff');
        setToast(
            parts.length === 3
                ? 'Clean slate — setup, shifts, and staff cleared.'
                : `Cleared ${parts.join(', ')}.`
        );
    };

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
        const sourceCode = preferredSourceCode(st.name, schedule?.rosterSetup?.legend) || undefined;
        patch({
            assignments: [
                ...without,
                {
                    _id: `a_${person._id}_${dk}`,
                    staffId: person._id,
                    date: `${dk}T00:00:00.000Z`,
                    sourceCode,
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
        if (!assignments.length) return;
        setConfirmKind('clearShifts');
    };

    const handleResetSetup = () => {
        if (!canReset) return;
        setConfirmKind('resetSetup');
    };

    const generatableCount = useMemo(() => countGeneratableSlots({
        staff,
        startDate: schedule?.startDate,
        endDate: schedule?.endDate,
        shiftTypes,
        existing: assignments,
        holidays,
        rosterSetup: schedule?.rosterSetup || null,
    }), [staff, schedule?.startDate, schedule?.endDate, schedule?.rosterSetup, assignments, holidays, shiftTypes]);

    const handleGenerate = () => {
        if (!staff.length) {
            setToast('Add or import staff first.');
            return;
        }
        if (generatableCount <= 0) {
            setToast('No empty cover slots left to fill.');
            return;
        }
        setGenerating(true);
        try {
            const before = assignments.length;
            const next = generateSandboxAssignments({
                staff,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
                shiftTypes,
                existing: assignments,
                holidays,
                rosterSetup: schedule?.rosterSetup || null,
                replace: false,
            });
            const added = Math.max(0, next.length - before);
            patch({ assignments: next });
            setToast(added
                ? `Filled ${added} cover shift${added === 1 ? '' : 's'} (Morning / Afternoon / Night).`
                : 'No new cover shifts to fill.');
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
                            disabled={generating || !staff.length || generatableCount <= 0}
                            onClick={handleGenerate}
                            title={generatableCount
                                ? `${generatableCount} empty cover slot${generatableCount === 1 ? '' : 's'} can be filled`
                                : 'No empty Morning / Afternoon / Night slots to fill'}
                            className="h-11 px-4 rounded-xl border border-ghs-teal text-ghs-teal text-sm font-bold disabled:opacity-50 bg-white"
                        >
                            {generating ? 'Generating…' : `Auto-generate (${generatableCount})`}
                        </button>
                        <button
                            type="button"
                            disabled={!assignments.length}
                            onClick={handleClearAll}
                            className="h-11 px-4 rounded-xl border text-sm font-bold text-ghs-muted bg-white disabled:opacity-50"
                        >
                            Clear shifts
                        </button>
                        {(mode === 'guest' || mode === 'individual') && canReset ? (
                            <button
                                type="button"
                                onClick={handleResetSetup}
                                className="h-11 px-4 rounded-xl border border-amber-200 text-amber-900 text-sm font-bold bg-amber-50"
                                title="Clear saved setup, and optionally shifts or staff"
                            >
                                Reset / clear
                            </button>
                        ) : null}
                        <div className="relative">
                            <button
                                type="button"
                                disabled={exporting}
                                onClick={() => setExportOpen((v) => !v)}
                                className="h-11 px-4 rounded-xl bg-ghs-teal text-white text-sm font-bold disabled:opacity-50"
                            >
                                {exporting ? 'Exporting…' : 'Export ▾'}
                            </button>
                            {exportOpen && !exporting ? (
                                <>
                                    <button
                                        type="button"
                                        className="fixed inset-0 z-40 cursor-default"
                                        aria-label="Close export menu"
                                        onClick={() => setExportOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-1 z-50 min-w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                        <button
                                            type="button"
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-ghs-deep hover:bg-slate-50"
                                            onClick={() => runExport('pdf')}
                                        >
                                            PDF
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-ghs-deep hover:bg-slate-50"
                                            onClick={() => runExport('excel')}
                                        >
                                            Excel (.xlsx)
                                        </button>
                                        <button
                                            type="button"
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-ghs-deep hover:bg-slate-50"
                                            onClick={() => runExport('csv')}
                                        >
                                            CSV
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </div>
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
                            rosterSetup={schedule?.rosterSetup || null}
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
                    rosterSetup={schedule?.rosterSetup || null}
                />
            )}

            {confirmKind === 'clearShifts' && (
                <ConfirmModal
                    title="Clear all shifts?"
                    message="Every assignment on this roster calendar will be removed. Staff and saved setup stay."
                    confirmLabel="Clear shifts"
                    danger
                    onClose={() => setConfirmKind(null)}
                    onConfirm={() => {
                        patch({ assignments: [] });
                        setConfirmKind(null);
                        setToast('All shifts cleared.');
                    }}
                />
            )}

            {confirmKind === 'resetSetup' && (
                <ConfirmModal
                    title="Reset / clear roster"
                    message="Pick what to wipe. Saved setup always clears so the next import asks for codes again. Use Clean slate for a full restart."
                    confirmLabel="Clear selected"
                    danger
                    options={CLEAR_OPTIONS}
                    onClose={() => setConfirmKind(null)}
                    onConfirm={(selected) => {
                        applyClearSelection(selected);
                        setConfirmKind(null);
                    }}
                />
            )}

            {showImport && (
                <ImportStaffModal
                    mode={mode}
                    savedRosterSetup={schedule?.rosterSetup || null}
                    onClearRosterSetup={(selected) => {
                        if (selected && typeof selected === 'object') {
                            applyClearSelection({ setup: true, ...selected });
                        } else {
                            applyClearSelection({ setup: true });
                        }
                    }}
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
