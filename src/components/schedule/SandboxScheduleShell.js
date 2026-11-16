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
import { getDefaultRuleModes, normalizeRuleModes } from '../../lib/rule-modes';
import { clearGuestSchedule } from '../../lib/guest-storage';
import RuleModesPanel from '../shared/RuleModesPanel';

const GUEST_RANKS = [
    'Staff Nurse',
    'Nursing Officer',
    'Senior Nursing Officer',
    'Principal Nursing Officer',
    'Rotation Midwife',
    'House Officer',
    'Medical Officer',
];

const WARD_4B_DEMO = [
    ['Faustina', 'Mensah', 'Principal Nursing Officer'],
    ['Kwame', 'Boateng', 'Senior Nursing Officer'],
    ['Akua', 'Serwaah', 'Nursing Officer'],
    ['Benedicta', 'Osei', 'Staff Nurse'],
    ['Comfort', 'Tetteh', 'Senior Nursing Officer'],
    ['Emmanuel', 'Donkor', 'Nursing Officer'],
    ['Doris', 'Annan', 'Staff Nurse'],
];

const CLEAR_OPTIONS = [
    {
        id: 'setup',
        label: 'Saved setup',
        hint: 'Shift codes, meanings, overlaps, and in-charge / assistant picks',
        defaultChecked: true,
        locked: true,
    },
    {
        id: 'ward',
        label: 'Ward title & dates',
        hint: 'Reset ward name and calendar start/end (e.g. back to this month)',
        defaultChecked: false,
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

/** Default ward title + calendar month (matches guest page initial state). */
function defaultSchedulePeriod(mode = 'guest') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const label = start.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        name: label,
        wardName: mode === 'guest' ? 'My Ward' : label,
    };
}

/** Drop import-era ward fields and apply default period (guest localStorage-safe). */
function resetWardDetails(target, mode) {
    Object.assign(target, defaultSchedulePeriod(mode));
    target.holidays = [];
    delete target.title;
}

function freshGuestScheduleState(mode) {
    return {
        ...defaultSchedulePeriod(mode),
        staff: [],
        assignments: [],
        holidays: [],
        rosterSetup: null,
        ruleModes: getDefaultRuleModes(),
    };
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
    exportsLeft = null,
    exportLimit = null,
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
    const [showRuleModes, setShowRuleModes] = useState(false);
    const [draftRuleModes, setDraftRuleModes] = useState(() => getDefaultRuleModes());
    const [pendingGenerate, setPendingGenerate] = useState(false);

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
        const clearWard = Boolean(selected?.ward) || clearSetup;

        const cleanSlate = clearSetup && clearShifts && clearStaff && clearWard;
        if (cleanSlate && mode === 'guest') {
            const next = freshGuestScheduleState(mode);
            clearGuestSchedule();
            onChange?.(next);
            setToast('Clean slate — ward, setup, shifts, and staff cleared.');
            return;
        }

        const next = { ...schedule };
        if (clearSetup) {
            next.rosterSetup = null;
            next.ruleModes = getDefaultRuleModes();
        }
        if (clearWard) {
            resetWardDetails(next, mode);
        }
        if (clearShifts) next.assignments = [];
        if (clearStaff) next.staff = [];
        onChange?.(next);
        const parts = [];
        if (clearSetup) parts.push('setup');
        if (clearWard) parts.push('ward');
        if (clearShifts) parts.push('shifts');
        if (clearStaff) parts.push('staff');
        setToast(
            cleanSlate
                ? 'Clean slate — ward, setup, shifts, and staff cleared.'
                : parts.length
                    ? `Cleared ${parts.join(', ')}.`
                    : 'Nothing selected to clear.'
        );
    };

    const addStaff = () => {
        if (!newFirst.trim() || !newLast.trim()) return;
        if (Number.isFinite(maxStaff) && staff.length >= maxStaff) {
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

    const addChargeNurse = () => {
        setNewRank('Senior Nursing Officer');
        if (!newFirst.trim() || !newLast.trim()) {
            setToast('Rank set to Senior Nursing Officer. Enter a name, then Add.');
            return;
        }
        if (Number.isFinite(maxStaff) && staff.length >= maxStaff) {
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
                    rank: 'Senior Nursing Officer',
                    wardRole: 'regular',
                },
            ],
        });
        setNewFirst('');
        setNewLast('');
        setToast('Charge nurse added in this browser.');
    };

    const loadDemoTeam = () => {
        const existing = new Set(staff.map((person) => `${person.firstName} ${person.lastName}`.trim().toLowerCase()));
        const incoming = WARD_4B_DEMO
            .filter(([first, last]) => !existing.has(`${first} ${last}`.toLowerCase()))
            .map(([first, last, rank], index) => ({
                _id: `${mode}_demo_${Date.now()}_${index}`,
                firstName: first,
                lastName: last,
                rank,
                wardRole: 'regular',
            }));
        if (!incoming.length) {
            setToast('Ward 4B demo team is already on this roster.');
            return;
        }
        const room = Number.isFinite(maxStaff) ? Math.max(0, maxStaff - staff.length) : incoming.length;
        const next = incoming.slice(0, room);
        if (!next.length) {
            setToast(`Limited to ${maxStaff} staff. Register or upgrade for more.`);
            return;
        }
        patch({
            staff: [...staff, ...next],
            wardName: 'Ward 4B',
            name: schedule?.name || 'Ward 4B',
        });
        setToast(`Added ${next.length} clinicians from the Ward 4B demo team. Saved in this browser.`);
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

    const runGenerate = (modes) => {
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
                settings: schedule?.settings || null,
                ruleModes: modes || schedule?.ruleModes || null,
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

    const handleGenerate = () => {
        if (!staff.length) {
            setToast('Add or import staff first.');
            return;
        }
        if (generatableCount <= 0) {
            setToast('No empty cover slots left to fill.');
            return;
        }
        if (!schedule?.ruleModes) {
            setDraftRuleModes(getDefaultRuleModes());
            setPendingGenerate(true);
            setShowRuleModes(true);
            return;
        }
        runGenerate(schedule.ruleModes);
    };

    const openRuleModes = () => {
        setDraftRuleModes(normalizeRuleModes(schedule?.ruleModes || getDefaultRuleModes()));
        setPendingGenerate(false);
        setShowRuleModes(true);
    };

    const saveRuleModes = () => {
        const modes = normalizeRuleModes(draftRuleModes);
        patch({ ruleModes: modes });
        setShowRuleModes(false);
        if (pendingGenerate) {
            setPendingGenerate(false);
            runGenerate(modes);
        }
    };

    const daysInRange = useMemo(() => {
        if (!schedule?.startDate || !schedule?.endDate) return 0;
        return Math.round((new Date(schedule.endDate) - new Date(schedule.startDate)) / 86400000) + 1;
    }, [schedule?.startDate, schedule?.endDate]);

    const guestEmptyOnboarding = mode === 'guest' && staff.length === 0;

    const staffAddForm = (
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <input
                className="h-11 w-full sm:w-auto flex-1 min-w-0 rounded-xl border border-slate-200 px-3 text-sm"
                placeholder="First name"
                value={newFirst}
                onChange={(e) => setNewFirst(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStaff()}
            />
            <input
                className="h-11 w-full sm:w-auto flex-1 min-w-0 rounded-xl border border-slate-200 px-3 text-sm"
                placeholder="Last name"
                value={newLast}
                onChange={(e) => setNewLast(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStaff()}
            />
            <input
                className="h-11 w-full sm:w-auto flex-1 min-w-0 rounded-xl border border-slate-200 px-3 text-sm"
                placeholder="Rank"
                value={newRank}
                onChange={(e) => setNewRank(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStaff()}
            />
            <button
                type="button"
                onClick={addStaff}
                className="h-11 px-5 rounded-xl border border-ghs-teal text-ghs-teal text-sm font-bold shrink-0 bg-white hover:bg-ghs-teal/5"
            >
                Add
            </button>
        </div>
    );

    const exportQuota = exportLimit != null
        ? `${exportsLeft} of ${exportLimit}`
        : null;

    return (
        <div className={mode === 'guest' ? 'min-h-screen bg-slate-canvas text-slate-black flex flex-col' : 'min-h-screen bg-ghs-surface'}>
            {mode === 'guest' ? (
                <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <Link href={backHref} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted hover:text-emerald-deep px-2.5 py-1.5 rounded-lg hover:bg-slate-100 shrink-0">
                                Home Portal
                            </Link>
                            <span className="text-slate-300 hidden sm:inline">/</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-mint-surface text-emerald-deep border border-mint-border">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Guest Sandbox Mode
                            </span>
                            <span className="hidden md:inline text-xs text-slate-muted">Auto-saved locally in browser</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            {exportQuota && (
                                <span className="hidden sm:inline text-xs font-medium text-slate-body bg-surface-container-low px-2.5 py-1 rounded-md border border-slate-200">
                                    <span className="font-bold text-emerald-deep">{exportQuota}</span> exports left
                                </span>
                            )}
                            <Link href="/roster-rules" className="text-xs font-semibold text-slate-body hover:text-slate-black">
                                Help & Docs
                            </Link>
                        </div>
                    </div>
                </header>
            ) : banner}

            <div className={mode === 'guest' ? 'flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6' : 'max-w-6xl mx-auto px-3 sm:px-4 py-6 md:py-8'}>
                <div className={`flex flex-col md:flex-row md:justify-between gap-4 ${mode === 'guest' ? 'md:items-start pb-2 border-b border-slate-200' : 'md:items-start mb-6'}`}>
                    <div className="min-w-0 flex-1">
                        {mode !== 'guest' && (
                            <Link href={backHref} className="text-xs font-bold text-ghs-muted hover:text-ghs-teal">
                                {backLabel}
                            </Link>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className={mode === 'guest' ? 'text-2xl sm:text-3xl font-extrabold text-slate-black tracking-tight' : 'text-xl md:text-2xl font-extrabold text-ghs-deep mt-2 truncate'}>{title}</h1>
                            {mode === 'guest' && staff.length === 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-surface text-amber-shift border border-amber-200">
                                    Unsaved Draft
                                </span>
                            )}
                        </div>
                        {mode !== 'guest' && subtitle ? <p className="text-sm text-ghs-muted mt-1">{subtitle}</p> : null}
                        <p className={mode === 'guest' ? 'mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-muted font-medium' : 'text-xs text-ghs-muted mt-1'}>
                            {mode === 'guest' ? (
                                <span>
                                    <span className="font-semibold text-slate-black">{formatRange(schedule?.startDate, schedule?.endDate)}</span>
                                    {` · ${daysInRange} days cycle · `}
                                    <span className="font-semibold text-slate-black">{`${staff.length} clinician${staff.length === 1 ? '' : 's'} enrolled`}</span>
                                    {' · Max 1 month'}
                                </span>
                            ) : (
                                <>
                                    {formatRange(schedule?.startDate, schedule?.endDate)}
                                    {daysInRange ? ` · ${daysInRange} days` : ''}
                                    {Number.isFinite(maxStaff)
                                        ? ` · ${staff.length}/${maxStaff} staff`
                                        : ` · ${staff.length} staff`}
                                    {assignments.length ? ` · ${assignments.length} shifts` : ''}
                                </>
                            )}
                        </p>
                    </div>
                    <div className={`flex flex-wrap gap-2 ${mode === 'guest' ? 'md:max-w-sm md:justify-end' : ''}`}>
                        {!guestEmptyOnboarding && (
                            <button
                                type="button"
                                data-tour="import-staff"
                                onClick={() => setShowImport(true)}
                                className="min-h-11 px-4 py-1.5 rounded-xl border text-sm font-bold leading-tight text-left bg-white cursor-pointer"
                            >
                                <span className="block">Import staff data</span>
                                <span className="block text-[10px] font-medium text-ghs-muted normal-case tracking-normal">Photo, PDF, Word, or Excel</span>
                            </button>
                        )}
                        <button
                            type="button"
                            data-tour="auto-generate"
                            disabled={generating || !staff.length || generatableCount <= 0}
                            onClick={handleGenerate}
                            title={generatableCount
                                ? `${generatableCount} empty cover slot${generatableCount === 1 ? '' : 's'} can be filled`
                                : 'No empty Morning / Afternoon / Night slots to fill'}
                            className="h-11 px-4 rounded-xl border border-ghs-teal text-ghs-teal text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed bg-white cursor-pointer"
                        >
                            {generating ? 'Generating…' : `Auto-generate (${generatableCount})`}
                        </button>
                        <button
                            type="button"
                            data-tour="rule-flex"
                            onClick={openRuleModes}
                            className="h-11 px-4 rounded-xl border text-sm font-bold text-ghs-muted bg-white cursor-pointer"
                            title="Flexible vs Hardened guidelines"
                        >
                            Rule flexibility
                        </button>
                        <button
                            type="button"
                            disabled={!assignments.length}
                            onClick={handleClearAll}
                            className="h-11 px-4 rounded-xl border text-sm font-bold text-ghs-muted bg-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Clear shifts
                        </button>
                        {(mode === 'guest' || mode === 'individual') && canReset ? (
                            <button
                                type="button"
                                onClick={handleResetSetup}
                                className="h-11 px-4 rounded-xl border border-amber-200 text-amber-900 text-sm font-bold bg-amber-50 cursor-pointer"
                                title="Clear saved setup, and optionally shifts or staff"
                            >
                                Reset / clear
                            </button>
                        ) : null}
                        <div className="relative">
                            <button
                                type="button"
                                data-tour="export-roster"
                                disabled={exporting}
                                onClick={() => setExportOpen((v) => !v)}
                                className="h-11 px-4 rounded-xl bg-ghs-teal text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

                {toast && !guestEmptyOnboarding && (
                    <div className="mb-4 rounded-xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold text-ghs-deep">
                        {toast}
                    </div>
                )}

                {mode !== 'guest' && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-5 mb-6 space-y-4" data-tour="roster-period">
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
                )}

                {guestEmptyOnboarding && (
                    <>
                        <div className="bg-mint-surface/70 border border-mint-border rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <p className="text-xs sm:text-sm text-emerald-deep">
                                {toast || 'Clean slate — ward parameters, shifts, and staff cleared. Ready for your data.'}
                            </p>
                            <button type="button" onClick={loadDemoTeam} className="text-xs font-semibold text-emerald-deep bg-white hover:bg-mint-surface px-2.5 py-1 rounded-md border border-mint-border cursor-pointer shrink-0">
                                Load Sample Ward
                            </button>
                        </div>
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-8 sm:p-12">
                                <button
                                    type="button"
                                    data-tour="import-staff"
                                    onClick={() => setShowImport(true)}
                                    className="max-w-2xl mx-auto w-full rounded-xl p-8 sm:p-10 text-center bg-mint-surface/40 border-2 border-dashed border-emerald-deep/30 hover:bg-mint-surface/70 cursor-pointer"
                                >
                                    <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white text-emerald-deep border border-mint-border mb-4">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                                            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                    <span className="block text-lg sm:text-xl font-bold text-slate-black mb-1">Upload staff data</span>
                                    <span className="block text-xs sm:text-sm text-slate-body max-w-md mx-auto mb-6">
                                        Photo, PDF, Word, or Excel — we read clinician names, existing duty schedules, and notes.
                                    </span>
                                    <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-on-primary bg-emerald-deep">
                                        Choose roster file
                                    </span>
                                    <span className="block text-[11px] font-medium text-slate-muted mt-3">
                                        Recommended: duty photo or .xlsx sheet · max 10 MB
                                    </span>
                                    <span className="mt-6 pt-5 border-t border-dashed border-slate-200 flex flex-wrap justify-center gap-2 text-[11px] font-medium text-slate-body">
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">Photo / camera</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">PDF</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">Excel / CSV</span>
                                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">Word</span>
                                    </span>
                                </button>
                            </div>
                        </section>
                        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm" data-tour="roster-staff">
                            <h2 className="text-base font-bold text-slate-black">Add manually</h2>
                            <p className="text-xs text-slate-muted mt-0.5 mb-4">One person at a time if you don&apos;t have a roster file yet.</p>
                            <form
                                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                                onSubmit={(event) => { event.preventDefault(); addStaff(); }}
                            >
                                <input
                                    className="sm:col-span-4 h-11 w-full px-3.5 rounded-lg border border-slate-300 text-sm"
                                    placeholder="First name"
                                    aria-label="First name"
                                    value={newFirst}
                                    onChange={(e) => setNewFirst(e.target.value)}
                                />
                                <input
                                    className="sm:col-span-4 h-11 w-full px-3.5 rounded-lg border border-slate-300 text-sm"
                                    placeholder="Last name"
                                    aria-label="Last name"
                                    value={newLast}
                                    onChange={(e) => setNewLast(e.target.value)}
                                />
                                <select
                                    className="sm:col-span-3 h-11 w-full px-3 rounded-lg border border-slate-300 text-sm bg-white"
                                    aria-label="Clinical role"
                                    value={newRank}
                                    onChange={(e) => setNewRank(e.target.value)}
                                >
                                    {GUEST_RANKS.map((rank) => <option key={rank}>{rank}</option>)}
                                </select>
                                <button type="submit" className="sm:col-span-1 h-11 w-full rounded-lg font-bold text-sm text-emerald-deep border border-emerald-deep hover:bg-emerald-deep hover:text-on-primary cursor-pointer">
                                    Add
                                </button>
                            </form>
                            <div className="pt-3 flex flex-wrap items-center gap-2 text-xs text-slate-muted">
                                <span>Quick adds:</span>
                                <button type="button" onClick={addChargeNurse} className="font-semibold text-emerald-deep underline underline-offset-2 cursor-pointer">
                                    Add charge nurse
                                </button>
                                <span>·</span>
                                <button type="button" onClick={loadDemoTeam} className="font-semibold text-emerald-deep underline underline-offset-2 cursor-pointer">
                                    Pre-fill Ward 4B demo team
                                </button>
                            </div>
                        </section>
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                ['Hospital compliance ready', 'Auto-validates the 48-hour rest after night blocks and weekly hour caps when you generate.'],
                                ['Shift coverage balance', 'Fills Morning, Afternoon, and Night cover from the staff you add.'],
                                ['Ward noticeboard ready', 'Export a printable PDF, Excel, or CSV roster from this browser.'],
                            ].map(([heading, body]) => (
                                <div key={heading} className="bg-white p-4 rounded-xl border border-slate-200">
                                    <h3 className="text-xs font-bold text-slate-black">{heading}</h3>
                                    <p className="text-[11px] text-slate-muted mt-1 leading-relaxed">{body}</p>
                                </div>
                            ))}
                        </section>
                    </>
                )}

                {!guestEmptyOnboarding && schedule?.startDate && schedule?.endDate && (
                    <div className="mb-6" data-tour="roster-calendar">
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

                {!guestEmptyOnboarding && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-5 mb-6" data-tour="roster-staff">
                        <h2 className="font-extrabold text-ghs-deep mb-3">Staff</h2>
                        <div className="mb-4">{staffAddForm}</div>
                        <ul className="divide-y max-h-48 overflow-y-auto">
                            {staff.map((s) => (
                                <li key={s._id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                                    <span className="font-semibold text-ghs-deep min-w-0 truncate">
                                        {s.firstName} {s.lastName}{' '}
                                        <span className="text-ghs-muted font-medium">· {s.rank}</span>
                                        {s.wardRole && s.wardRole !== 'regular' ? (
                                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-ghs-teal">{s.wardRole}</span>
                                        ) : null}
                                    </span>
                                    <button type="button" onClick={() => removeStaff(s._id)} className="text-xs font-bold text-rose-500 shrink-0">Remove</button>
                                </li>
                            ))}
                            {staff.length === 0 && (
                                <li className="py-8 text-center text-sm text-ghs-muted">
                                    No staff yet — add manually or import a duty roster photo or document.
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>

            {mode === 'guest' && (
                <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-muted">
                    <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <p>MedRoster clinical rostering · confidential clinical use</p>
                        <div className="flex items-center gap-4">
                            <Link href="/roster-rules" className="hover:text-slate-black">Act 651 rules</Link>
                            <span>Saved only in this browser</span>
                        </div>
                    </div>
                </footer>
            )}

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

            {showRuleModes && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-xl">
                    <div className="w-full max-w-lg bg-white rounded-[28px] border border-slate-100 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                            <h2 className="text-lg font-extrabold text-ghs-deep">
                                {pendingGenerate ? 'Before you generate' : 'Rule flexibility'}
                            </h2>
                            <p className="text-xs font-medium text-ghs-muted mt-1">
                                {pendingGenerate
                                    ? 'Pick which on-ground guidelines stay Flexible (warn) vs Hardened (enforce). You can change this later.'
                                    : 'Change Flexible vs Hardened for this roster.'}
                            </p>
                        </div>
                        <div className="overflow-y-auto flex-1 p-6">
                            <RuleModesPanel modes={draftRuleModes} onChange={setDraftRuleModes} title="" subtitle="" />
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowRuleModes(false);
                                    setPendingGenerate(false);
                                }}
                                className="flex-1 h-11 rounded-xl border text-sm font-bold text-ghs-muted"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={saveRuleModes}
                                className="flex-1 h-11 rounded-xl bg-ghs-teal text-white text-sm font-bold"
                            >
                                {pendingGenerate ? 'Save & generate' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
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
                        const mergedStaff = Number.isFinite(maxStaff)
                            ? [...staff, ...incoming].slice(0, maxStaff)
                            : [...staff, ...incoming];
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
                        if (data.ruleModes) {
                            datePatch.ruleModes = normalizeRuleModes(data.ruleModes);
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
