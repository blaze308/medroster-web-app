'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { markGuestHintShown, shouldShowGuestHint } from '../../lib/guest-hint-toast';
import { exportRosterCsv, exportRosterExcel } from '../../lib/spreadsheet-export';

const GUEST_HINT_MS = 6500;

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
    const [guestHint, setGuestHint] = useState(false);
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

    useEffect(() => {
        if (!hydrated) return;
        if (!shouldShowGuestHint()) return;
        setGuestHint(true);
        markGuestHintShown();
        const t = setTimeout(() => setGuestHint(false), GUEST_HINT_MS);
        return () => clearTimeout(t);
    }, [hydrated]);

    const guestHintMessage = isGuestOnlyTesting()
        ? 'Guest mode — data stays in this browser only. Use this build to test import, edits, and export.'
        : 'Guest mode — everything works here, but data stays in this browser only. Register to save to your account.';

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
            {guestHint && (
                <div
                    className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-[60] sm:max-w-sm pointer-events-none"
                    role="status"
                    aria-live="polite"
                >
                    <div className="mr-pop-in pointer-events-auto flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/95 px-4 py-3 shadow-synclly-lg backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" aria-hidden />
                        <div className="min-w-0 flex-1 text-left">
                            <p className="text-sm font-extrabold text-amber-950">Guest mode</p>
                            <p className="text-[11px] font-medium text-amber-900/90 leading-snug mt-0.5">{guestHintMessage}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setGuestHint(false)}
                            className="shrink-0 text-[11px] font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
                            aria-label="Dismiss"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
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
