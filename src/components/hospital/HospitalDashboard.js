'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';
import HospitalSidebar from './HospitalSidebar';
import DepartmentsTab from './DepartmentsTab';
import WardHome from './WardHome';
import JoinCodeEditor from './JoinCodeEditor';
import { useFirebaseAuth } from '../FirebaseAuthProvider';
import { collapseOrgUnits, getDisplayWards } from '../../lib/org-units';

export default function HospitalDashboard({ hospitalId }) {
    const router = useRouter();
    const { role, status } = useFirebaseAuth();
    const canWrite = role !== 'staff';
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ward');
    const [activeWardId, setActiveWardId] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
        setActiveTab('ward');
        setSidebarOpen(false);
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

    return (
        <div className="flex h-screen bg-ghs-surface overflow-hidden text-ghs-deep">
            <HospitalSidebar
                hospital={hospital}
                activeTab={activeTab}
                activeWardId={activeWardId}
                onTabChange={(tab) => {
                    setActiveTab(tab);
                    setSidebarOpen(false);
                }}
                onWardOpen={openWard}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                canWrite={canWrite}
                showSettings={role === 'admin'}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="w-9 h-9 rounded-xl bg-ghs-surface flex items-center justify-center text-ghs-muted cursor-pointer"
                        aria-label="Open menu"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                    <span className="text-sm font-extrabold text-ghs-deep truncate px-2">{hospital.name}</span>
                    <div className="w-9 shrink-0" />
                </div>

                <header className="px-4 md:px-10 pt-6 md:pt-8 pb-4 md:pb-6">
                    <p className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest">
                        {hospital.type} · {hospital.region}
                    </p>
                    <h1 className="truncate">{hospital.name}</h1>
                </header>

                <main className="px-4 md:px-10 pb-20 flex-1 flex flex-col min-h-0">
                    {activeTab === 'departments' && (
                        <DepartmentsTab hospital={hospital} onChange={fetchHospital} onWardOpen={openWard} canWrite={canWrite} />
                    )}
                    {activeTab === 'ward' && activeWard && (
                        <WardHome
                            hospital={hospital}
                            ward={activeWard}
                            department={activeDepartment}
                            onChange={fetchHospital}
                        />
                    )}
                    {activeTab === 'ward' && !activeWard && (
                        <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[40px] border border-slate-100 shadow-synclly">
                            <h3 className="text-xl font-extrabold text-synclly-deep">Pick a ward</h3>
                            <p className="text-synclly-muted text-sm font-medium max-w-xs mt-2">
                                Choose a ward on the left, or add one under Add / edit wards.
                            </p>
                        </div>
                    )}
                    {activeTab === 'settings' && role === 'admin' && (
                        <div className="max-w-lg space-y-4">
                            <JoinCodeEditor
                                hospitalId={hospital._id}
                                joinCode={hospital.joinCode}
                                onUpdated={(code) => setHospital((h) => ({ ...h, joinCode: code }))}
                            />
                            <p className="text-xs text-ghs-muted">
                                Share this code with staff so they can join via <strong>Join hospital</strong> and view schedules (read-only).
                            </p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
