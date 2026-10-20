'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';

const TYPE_LABEL = {
    leave_conflict: 'Leave',
    role_shift_incompatible: 'Role',
    work_restriction: 'Restriction',
    supervisory_coverage: 'Coverage',
    max_hours: 'Hours',
    daily_rest: 'Rest',
    weekly_rest: 'Rest',
    off_day_target: 'Off days',
    consecutive_days: 'Consecutive',
    consecutive_nights: 'Nights',
};

function groupIssues(items = []) {
    const groups = new Map();
    for (const item of items) {
        let key;
        let title;
        if (item.type === 'leave_conflict') {
            key = `leave:${item.staffId || item.staffName}`;
            title = item.staffName || 'Someone';
        } else if (item.type === 'supervisory_coverage') {
            key = `coverage:${item.shift || 'any'}`;
            title = `Shifts missing senior / in-charge${item.shift ? ` (${item.shift})` : ''}`;
        } else if (
            item.type === 'max_hours' ||
            item.type === 'off_day_target' ||
            item.type === 'daily_rest' ||
            item.type === 'weekly_rest' ||
            item.type === 'consecutive_days' ||
            item.type === 'consecutive_nights'
        ) {
            key = `${item.type}:${item.staffId || item.message}`;
            title = item.staffName ? `${item.staffName} — ${item.message}` : item.message;
        } else {
            key = `${item.type}:${item.staffId || item.message}:${item.date || ''}`;
            title = item.message;
        }
        if (!groups.has(key)) groups.set(key, { key, type: item.type, title, count: 0, dates: [], message: item.message, shift: item.shift });
        const group = groups.get(key);
        group.count += 1;
        if (item.date) group.dates.push(item.date);
    }
    return [...groups.values()].map((group) => {
        if (group.type === 'leave_conflict') {
            group.title = group.message.replace(/ is on leave$/, '') + ` — ${group.count} shift${group.count === 1 ? '' : 's'} while on leave`;
        }
        if (group.type === 'supervisory_coverage') {
            const shiftLabel = group.shift ? ` on ${group.shift}` : '';
            group.title = `${group.count} shift${group.count === 1 ? '' : 's'} with no senior / in-charge${shiftLabel} (guideline)`;
            group.detail = group.dates
                .map((d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))
                .join(', ');
        }
        return group;
    });
}

export default function ValidationPanel({ hospitalId, scheduleId, dataVersion }) {
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [open, setOpen] = useState(false);

    const validate = useCallback(async () => {
        setBusy(true);
        try {
            const next = await apiFetch(`/api/hospitals/${hospitalId}/schedules/${scheduleId}/validate`, { method: 'POST' });
            setResult(next);
        } catch {
            // Silently ignore — panel simply won't update
        } finally {
            setBusy(false);
        }
    }, [hospitalId, scheduleId]);

    useEffect(() => {
        validate();
    }, [validate, dataVersion]);

    const errorGroups = useMemo(() => groupIssues(result?.errors), [result]);
    const warningGroups = useMemo(() => groupIssues(result?.warnings), [result]);

    if (!result) return null;

    const errorCount = result.summary?.totalErrors || 0;
    const warningCount = result.summary?.totalWarnings || 0;
    const isValid = errorCount === 0;
    const hasWarningsOnly = isValid && warningCount > 0;

    return (
        <div className="fixed inset-x-0 bottom-0 z-40 w-full md:inset-x-auto md:bottom-6 md:right-6 md:w-[360px] md:max-w-[calc(100vw-3rem)]">
            <div className={`bg-white rounded-t-2xl md:rounded-[24px] border border-b-0 md:border-b shadow-synclly-lg overflow-hidden transition-all ${
                !isValid ? 'border-rose-100' : hasWarningsOnly ? 'border-amber-100' : 'border-emerald-100'
            }`}>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="w-full p-4 md:p-5 flex items-center justify-between gap-3 hover:bg-slate-50/50"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            !isValid
                                ? 'bg-rose-50 text-rose-500'
                                : hasWarningsOnly
                                    ? 'bg-amber-50 text-amber-600'
                                    : 'bg-emerald-50 text-emerald-500'
                        }`}>
                            {isValid ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            )}
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-extrabold text-synclly-deep">
                                {!isValid
                                    ? `${errorGroups.length} ${errorGroups.length === 1 ? 'issue' : 'issues'}`
                                    : hasWarningsOnly
                                        ? 'Guidelines to review'
                                        : 'Schedule valid'}
                            </p>
                            <p className="text-[11px] font-bold text-synclly-muted uppercase tracking-wider">
                                {warningCount > 0 ? `${warningGroups.length} warning${warningGroups.length === 1 ? '' : 's'}` : 'Real-time check'}
                            </p>
                        </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`text-synclly-muted transition-transform ${open ? 'rotate-180' : ''}`}>
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>

                {open && (errorGroups.length > 0 || warningGroups.length > 0) && (
                    <div className="border-t border-slate-100 max-h-[40vh] md:max-h-72 overflow-y-auto">
                        {errorGroups.map((g) => (
                            <div key={`e${g.key}`} className="px-4 md:px-5 py-3 border-b border-slate-50 last:border-0">
                                <div className="flex items-start gap-2">
                                    <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 shrink-0 mt-0.5">
                                        {TYPE_LABEL[g.type] || g.type}
                                    </span>
                                    <div>
                                        <p className="text-xs font-bold text-synclly-deep leading-snug">{g.title}</p>
                                        {g.detail && <p className="text-[11px] font-medium text-synclly-muted mt-1 leading-snug">{g.detail}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {warningGroups.map((g) => (
                            <div key={`w${g.key}`} className="px-4 md:px-5 py-3 border-b border-slate-50 last:border-0">
                                <div className="flex items-start gap-2">
                                    <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 shrink-0 mt-0.5">
                                        {TYPE_LABEL[g.type] || g.type}
                                    </span>
                                    <p className="text-xs font-bold text-synclly-deep leading-snug">{g.title}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={validate}
                    disabled={busy}
                    className="w-full py-2.5 text-[10px] font-bold text-synclly-muted uppercase tracking-widest border-t border-slate-50 hover:bg-slate-50/50 disabled:opacity-50"
                >
                    {busy ? 'Validating...' : 'Re-validate'}
                </button>
            </div>
        </div>
    );
}
