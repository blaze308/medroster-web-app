'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import StaffFormModal from '../modals/StaffFormModal';
import ImportStaffModal from '../modals/ImportStaffModal';
import { useFirebaseAuth } from '../FirebaseAuthProvider';
import { getDisplayWards } from '../../lib/org-units';

export default function StaffTab({ hospital, onChange, activeWardId = 'all', onWardChange }) {
    const { role } = useFirebaseAuth();
    const router = useRouter();
    const canWrite = role !== 'staff';
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editStaff, setEditStaff] = useState(null);
    const [search, setSearch] = useState('');

    const departments = useMemo(() => hospital.departments || [], [hospital.departments]);
    const wards = useMemo(() => hospital.wards || [], [hospital.wards]);
    const displayWards = useMemo(() => getDisplayWards(departments, wards), [departments, wards]);

    const fetchStaff = useCallback(async () => {
        try {
            const data = await apiFetch(`/api/hospitals/${hospital._id}/staff`);
            setStaff(Array.isArray(data) ? data : []);
        } catch {
            setStaff([]);
        } finally {
            setLoading(false);
        }
    }, [hospital._id]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const refresh = async () => {
        await fetchStaff();
        onChange?.();
    };

    const handleSaved = async () => {
        setShowAdd(false);
        setEditStaff(null);
        await refresh();
    };

    const handleDelete = async (s) => {
        if (!confirm(`Remove ${s.firstName} ${s.lastName}? Their assignments will also be deleted.`)) return;
        try {
            await apiFetch(`/api/hospitals/${hospital._id}/staff/${s._id}`, { method: 'DELETE' });
            await refresh();
        } catch (err) {
            alert(err.message || 'Failed to delete');
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return staff.filter((s) => {
            if (activeWardId !== 'all' && String(s.wardId) !== activeWardId) return false;
            if (!q) return true;
            return (
                `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
                (s.rank || '').toLowerCase().includes(q)
            );
        });
    }, [staff, activeWardId, search]);

    const wardCounts = useMemo(() => {
        const counts = new Map();
        staff.forEach((s) => {
            counts.set(String(s.wardId), (counts.get(String(s.wardId)) || 0) + 1);
        });
        return counts;
    }, [staff]);

    return (
        <div className="mr-enter flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight">{staff.length} {staff.length === 1 ? 'Staff Member' : 'Staff Members'}</h2>
                    <p className="text-synclly-muted font-medium text-sm mt-1">
                        {canWrite
                            ? 'Import a duty roster (photo, PDF, Word, or Excel).'
                            : 'All clinical and support personnel.'}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or rank..."
                        className="h-10 w-full sm:w-64 bg-white border border-slate-200 rounded-xl px-4 text-sm font-medium text-synclly-deep placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
                    />
                    {canWrite && (
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setShowImport(true)}
                                className="btn btn-secondary text-xs py-2 leading-tight text-left flex-1 sm:flex-none"
                            >
                                <span className="block">Import staff data</span>
                                <span className="block text-[9px] font-medium opacity-70 normal-case tracking-normal">Photo, PDF, Word, or Excel</span>
                            </button>
                            <button onClick={() => setShowAdd(true)} className="btn btn-primary text-xs py-2 flex-1 sm:flex-none">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                Add Staff
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Ward filter chips */}
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-2">
                <button
                    onClick={() => onWardChange?.('all')}
                    className={`shrink-0 h-9 px-4 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        activeWardId === 'all'
                            ? 'bg-synclly-coral text-white shadow-md shadow-synclly-coral/20'
                            : 'bg-white border border-slate-100 text-synclly-muted hover:text-synclly-deep'
                    }`}
                >
                    All ({staff.length})
                </button>
                {displayWards.map((w) => {
                    const department = departments.find((d) => String(d._id) === String(w.departmentId));
                    return (
                    <button
                        key={w._id}
                        onClick={() => onWardChange?.(w._id)}
                        className={`shrink-0 h-9 px-4 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                            activeWardId === w._id
                                ? 'bg-synclly-coral text-white shadow-md shadow-synclly-coral/20'
                                : 'bg-white border border-slate-100 text-synclly-muted hover:text-synclly-deep'
                        }`}
                    >
                        {w.name} <span className="font-medium opacity-70">({department?.name || 'Dept'})</span> ({wardCounts.get(String(w._id)) || 0})
                    </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-synclly-coral rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[40px] border border-slate-100 shadow-synclly">
                    <h3 className="text-xl font-extrabold text-synclly-deep">No staff yet</h3>
                    <p className="text-synclly-muted text-sm font-medium max-w-xs mt-2 mb-6">
                        {staff.length === 0
                            ? (canWrite ? 'Start by adding your first staff member.' : 'No staff have been added yet.')
                            : 'No staff match your filter.'}
                    </p>
                    {staff.length === 0 && canWrite && (
                        <button onClick={() => setShowAdd(true)} className="btn btn-primary text-xs py-2">Add Staff</button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((s) => {
                        const dept = departments.find((d) => String(d._id) === String(s.departmentId));
                        const ward = wards.find((w) => String(w._id) === String(s.wardId));
                        const initials = `${s.firstName[0] || ''}${s.lastName[0] || ''}`.toUpperCase();
                        const badge =
                            s.staffType === 'pno'
                                ? { label: 'PNO+', cls: 'bg-purple-50 text-purple-600 border-purple-100' }
                                : s.staffType === 'senior'
                                ? { label: 'SENIOR', cls: 'bg-blue-50 text-blue-600 border-blue-100' }
                                : null;

                        return (
                            <div key={s._id} className="group bg-white rounded-[24px] border border-slate-50 p-6 transition-all hover:shadow-synclly hover:-translate-y-0.5">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-12 h-12 rounded-2xl bg-synclly-coral/10 text-synclly-coral flex items-center justify-center font-extrabold text-sm shrink-0">
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-extrabold text-synclly-deep truncate">{s.firstName} {s.lastName}</h3>
                                            <p className="text-[11px] font-bold text-synclly-muted uppercase tracking-wider truncate">
                                                {s.rank || s.category || 'Staff'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {badge && (
                                            <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-md border ${badge.cls}`}>
                                                {badge.label}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1 text-xs text-synclly-muted font-medium border-t border-slate-50 pt-3">
                                    <div className="flex justify-between"><span>Dept</span><span className="font-bold text-synclly-deep truncate ml-2">{dept?.name || '-'}</span></div>
                                    <div className="flex justify-between"><span>Ward</span><span className="font-bold text-synclly-deep truncate ml-2">{ward?.name || '-'}</span></div>
                                </div>

                                {canWrite && (
                                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                                    <button
                                        onClick={() => setEditStaff(s)}
                                        className="flex-1 h-9 rounded-xl bg-synclly-surface text-synclly-deep text-[11px] font-bold hover:bg-slate-100 cursor-pointer"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(s)}
                                        className="w-9 h-9 rounded-xl text-rose-400 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                                        title="Remove"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                                        </svg>
                                    </button>
                                </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {(showAdd || editStaff) && (
                <StaffFormModal
                    hospitalId={hospital._id}
                    departments={departments}
                    wards={displayWards}
                    staff={editStaff}
                    defaultDepartmentId={activeWardId === 'all' ? displayWards[0]?.departmentId || departments[0]?._id : displayWards.find((w) => String(w._id) === activeWardId)?.departmentId}
                    defaultWardId={activeWardId === 'all' ? displayWards[0]?._id : activeWardId}
                    onClose={() => {
                        setShowAdd(false);
                        setEditStaff(null);
                    }}
                    onSaved={handleSaved}
                />
            )}

            {showImport && (
                <ImportStaffModal
                    mode="hospital"
                    hospitalId={hospital._id}
                    departments={departments}
                    wards={displayWards}
                    onClose={() => setShowImport(false)}
                    onImported={async (data) => {
                        setShowImport(false);
                        await refresh();
                        if (data?.scheduleId) {
                            router.push(`/hospital/${hospital._id}/schedule/${data.scheduleId}`);
                        }
                    }}
                />
            )}
        </div>
    );
}
