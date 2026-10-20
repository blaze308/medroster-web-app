'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useFirebaseAuth } from '../../components/FirebaseAuthProvider';
import { apiFetch } from '../../lib/api';
import ImportStaffModal from '../../components/modals/ImportStaffModal';
import { HOSPITAL_TYPES, GHANA_REGIONS } from '../../lib/ghana-data';
import { takeGuestDataForMigration } from '../../lib/guest-storage';

export default function IndividualDashboard() {
    const router = useRouter();
    const { status, user } = useFirebaseAuth();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showImport, setShowImport] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [hospitalName, setHospitalName] = useState('');
    const [hospitalType, setHospitalType] = useState('District Hospital');
    const [hospitalRegion, setHospitalRegion] = useState('Greater Accra');
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin');
            return;
        }
        if (status !== 'authenticated') return;

        (async () => {
            try {
                const me = await apiFetch('/api/auth/me');
                if (me.accountType === 'enterprise' && me.hospitalId) {
                    router.replace(`/hospital/${me.hospitalId}`);
                    return;
                }
                // Migrate leftover guest data once
                const guest = takeGuestDataForMigration();
                if (guest?.startDate && guest?.endDate) {
                    await apiFetch('/api/me/schedules', {
                        method: 'POST',
                        body: JSON.stringify({
                            name: guest.name || 'Migrated guest schedule',
                            startDate: guest.startDate,
                            endDate: guest.endDate,
                            staff: guest.staff || [],
                            assignments: guest.assignments || [],
                            holidays: guest.holidays || [],
                        }),
                    }).catch(() => null);
                }
                const list = await apiFetch('/api/me/schedules');
                setSchedules(Array.isArray(list) ? list : []);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [status, router]);

    const createSchedule = async () => {
        setCreating(true);
        setError('');
        try {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const created = await apiFetch('/api/me/schedules', {
                method: 'POST',
                body: JSON.stringify({
                    name: start.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
                    startDate: start.toISOString().slice(0, 10),
                    endDate: end.toISOString().slice(0, 10),
                    staff: [],
                    assignments: [],
                }),
            });
            setSchedules((prev) => [created, ...prev]);
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const upgrade = async () => {
        if (!hospitalName.trim()) return;
        setCreating(true);
        setError('');
        try {
            const data = await apiFetch('/api/auth/upgrade-to-enterprise', {
                method: 'POST',
                body: JSON.stringify({
                    hospitalName,
                    hospitalType,
                    hospitalRegion,
                }),
            });
            router.push(`/hospital/${data.hospitalId}/setup`);
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    if (status === 'loading' || loading) {
        return <div className="min-h-screen flex items-center justify-center text-ghs-muted">Loading…</div>;
    }

    return (
        <div className="min-h-screen bg-ghs-surface">
            <nav className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 max-w-5xl mx-auto">
                <Link href="/" className="font-extrabold text-ghs-deep shrink-0">MedRoster</Link>
                <div className="flex items-center gap-2 sm:gap-3 text-sm min-w-0">
                    <span className="text-ghs-muted truncate max-w-[28vw] sm:max-w-xs md:max-w-none">{user?.email || user?.phoneNumber}</span>
                    <button type="button" onClick={() => signOut(auth)} className="font-bold text-ghs-teal shrink-0">Sign out</button>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8">
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-start justify-between gap-4 mb-8">
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-2xl font-extrabold text-ghs-deep">Individual workspace</h1>
                        <p className="text-sm text-ghs-muted mt-1">Monthly schedules · calendar &amp; auto-generate · up to 50 staff · unlimited PDF · saved to your account</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowImport(true)}
                            className="min-h-11 px-4 py-1.5 rounded-xl border text-sm font-bold leading-tight text-left flex-1 sm:flex-none"
                        >
                            <span className="block">Import staff data</span>
                            <span className="block text-[10px] font-medium text-ghs-muted normal-case tracking-normal">Photo, PDF, Word, or Excel</span>
                        </button>
                        <button type="button" onClick={createSchedule} disabled={creating} className="h-11 px-4 rounded-xl bg-ghs-teal text-white text-sm font-bold disabled:opacity-50 flex-1 sm:flex-none">
                            New month schedule
                        </button>
                        <button type="button" onClick={() => setShowUpgrade(true)} className="h-11 px-4 rounded-xl border border-ghs-teal text-ghs-teal text-sm font-bold w-full sm:w-auto">
                            Upgrade to hospital
                        </button>
                    </div>
                </div>

                {error && <div className="mb-4 bg-rose-50 text-rose-600 text-sm font-bold p-3 rounded-xl">{error}</div>}

                <div className="grid gap-4">
                    {schedules.map((s) => (
                        <div key={s._id} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-extrabold text-ghs-deep truncate">{s.name}</div>
                                <div className="text-xs text-ghs-muted mt-1">{s.startDate} → {s.endDate} · {(s.staff || []).length} staff</div>
                            </div>
                            <Link href={`/individual/${s._id}`} className="text-sm font-bold text-ghs-teal shrink-0">Open →</Link>
                        </div>
                    ))}
                    {schedules.length === 0 && (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 sm:p-10 text-center text-ghs-muted text-sm">
                            No schedules yet. Create a month or import staff first.
                        </div>
                    )}
                </div>
            </main>

            {showImport && (
                <ImportStaffModal
                    mode="individual"
                    onClose={() => setShowImport(false)}
                    onImported={async (data) => {
                        if (!data.staff?.length) return;
                        const now = new Date();
                        const fallbackStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        const fallbackEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        const startDate = data.startDate || fallbackStart.toISOString().slice(0, 10);
                        const endDate = data.endDate || fallbackEnd.toISOString().slice(0, 10);
                        const name = data.title
                            || fallbackStart.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
                        let target = schedules[0];
                        if (!target) {
                            target = await apiFetch('/api/me/schedules', {
                                method: 'POST',
                                body: JSON.stringify({
                                    name,
                                    startDate,
                                    endDate,
                                    staff: data.staff,
                                    assignments: data.assignments || [],
                                }),
                            });
                            setSchedules([target]);
                        } else {
                            target = await apiFetch(`/api/me/schedules/${target._id}`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                    name: data.title || target.name,
                                    startDate: data.startDate || target.startDate,
                                    endDate: data.endDate || target.endDate,
                                    staff: [...(target.staff || []), ...data.staff].slice(0, 50),
                                    assignments: [
                                        ...(target.assignments || []),
                                        ...(data.assignments || []),
                                    ],
                                }),
                            });
                            setSchedules((prev) => prev.map((x) => (x._id === target._id ? target : x)));
                        }
                        setShowImport(false);
                        router.push(`/individual/${target._id}`);
                    }}
                />
            )}

            {showUpgrade && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4">
                        <h3 className="font-extrabold text-lg text-ghs-deep">Upgrade to hospital account</h3>
                        <p className="text-xs text-ghs-muted">Creates a hospital with a join code and migrates your schedules.</p>
                        <input className="w-full h-11 rounded-xl border px-3 text-sm" placeholder="Hospital name" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
                        <select className="w-full h-11 rounded-xl border px-3 text-sm" value={hospitalType} onChange={(e) => setHospitalType(e.target.value)}>
                            {HOSPITAL_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        <select className="w-full h-11 rounded-xl border px-3 text-sm" value={hospitalRegion} onChange={(e) => setHospitalRegion(e.target.value)}>
                            {GHANA_REGIONS.map((r) => <option key={r}>{r}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setShowUpgrade(false)} className="flex-1 h-11 rounded-xl border font-bold text-sm">Cancel</button>
                            <button type="button" onClick={upgrade} disabled={creating} className="flex-1 h-11 rounded-xl bg-ghs-teal text-white font-bold text-sm">Upgrade</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
