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
import { exportRosterPdf } from '../../lib/pdf-export';

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
    const [schedule, setSchedule] = useState(() => getGuestSchedule() || {
        ...defaults,
        staff: [],
        assignments: [],
        holidays: [],
        wardName: 'My Ward',
    });
    const [exportsLeft, setExportsLeft] = useState(getGuestExportsRemaining());
    const [banner, setBanner] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        saveGuestSchedule(schedule);
    }, [schedule]);

    const handleExport = async () => {
        if (exportsLeft <= 0) {
            alert('Guest export limit reached (5). Register for unlimited PDF exports.');
            return;
        }
        if (!consumeGuestExport()) {
            alert('Guest export limit reached. Register for unlimited PDF exports.');
            return;
        }
        setExportsLeft(getGuestExportsRemaining());
        setExporting(true);
        try {
            await exportRosterPdf({
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
            });
        } finally {
            setExporting(false);
        }
    };

    return (
        <SandboxScheduleShell
            mode="guest"
            schedule={schedule}
            onChange={setSchedule}
            maxStaff={20}
            title="Guest roster"
            subtitle={`Max 1 month · ${exportsLeft}/${getGuestExportLimit()} PDF exports left · saved only in this browser`}
            backHref="/"
            backLabel="← Home"
            onExportPdf={handleExport}
            exporting={exporting}
            banner={banner ? (
                <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                        Guest mode — everything works here, but data stays in this browser only. Register to save it to your account.
                    </span>
                    <div className="flex gap-2">
                        <Link href="/auth/register" className="px-3 py-1.5 rounded-lg bg-ghs-teal text-white text-xs font-bold">
                            Register to save
                        </Link>
                        <button type="button" onClick={() => setBanner(false)} className="text-xs font-bold text-amber-800">Dismiss</button>
                    </div>
                </div>
            ) : null}
        />
    );
}
