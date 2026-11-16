'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DepartmentTemplatePicker from '../../../../components/modals/DepartmentTemplatePicker';
import HospitalShell from '../../../../components/hospital/HospitalShell';
import { apiFetch } from '../../../../lib/api';
import { useFirebaseAuth } from '../../../../components/FirebaseAuthProvider';

export default function HospitalSetupPage() {
    const { id } = useParams();
    const router = useRouter();
    const { role, status } = useFirebaseAuth();
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'authenticated' && role === 'staff') {
            router.replace(`/hospital/${id}`);
            return;
        }

        let active = true;
        (async () => {
            try {
                const data = await apiFetch(`/api/hospitals/${id}`);
                if (!active) return;
                setHospital(data);
            } catch {
                router.push('/');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [id, router, role, status]);

    const handleSave = async (departments) => {
        setBusy(true);
        setError('');
        try {
            await apiFetch(`/api/hospitals/${id}/departments`, {
                method: 'POST',
                body: JSON.stringify({ departments }),
            });
            router.push(`/hospital/${id}`);
        } catch (err) {
            setError(err.message || 'Network error');
        } finally {
            setBusy(false);
        }
    };

    if (loading || status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-synclly-surface">
                <div className="w-12 h-12 border-4 border-white border-t-synclly-coral rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!hospital) return null;

    return (
        <HospitalShell hospital={hospital} active="setup" breadcrumb={['Facility setup']}>
            <div className="max-w-4xl flex flex-col gap-6">
                <div>
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-forest-mid">Institutional onboarding</p>
                    <h1 className="landing-headline">Facility setup</h1>
                    <p className="text-sm text-slate-body mt-1">
                        {hospital.name} · {hospital.type} · {hospital.region}. Choose the wards for this facility. Labour Act 651 rest rules stay on each ward schedule.
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        ['1', 'Facility', hospital.name],
                        ['2', 'Wards', 'Pick departments below'],
                        ['3', 'Act 651', 'Applied when you roster'],
                    ].map(([num, title, body]) => (
                        <div key={num} className="bg-surface-container-lowest rounded-xl p-4 shadow-sm">
                            <span className="text-[11px] font-bold text-emerald-deep">{num}</span>
                            <div className="font-semibold text-slate-black">{title}</div>
                            <p className="text-xs text-slate-muted mt-1">{body}</p>
                        </div>
                    ))}
                </div>
                {(hospital.departments || []).length > 0 ? (
                    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm">
                        <p className="text-sm text-slate-body">Wards are already configured for this hospital.</p>
                        <button type="button" onClick={() => router.push(`/hospital/${id}`)} className="mt-3 px-4 py-2 rounded-lg bg-emerald-deep text-on-primary text-[13px] font-semibold cursor-pointer">
                            Back to overview
                        </button>
                    </div>
                ) : (
                    <DepartmentTemplatePicker
                        onSave={handleSave}
                        onSkip={() => router.push(`/hospital/${id}`)}
                        busy={busy}
                        error={error}
                    />
                )}
            </div>
        </HospitalShell>
    );
}
