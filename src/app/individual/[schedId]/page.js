'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '../../../lib/api';
import { exportRosterPdf } from '../../../lib/pdf-export';
import { useFirebaseAuth } from '../../../components/FirebaseAuthProvider';
import SandboxScheduleShell from '../../../components/schedule/SandboxScheduleShell';

export default function IndividualSchedulePage() {
    const { schedId } = useParams();
    const router = useRouter();
    const { status } = useFirebaseAuth();
    const [schedule, setSchedule] = useState(null);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const data = await apiFetch(`/api/me/schedules/${schedId}`);
            setSchedule({
                ...data,
                wardName: data.wardName || data.name || 'Roster',
                staff: data.staff || [],
                assignments: data.assignments || [],
                holidays: data.holidays || [],
            });
        } catch (e) {
            setError(e.message);
        }
    }, [schedId]);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/auth/signin');
        if (status !== 'authenticated') return;
        load();
    }, [status, schedId, router, load]);

    const persist = async (next) => {
        setSchedule(next);
        setSaving(true);
        setError('');
        try {
            const updated = await apiFetch(`/api/me/schedules/${schedId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: next.name || next.wardName,
                    startDate: next.startDate,
                    endDate: next.endDate,
                    staff: next.staff || [],
                    assignments: next.assignments || [],
                    holidays: next.holidays || [],
                }),
            });
            setSchedule({
                ...updated,
                wardName: updated.wardName || updated.name || next.wardName,
                staff: updated.staff || [],
                assignments: updated.assignments || [],
                holidays: updated.holidays || [],
            });
        } catch (e) {
            setError(e.message || 'Could not save');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        if (!schedule) return;
        setExporting(true);
        try {
            await exportRosterPdf({
                schedule,
                hospital: { name: 'Individual account' },
                ward: { name: schedule.wardName || schedule.name || 'Roster' },
                staff: schedule.staff || [],
                assignments: schedule.assignments || [],
            });
        } finally {
            setExporting(false);
        }
    };

    if (!schedule && !error) {
        return <div className="min-h-screen flex items-center justify-center text-ghs-muted">Loading…</div>;
    }

    if (error && !schedule) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3">
                <p className="text-rose-600 text-sm font-bold">{error}</p>
                <button type="button" onClick={() => router.push('/individual')} className="text-sm font-bold text-ghs-teal">
                    Back to schedules
                </button>
            </div>
        );
    }

    return (
        <>
            {error && (
                <div className="bg-rose-50 border-b border-rose-100 px-4 py-2 text-xs font-bold text-rose-600 text-center">
                    {error}
                </div>
            )}
            {saving && (
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-1.5 text-[10px] font-bold text-ghs-muted uppercase tracking-widest text-center">
                    Saving to your account…
                </div>
            )}
            <SandboxScheduleShell
                mode="individual"
                schedule={schedule}
                onChange={persist}
                maxStaff={50}
                title={schedule.name || schedule.wardName || 'Roster'}
                subtitle="Saved to your account · import, calendar, and auto-generate"
                backHref="/individual"
                backLabel="← Schedules"
                onExportPdf={handleExport}
                exporting={exporting}
            />
        </>
    );
}
