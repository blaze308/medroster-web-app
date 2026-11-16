'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import HospitalShell from './HospitalShell';
import DepartmentsTab from './DepartmentsTab';
import WardHome from './WardHome';
import JoinCodeEditor from './JoinCodeEditor';
import { useFirebaseAuth } from '../FirebaseAuthProvider';
import { collapseOrgUnits, getDisplayWards } from '../../lib/org-units';
import MsIcon from '../landing/MsIcon';

export default function HospitalDashboard({ hospitalId }) {
    const router = useRouter();
    const { role, status } = useFirebaseAuth();
    const canWrite = role !== 'staff';
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [activeWardId, setActiveWardId] = useState('');
    const [staff, setStaff] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [query, setQuery] = useState('');
    const [signoffNote, setSignoffNote] = useState('');

    const fetchHospital = useCallback(async () => {
        if (status === 'loading') return;
        try {
            const data = await apiFetch(`/api/hospitals/${hospitalId}`);
            if (canWrite && (!data.departments || data.departments.length === 0)) {
                router.replace(`/hospital/${hospitalId}/setup`);
                return;
            }
            const { departments, wards } = collapseOrgUnits(data.departments, data.wards);
            const displayWards = getDisplayWards(departments, wards);
            setHospital({ ...data, departments, wards });
            const [staffData, schedData] = await Promise.all([
                apiFetch(`/api/hospitals/${hospitalId}/staff`).catch(() => []),
                apiFetch(`/api/hospitals/${hospitalId}/schedules`).catch(() => []),
            ]);
            setStaff(Array.isArray(staffData) ? staffData : []);
            setSchedules(Array.isArray(schedData) ? schedData : []);
            setActiveWardId((current) => {
                if (current && displayWards.some((w) => String(w._id) === String(current))) return current;
                return displayWards[0]?._id || wards[0]?._id || '';
            });
        } catch {
            router.push('/');
        } finally {
            setLoading(false);
        }
    }, [hospitalId, router, canWrite, status]);

    useEffect(() => {
        fetchHospital();
    }, [fetchHospital]);

    const openWard = (wardId) => {
        setActiveWardId(wardId);
        const latest = schedules
            .filter((item) => String(item.wardId) === String(wardId))
            .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))[0];
        if (latest) {
            router.push(`/hospital/${hospitalId}/schedule/${latest._id}`);
            return;
        }
        setActiveTab('ward');
    };

    const activeWard = useMemo(
        () => (hospital?.wards || []).find((w) => String(w._id) === String(activeWardId)),
        [hospital, activeWardId]
    );
    const activeDepartment = useMemo(
        () => (hospital?.departments || []).find((d) => String(d._id) === String(activeWard?.departmentId)),
        [hospital, activeWard]
    );

    if (loading || !hospital) {
        return (
            <div className="flex items-center justify-center h-screen bg-ghs-surface">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-ghs-teal rounded-full animate-spin" />
            </div>
        );
    }

    const displayWards = getDisplayWards(hospital.departments, hospital.wards);
    const visibleWards = displayWards.filter((ward) => {
        const text = query.trim().toLowerCase();
        if (!text) return true;
        return ward.name.toLowerCase().includes(text);
    });
    const latestFor = (wardId) => schedules
        .filter((item) => String(item.wardId) === String(wardId))
        .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))[0];

    return (
        <HospitalShell
            hospital={hospital}
            active="overview"
            breadcrumb={['Overview']}
            scheduleHref={activeWard ? (latestFor(activeWard._id) ? `/hospital/${hospitalId}/schedule/${latestFor(activeWard._id)._id}` : undefined) : undefined}
            search={query}
            onSearch={setQuery}
            sidebarProps={{
                activeTab,
                activeWardId,
                canWrite,
                showSettings: role === 'admin',
                onTabChange: setActiveTab,
                onWardOpen: openWard,
            }}
        >
            {activeTab === 'overview' && (
                <div className="flex flex-col gap-6">
                    <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-teal-brand">{hospital.type} · {hospital.region}</p>
                        <h1 className="landing-headline">{hospital.name}</h1>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        {[
                            ['Active wards', displayWards.length, 'local_hospital'],
                            ['Rostered clinicians', staff.length, 'groups'],
                            ['Schedules', schedules.length, 'calendar_month'],
                            ['Departments', (hospital.departments || []).length, 'account_tree'],
                            ['Join code', hospital.joinCode || '—', 'key'],
                        ].map(([label, value, icon]) => (
                            <div key={label} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
                                <MsIcon name={icon} className="text-emerald-deep" />
                                <div className="text-2xl font-bold text-slate-black mt-2 truncate">{value}</div>
                                <div className="text-[11px] text-slate-muted">{label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-5 shadow-sm">
                            <h2 className="text-base font-bold text-slate-black">Coverage notes</h2>
                            <p className="text-sm text-slate-body mt-2">
                                {staff.length === 0
                                    ? 'No clinicians are on the roster yet. Open a ward to add staff.'
                                    : `${staff.length} clinician${staff.length === 1 ? '' : 's'} assigned across ${displayWards.length} ward${displayWards.length === 1 ? '' : 's'}.`}
                            </p>
                        </div>
                        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-5 shadow-sm">
                            <h2 className="text-base font-bold text-slate-black">Directorate sign-off</h2>
                            <p className="text-sm text-slate-body mt-2">Publication stays on each ward schedule. This card only records that you reviewed the overview.</p>
                            <button type="button" onClick={() => setSignoffNote('Sign-off noted on this page. No document was sent.')} className="mt-3 px-4 py-2 rounded-lg bg-emerald-deep text-on-primary text-[13px] font-semibold cursor-pointer">
                                Mark reviewed
                            </button>
                            {signoffNote && <p className="text-sm text-forest-mid mt-2">{signoffNote}</p>}
                        </div>
                    </div>
                    <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                        <div className="px-4 py-3 text-sm font-semibold text-slate-black">Ward status</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-160">
                                <thead className="bg-surface-container-low text-[11px] uppercase text-slate-muted">
                                    <tr>
                                        <th className="px-4 py-2">Ward</th>
                                        <th className="px-4 py-2">Staff</th>
                                        <th className="px-4 py-2">Latest schedule</th>
                                        <th className="px-4 py-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleWards.map((ward) => {
                                        const latest = latestFor(ward._id);
                                        const count = staff.filter((person) => String(person.wardId) === String(ward._id)).length;
                                        return (
                                            <tr key={ward._id} className="border-t border-surface-container">
                                                <td className="px-4 py-3 text-sm font-semibold text-slate-black">{ward.name}</td>
                                                <td className="px-4 py-3 text-sm text-slate-body">{count}</td>
                                                <td className="px-4 py-3 text-sm text-slate-body">{latest?.name || 'None yet'}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button type="button" onClick={() => openWard(ward._id)} className="text-[13px] font-semibold text-emerald-deep cursor-pointer">
                                                        Open
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {visibleWards.length === 0 && (
                                        <tr><td colSpan={4} className="px-4 py-6 text-sm text-slate-muted">No wards match.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'departments' && (
                <DepartmentsTab hospital={hospital} onChange={fetchHospital} onWardOpen={openWard} canWrite={canWrite} />
            )}
            {activeTab === 'ward' && activeWard && (
                <WardHome hospital={hospital} ward={activeWard} department={activeDepartment} onChange={fetchHospital} />
            )}
            {activeTab === 'ward' && !activeWard && (
                <div className="bg-surface-container-lowest rounded-xl p-10 text-center">
                    <h3 className="text-xl font-bold text-slate-black">Pick a ward</h3>
                    <p className="text-sm text-slate-muted mt-2">Choose a ward on the left, or add one under Add / edit wards.</p>
                </div>
            )}
            {activeTab === 'settings' && role === 'admin' && (
                <div className="max-w-lg space-y-4">
                    <JoinCodeEditor
                        hospitalId={hospital._id}
                        joinCode={hospital.joinCode}
                        onUpdated={(code) => setHospital((current) => ({ ...current, joinCode: code }))}
                    />
                    <p className="text-xs text-slate-muted">Share this code so staff can join and view schedules.</p>
                </div>
            )}
        </HospitalShell>
    );
}
