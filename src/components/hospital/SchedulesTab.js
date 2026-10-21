'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import CreateScheduleModal from '../modals/CreateScheduleModal';

function formatRange(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

const STATUS_BADGE = {
    draft: 'bg-amber-50 text-amber-600 border-amber-100',
    published: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    archived: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function SchedulesTab({ hospital, canWrite = true }) {
    const router = useRouter();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    const fetchSchedules = useCallback(async () => {
        try {
            const data = await apiFetch(`/api/hospitals/${hospital._id}/schedules`);
            setSchedules(Array.isArray(data) ? data : []);
        } catch {
            setSchedules([]);
        } finally {
            setLoading(false);
        }
    }, [hospital._id]);

    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);

    const handleCreated = (sched) => {
        router.push(`/hospital/${hospital._id}/schedule/${sched._id}`);
    };

    const handleDelete = async (sched) => {
        if (!confirm(`Delete schedule for ${formatRange(sched.startDate, sched.endDate)}? All assignments will be lost.`)) return;
        try {
            await apiFetch(`/api/hospitals/${hospital._id}/schedules/${sched._id}`, { method: 'DELETE' });
            await fetchSchedules();
        } catch (err) {
            alert(err.message || 'Failed to delete');
        }
    };

    const wards = hospital.wards || [];
    const departments = hospital.departments || [];

    return (
        <div className="mr-enter flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">{schedules.length} {schedules.length === 1 ? 'Schedule' : 'Schedules'}</h2>
                    <p className="text-synclly-muted font-medium text-sm mt-1">Ward roster cycles with auto-generation and validation.</p>
                </div>
                {canWrite && (
                <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs py-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    New Schedule
                </button>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-synclly-coral rounded-full animate-spin" />
                </div>
            ) : schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[40px] border border-slate-100 shadow-synclly">
                    <h3 className="text-xl font-extrabold text-synclly-deep">No schedules yet</h3>
                    <p className="text-synclly-muted text-sm font-medium max-w-xs mt-2 mb-6">
                        {canWrite ? 'Create your first ward roster cycle.' : 'No schedules have been published yet.'}
                    </p>
                    {canWrite && (
                    <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs py-2">
                        New Schedule
                    </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {schedules.map((s) => (
                        <div key={s._id} className="group bg-white rounded-[24px] border border-slate-50 p-6 hover:shadow-synclly transition-all hover:-translate-y-0.5">
                            <div className="flex items-start justify-between gap-3 mb-4">
                                <div>
                                    <p className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest mb-1">Cycle</p>
                                    <h3 className="text-base font-extrabold text-synclly-deep">{formatRange(s.startDate, s.endDate)}</h3>
                                    <p className="text-xs text-synclly-muted font-bold mt-1 truncate">
                                        {wards.find((w) => String(w._id) === String(s.wardId))?.name || 'Ward'}
                                    </p>
                                    {s.name && <p className="text-xs text-synclly-muted font-medium mt-1 truncate">{s.name}</p>}
                                </div>
                                <span className={`shrink-0 text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md border ${STATUS_BADGE[s.status] || STATUS_BADGE.draft}`}>
                                    {s.status || 'draft'}
                                </span>
                            </div>

                            <div className="flex items-baseline gap-2 mb-5">
                                <span className="text-3xl font-extrabold text-synclly-deep">{s.assignmentCount}</span>
                                <span className="text-[11px] font-bold text-synclly-muted uppercase tracking-wider">assignments</span>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => router.push(`/hospital/${hospital._id}/schedule/${s._id}`)}
                                    className="flex-1 h-10 rounded-xl bg-synclly-coral text-white text-xs font-bold hover:bg-synclly-coral-hover shadow-md shadow-synclly-coral/10 cursor-pointer"
                                >
                                    Open
                                </button>
                                {canWrite && (
                                <button
                                    onClick={() => handleDelete(s)}
                                    className="w-10 h-10 rounded-xl text-rose-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                                    title="Delete"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                                    </svg>
                                </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <CreateScheduleModal
                    hospitalId={hospital._id}
                    wards={wards}
                    departments={departments}
                    onClose={() => setShowCreate(false)}
                    onCreated={handleCreated}
                />
            )}
        </div>
    );
}
