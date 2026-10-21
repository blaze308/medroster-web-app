'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    getGuestSchedule,
    saveGuestSchedule,
    getGuestExportsRemaining,
    consumeGuestExport,
    getGuestExportLimit,
} from '../../lib/guest-storage';
import SandboxScheduleShell from '../../components/schedule/SandboxScheduleShell';
import ConfirmModal from '../../components/modals/ConfirmModal';
import { exportRosterPdf } from '../../lib/pdf-export';
import { isGuestOnlyTesting } from '../../lib/guest-only-testing';
import { exportRosterCsv, exportRosterExcel } from '../../lib/spreadsheet-export';

function defaultMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        name: start.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
    };
}

export default function GuestPage() {
    const defaults = useMemo(() => defaultMonthRange(), []);
    // SSR-safe defaults only — localStorage is applied after mount to avoid hydration mismatch
    const [schedule, setSchedule] = useState(() => ({
        ...defaults,
        staff: [],
        assignments: [],
        holidays: [],
        wardName: 'My Ward',
    }));
    const [exportsLeft, setExportsLeft] = useState(getGuestExportLimit());
    const [hydrated, setHydrated] = useState(false);
    const [banner, setBanner] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [exportLimitModal, setExportLimitModal] = useState(false);

    useEffect(() => {
        const saved = getGuestSchedule();
        if (saved) setSchedule(saved);
        setExportsLeft(getGuestExportsRemaining());
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        saveGuestSchedule(schedule);
    }, [schedule, hydrated]);

    const handleExport = async (format = 'pdf') => {
        if (exportsLeft <= 0 || !consumeGuestExport()) {
            setExportLimitModal(true);
            return;
        }
        setExportsLeft(getGuestExportsRemaining());
        setExporting(true);
        const payload = {
            schedule: {
                startDate: schedule.startDate,
                endDate: schedule.endDate,
                holidays: schedule.holidays || [],
            },
            hospital: { name: 'Guest roster (not saved to cloud)' },
            ward: { name: schedule.wardName || schedule.name || 'WARD' },
            department: null,
            staff: schedule.staff,
            assignments: schedule.assignments || [],
        };
        try {
            if (format === 'excel') await exportRosterExcel(payload);
            else if (format === 'csv') exportRosterCsv(payload);
            else await exportRosterPdf(payload);
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            <SandboxScheduleShell
                mode="guest"
                schedule={schedule}
                onChange={setSchedule}
                maxStaff={Infinity}
                title="Guest roster"
                subtitle={`Max 1 month · ${exportsLeft}/${getGuestExportLimit()} exports left · saved only in this browser`}
                backHref="/"
                backLabel="← Home"
                onExport={handleExport}
                exporting={exporting}
                banner={banner ? (
                    <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                            {isGuestOnlyTesting()
                                ? 'Guest mode — data stays in this browser only. Use this build to test import, edits, and export.'
                                : 'Guest mode — everything works here, but data stays in this browser only. Register to save it to your account.'}
                        </span>
                        <div className="flex gap-2">
                            {!isGuestOnlyTesting() && (
                                <Link href="/auth/register" className="px-3 py-1.5 rounded-lg bg-ghs-teal text-white text-xs font-bold">
                                    Register to save
                                </Link>
                            )}
                            <button type="button" onClick={() => setBanner(false)} className="text-xs font-bold text-amber-800">Dismiss</button>
                        </div>
                    </div>
                ) : null}
            />
            {exportLimitModal && (
                <ConfirmModal
                    title="Export limit reached"
                    message={
                        isGuestOnlyTesting()
                            ? `Guest mode allows ${getGuestExportLimit()} exports in this tester build.`
                            : `Guest mode allows ${getGuestExportLimit()} PDF exports. Register for unlimited exports and cloud save.`
                    }
                    confirmLabel="Got it"
                    infoOnly
                    onClose={() => setExportLimitModal(false)}
                    onConfirm={() => setExportLimitModal(false)}
                />
            )}
        </>
    );
}
