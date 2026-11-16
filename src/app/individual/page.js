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
    const [note, setNote] = useState('');

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

    const label = user?.displayName || user?.email || user?.phoneNumber || 'Clinician';
    const initials = label.slice(0, 2).toUpperCase();

    return (
        <div className="min-h-screen bg-surface">
            <header className="h-16 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex items-center justify-between px-4 lg:px-8">
                <Link href="/" className="flex items-center gap-2 font-bold text-stitch-primary">
                    <img src="/logo.svg" alt="" className="w-8 h-8" /> MedRoster
                </Link>
                <button type="button" onClick={() => signOut(auth)} className="text-[13px] font-semibold text-emerald-deep cursor-pointer">Sign out</button>
            </header>
            <main className="max-w-6xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-6">
                <section className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-14 rounded-xl bg-emerald-deep text-on-primary font-bold flex items-center justify-center shrink-0">{initials}</div>
                        <div className="min-w-0">
                            <h1 className="landing-title truncate">{label}</h1>
                            <p className="text-sm text-slate-muted">Individual workspace · {schedules.length} schedule{schedules.length === 1 ? '' : 's'}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setShowImport(true)} className="px-4 py-2 rounded-lg bg-surface-container text-[13px] font-semibold cursor-pointer">Import staff</button>
                        <button type="button" onClick={createSchedule} disabled={creating} className="px-4 py-2 rounded-lg bg-emerald-deep text-on-primary text-[13px] font-semibold disabled:opacity-50 cursor-pointer">New month</button>
                        <button type="button" onClick={() => setShowUpgrade(true)} className="px-4 py-2 rounded-lg bg-mint-surface text-emerald-deep text-[13px] font-semibold cursor-pointer">Upgrade to hospital</button>
                    </div>
                </section>
                {note && <p className="text-sm text-forest-mid bg-mint-surface rounded-lg px-3 py-2">{note}</p>}
                {error && <div className="bg-rose-50 text-rose-600 text-sm font-bold p-3 rounded-xl">{error}</div>}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 flex flex-col gap-3">
                        <h2 className="text-base font-bold text-slate-black">Duty schedules</h2>
                        {schedules.map((item) => (
                            <div key={item._id} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="font-semibold text-slate-black">{item.name}</div>
                                    <div className="text-xs text-slate-muted">{item.startDate} → {item.endDate} · {(item.staff || []).length} staff</div>
                                </div>
                                <Link href={`/individual/${item._id}`} className="text-[13px] font-semibold text-emerald-deep">Open</Link>
                            </div>
                        ))}
                        {schedules.length === 0 && (
                            <div className="bg-surface-container-lowest rounded-xl p-8 text-center text-sm text-slate-muted">No schedules yet. Create a month or import staff first.</div>
                        )}
                    </div>
                    <aside className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-3">
                        <h2 className="text-base font-bold text-slate-black">Swap and dispatch</h2>
                        <p className="text-sm text-slate-body">Shift swaps and WhatsApp dispatch are not sent from this workspace.</p>
                        <button type="button" onClick={() => setNote('Swap request noted on this page. No colleague was contacted.')} className="px-4 py-2 rounded-lg bg-surface-container text-left text-[13px] font-semibold cursor-pointer">Request a swap</button>
                        <button type="button" onClick={() => setNote('WhatsApp dispatch was not sent. Use the schedule export when you need a copy.')} className="px-4 py-2 rounded-lg bg-surface-container text-left text-[13px] font-semibold cursor-pointer">WhatsApp duty card</button>
                    </aside>
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
