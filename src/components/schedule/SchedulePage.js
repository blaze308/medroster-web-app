'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import CalendarGrid from './CalendarGrid';
import ShiftPicker from './ShiftPicker';
import ValidationPanel from './ValidationPanel';
import SettingsModal from './SettingsModal';
import { exportRosterPdf } from '../../lib/pdf-export';
import { exportRosterCsv, exportRosterExcel } from '../../lib/spreadsheet-export';
import { useFirebaseAuth } from '../FirebaseAuthProvider';

function formatRange(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export default function SchedulePage({ hospitalId, scheduleId }) {
    const router = useRouter();
    const { role } = useFirebaseAuth();
    const canWrite = role !== 'staff';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [picker, setPicker] = useState(null); // { staff, date, currentShiftTypeId }
    const [showSettings, setShowSettings] = useState(false);
    const [usePreferences, setUsePreferences] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [statusToast, setStatusToast] = useState(null); // { kind: 'success' | 'error', message }
    const [exporting, setExporting] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);

    const fetchSchedule = useCallback(async () => {
        try {
            const fetched = await apiFetch(`/api/hospitals/${hospitalId}/schedules/${scheduleId}`);
            setData(fetched);
        } catch {
            router.push(`/hospital/${hospitalId}`);
        } finally {
            setLoading(false);
        }
    }, [hospitalId, scheduleId, router]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    useEffect(() => {
        if (!statusToast) return;
        const t = setTimeout(() => setStatusToast(null), 4000);
        return () => clearTimeout(t);
    }, [statusToast]);

    const filteredStaff = useMemo(() => (data ? data.staff : []), [data]);

    const handleExport = async (format = 'pdf') => {
        if (!data) return;
        setExportOpen(false);
        setExporting(true);
        try {
            const ward = data.wards?.find((w) => String(w._id) === String(data.schedule.wardId));
            const department = data.departments?.find((d) => String(d._id) === String(data.schedule.departmentId));
            const payload = {
                schedule: data.schedule,
                hospital: data.hospital,
                ward,
                department,
                staff: data.staff,
                assignments: data.assignments,
                rosterSetup: ward?.rosterSetup || data.schedule?.rosterSetup || null,
            };
            if (format === 'excel') await exportRosterExcel(payload);
            else if (format === 'csv') exportRosterCsv(payload);
            else await exportRosterPdf(payload);
        } catch (err) {
            setStatusToast({ kind: 'error', message: 'Export failed: ' + err.message });
        } finally {
            setExporting(false);
        }
    };

    const handleCellClick = (staff, date) => {
        if (!canWrite || !data) return;
        const existing = data.assignments.find(
            (a) => String(a.staffId) === String(staff._id) && new Date(a.date).toISOString().split('T')[0] === date.toISOString().split('T')[0]
        );
        const currentShiftType = existing?.shiftType;
        const matchedTypeId = currentShiftType
            ? (data.hospital.shiftTypes.find((st) => st.name === currentShiftType.name)?.id ||
               data.hospital.shiftTypes.find((st) => st.name === currentShiftType.name)?._id)
            : null;
        setPicker({ staff, date, currentShiftTypeId: matchedTypeId, currentShiftType });
    };

    const handleAssign = async (shiftTypeId) => {
        if (!picker) return;
        const { staff, date } = picker;
        try {
            const result = await apiFetch(`/api/hospitals/${hospitalId}/schedules/${scheduleId}/assignments`, {
                method: 'POST',
                body: JSON.stringify({ staffId: staff._id, date: date.toISOString(), shiftTypeId: shiftTypeId || null }),
            });
            setPicker(null);
            await fetchSchedule();
            if (result.warnings?.length > 0) {
                setStatusToast({ kind: 'warning', message: result.warnings.join('; ') });
            } else {
                setStatusToast({ kind: 'success', message: shiftTypeId ? 'Shift assigned' : 'Shift cleared' });
            }
        } catch (err) {
            setStatusToast({ kind: 'error', message: err.data?.errors?.join('; ') || err.message || 'Validation failed' });
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Clear every assignment in this schedule?')) return;
        try {
            await apiFetch(`/api/hospitals/${hospitalId}/schedules/${scheduleId}/assignments?clearAll=true`, { method: 'DELETE' });
            await fetchSchedule();
            setStatusToast({ kind: 'success', message: 'All assignments cleared' });
        } catch (err) {
            setStatusToast({ kind: 'error', message: err.message });
        }
    };

    const handleGenerate = async () => {
        if (!confirm('Auto-generate will replace existing assignments. Continue?')) return;
        setGenerating(true);
        try {
            const result = await apiFetch(`/api/hospitals/${hospitalId}/schedules/${scheduleId}/generate`, {
                method: 'POST',
                body: JSON.stringify({ usePreferences }),
            });
            await fetchSchedule();
            setStatusToast({
                kind: 'success',
                message: `Generated ${result.assignmentsCreated} assignments across ${result.staffConsidered} staff`,
            });
        } catch (err) {
            setStatusToast({ kind: 'error', message: err.message || 'Generation failed' });
        } finally {
            setGenerating(false);
        }
    };

    const handleSettingsSaved = async (newSettings) => {
        try {
            await apiFetch(`/api/hospitals/${hospitalId}`, {
                method: 'PATCH',
                body: JSON.stringify({ settings: newSettings }),
            });
            await fetchSchedule();
            setShowSettings(false);
            setStatusToast({ kind: 'success', message: 'Settings updated' });
        } catch (err) {
            setStatusToast({ kind: 'error', message: err.message });
        }
    };

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-synclly-surface">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-synclly-coral rounded-full animate-spin" />
            </div>
        );
    }

    const { schedule, hospital, departments, wards, assignments } = data;
    const activeWard = wards?.find((w) => String(w._id) === String(schedule.wardId));
    const wardRosterSetup = activeWard?.rosterSetup || schedule?.rosterSetup || null;
    const ward = wards?.find((w) => String(w._id) === String(schedule.wardId));
    const department = departments?.find((d) => String(d._id) === String(schedule.departmentId));

    return (
        <div className="min-h-screen bg-ghs-surface text-ghs-deep">
            <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="px-6 md:px-10 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/hospital/${hospitalId}`)}
                            className="w-10 h-10 rounded-xl bg-ghs-surface text-ghs-muted hover:text-ghs-teal flex items-center justify-center transition-all"
                            aria-label="Back"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <div>
                            <p className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest">{hospital.name}</p>
                            <h1 className="text-xl font-extrabold tracking-tight">
                                {schedule.name || 'Ward Schedule'} · {formatRange(schedule.startDate, schedule.endDate)}
                            </h1>
                            <p className="text-xs font-bold text-ghs-muted mt-1">
                                {department?.name || 'Department'} / {ward?.name || 'Ward'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {canWrite && (
                        <>
                        <label className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-ghs-muted text-xs font-bold flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={usePreferences}
                                onChange={(e) => setUsePreferences(e.target.checked)}
                                className="accent-ghs-teal"
                            />
                            Use preferences
                        </label>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="h-10 px-5 rounded-xl bg-ghs-teal text-white text-xs font-bold hover:bg-ghs-teal-hover shadow-md shadow-ghs-teal/10 flex items-center gap-2 disabled:opacity-50"
                        >
                            {generating ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>Auto-Generate</>
                            )}
                        </button>
                        </>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setExportOpen((v) => !v)}
                                disabled={exporting}
                                className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-ghs-teal text-xs font-bold hover:bg-ghs-teal-light flex items-center gap-2 disabled:opacity-50 transition-all"
                                title="Export roster"
                            >
                                {exporting ? (
                                    <div className="w-3 h-3 border-2 border-ghs-teal/30 border-t-ghs-teal rounded-full animate-spin" />
                                ) : (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                    </svg>
                                )}
                                Export ▾
                            </button>
                            {exportOpen && !exporting ? (
                                <>
                                    <button
                                        type="button"
                                        className="fixed inset-0 z-40 cursor-default"
                                        aria-label="Close export menu"
                                        onClick={() => setExportOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-1 z-50 min-w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                        {['pdf', 'excel', 'csv'].map((fmt) => (
                                            <button
                                                key={fmt}
                                                type="button"
                                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-ghs-deep hover:bg-slate-50 uppercase"
                                                onClick={() => handleExport(fmt)}
                                            >
                                                {fmt === 'excel' ? 'Excel (.xlsx)' : fmt}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : null}
                        </div>
                        {canWrite && (
                        <>
                        <button
                            onClick={handleClearAll}
                            className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-ghs-muted text-xs font-bold hover:bg-slate-50"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="h-10 w-10 rounded-xl bg-white border border-slate-200 text-ghs-muted hover:text-ghs-teal flex items-center justify-center"
                            aria-label="Settings"
                            title="Settings"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </button>
                        </>
                        )}
                    </div>
                </div>
                <div className="px-6 md:px-10 pb-3">
                    <div className="inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-ghs-surface text-[11px] font-bold text-ghs-muted">
                        Ward-specific roster: staff cannot be interchanged across wards.
                    </div>
                </div>
            </header>

            <main className="px-6 md:px-10 py-6">
                <CalendarGrid
                    startDate={schedule.startDate}
                    endDate={schedule.endDate}
                    holidays={schedule.holidays || []}
                    staff={filteredStaff}
                    assignments={assignments}
                    onCellClick={handleCellClick}
                    rosterSetup={wardRosterSetup}
                />
            </main>

            <ValidationPanel hospitalId={hospitalId} scheduleId={scheduleId} dataVersion={data.assignments.length} />

            {canWrite && picker && (
                <ShiftPicker
                    staff={picker.staff}
                    date={picker.date}
                    shiftTypes={hospital.shiftTypes}
                    currentShiftTypeId={picker.currentShiftTypeId}
                    onAssign={handleAssign}
                    onClose={() => setPicker(null)}
                    rosterSetup={wardRosterSetup}
                />
            )}

            {canWrite && showSettings && (
                <SettingsModal
                    settings={hospital.settings}
                    onSave={handleSettingsSaved}
                    onClose={() => setShowSettings(false)}
                />
            )}

            {statusToast && (
                <div
                    className={`fixed top-24 right-6 z-50 max-w-md px-5 py-3 rounded-2xl shadow-synclly-lg border text-sm font-bold animate-in slide-in-from-top-4 duration-300 ${
                        statusToast.kind === 'error'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : statusToast.kind === 'warning'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                >
                    {statusToast.message}
                </div>
            )}
        </div>
    );
}
