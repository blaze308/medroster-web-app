'use client';

import { classifyStaffType } from '../../lib/staff-utils';
import { preferredSourceCode } from '../../lib/roster-setup';

function shiftDisplayLabel(st, legend) {
    const code = preferredSourceCode(st.name, legend);
    const friendly = st.name === 'Office' ? 'Clinic / OPD' : st.name;
    const times = st.startTime && st.endTime ? `${st.startTime} – ${st.endTime}` : '';
    const hasWardCode = code && code !== st.name && !(st.name === 'Office' && code === 'OFC');
    if (hasWardCode || st.name === 'Office') {
        return {
            primary: code || (st.name === 'Office' ? 'OFC' : friendly),
            secondary: [friendly, times].filter(Boolean).join(' · '),
        };
    }
    return { primary: code || friendly, secondary: times };
}

export default function ShiftPicker({
    staff,
    date,
    shiftTypes,
    currentShiftTypeId,
    onAssign,
    onClose,
    rosterSetup = null,
}) {
    const dateStr = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const staffType = staff.staffType || classifyStaffType(staff.rank);
    const restrictNight = staffType === 'senior' || staffType === 'pno';
    const legend = Array.isArray(rosterSetup?.legend) ? rosterSetup.legend : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-synclly-lg border border-slate-50 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                <div className="p-8">
                    <p className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest mb-2">{dateStr}</p>
                    <h2 className="text-2xl font-extrabold text-synclly-deep tracking-tight mb-1">{staff.firstName} {staff.lastName}</h2>
                    <p className="text-synclly-muted font-medium text-sm mb-6">{staff.rank || staff.category}</p>

                    {restrictNight && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-xs font-bold text-amber-700 mb-4 flex items-start gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            Night shifts disabled — senior staff cannot work nights.
                        </div>
                    )}

                    <div className="space-y-2">
                        {shiftTypes.map((st) => {
                            const disabled = restrictNight && st.name === 'Night';
                            const active = String(st._id) === String(currentShiftTypeId);
                            const label = shiftDisplayLabel(st, legend);
                            return (
                                <button
                                    key={st._id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onAssign(st._id)}
                                    className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                        disabled
                                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                            : active
                                            ? 'bg-synclly-coral/5 border-synclly-coral'
                                            : 'bg-synclly-surface border-slate-100 hover:border-synclly-coral/40 hover:bg-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`shift-block ${st.color}`}>{label.primary}</span>
                                        <span className="text-xs font-bold text-synclly-muted">
                                            {label.secondary || `${st.startTime} – ${st.endTime}`}
                                        </span>
                                    </div>
                                    {active && (
                                        <span className="w-5 h-5 rounded-full bg-synclly-coral text-white flex items-center justify-center">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-2xl bg-white border border-slate-200 text-synclly-muted font-bold text-sm hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        {currentShiftTypeId && (
                            <button
                                type="button"
                                onClick={() => onAssign(null)}
                                className="flex-1 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 font-bold text-sm hover:bg-rose-100"
                            >
                                Clear Shift
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
