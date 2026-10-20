'use client';

import { useMemo } from 'react';
import { isStaffOnLeave, isStaffOnLeaveForRoster, classifyStaffType } from '../../lib/staff-utils';
import { preferredSourceCode } from '../../lib/roster-setup';
import { displayCodeForAssignment } from '../../lib/roster-export-data';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Map leave type to short badge text shown inside grayed-out cells
const LEAVE_ABBR = {
    Annual: 'ANN',
    Sick: 'SICK',
    Maternity: 'MAT',
    Paternity: 'PAT',
    Part: 'PART',
    Study: 'STD',
    Compassionate: 'CMP',
    Casual: 'CAS',
    Unpaid: 'UNP',
};

function buildCycle(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const days = [];
    const cur = new Date(start);
    while (cur <= end) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

// Find which leave record covers a given date (returns the first matching one)
function getLeaveRecord(staff, date) {
    if (!staff?.leaveRecords?.length) return null;
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return staff.leaveRecords.find((leave) => {
        if (leave.status && leave.status !== 'Approved') return false;
        const start = new Date(leave.startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(leave.endDate);
        end.setHours(23, 59, 59, 999);
        return checkDate >= start && checkDate <= end;
    }) || null;
}

export default function CalendarGrid({
    startDate,
    endDate,
    holidays = [],
    staff,
    assignments,
    onCellClick,
    rosterSetup = null,
}) {
    const days = useMemo(() => buildCycle(startDate, endDate), [startDate, endDate]);
    const legend = Array.isArray(rosterSetup?.legend) ? rosterSetup.legend : [];

    const holidayLookup = useMemo(
        () => new Map(
            holidays.map((h) => {
                const key = new Date(h.date || h).toISOString().split('T')[0];
                return [key, h.name || 'Holiday'];
            })
        ),
        [holidays]
    );

    const assignmentLookup = useMemo(() => {
        const map = new Map();
        for (const a of assignments) {
            const key = `${String(a.staffId)}_${new Date(a.date).toISOString().split('T')[0]}`;
            map.set(key, a);
        }
        return map;
    }, [assignments]);

    // Per-day coverage counts using ward codes when available
    const coverageCounts = useMemo(() => {
        const shiftNames = new Set();
        const counts = new Map(); // dateKey → { label: count }
        for (const a of assignments) {
            const label = displayCodeForAssignment(a, legend)
                || preferredSourceCode(a.shiftType?.name, legend)
                || a.shiftType?.name
                || 'Unknown';
            shiftNames.add(label);
            const dateKey = new Date(a.date).toISOString().split('T')[0];
            if (!counts.has(dateKey)) counts.set(dateKey, {});
            const entry = counts.get(dateKey);
            entry[label] = (entry[label] || 0) + 1;
        }
        return { counts, shiftNames: [...shiftNames].slice(0, 6) };
    }, [assignments, legend]);

    // On-duty first (regular, then rotation); full-cycle leave staff at the bottom
    const { regularStaff, rotationStaff, leaveStaff } = useMemo(() => {
        const leave = staff.filter((s) => isStaffOnLeaveForRoster(s, startDate, endDate));
        const leaveIds = new Set(leave.map((s) => String(s._id)));
        const onDuty = staff.filter((s) => !leaveIds.has(String(s._id)));
        return {
            regularStaff: onDuty.filter((s) => !s.isRotation),
            rotationStaff: onDuty.filter((s) => s.isRotation),
            leaveStaff: leave,
        };
    }, [staff, startDate, endDate]);

    if (staff.length === 0) {
        return (
            <div className="bg-white rounded-2xl md:rounded-[32px] border border-slate-100 p-8 md:p-16 text-center shadow-synclly">
                <h3 className="text-lg font-extrabold text-ghs-deep mb-1">No staff in this view</h3>
                <p className="text-ghs-muted font-medium text-sm">
                    Add or import staff to start scheduling.
                </p>
            </div>
        );
    }

    const renderStaffRows = (staffList, startNo = 1) => staffList.map((s, idx) => {
        const type = s.staffType || classifyStaffType(s.rank);
        const initials = `${s.firstName?.[0] || ''}${s.lastName?.[0] || ''}`.toUpperCase();
        const rowNo = startNo + idx;

        return (
            <tr key={s._id} className="border-t border-slate-50 hover:bg-ghs-surface/40 transition-colors">
                {/* Row number */}
                <td className="p-1.5 md:p-2 text-center text-[10px] md:text-[11px] font-bold text-ghs-muted sticky left-0 bg-white z-10 w-7 md:w-9 border-r border-slate-50">
                    {rowNo}
                </td>
                {/* Staff name + rank */}
                <td className="p-2 md:p-3 sticky left-7 md:left-9 bg-white z-10 border-r border-slate-50 min-w-[140px] md:min-w-[220px]">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className={`hidden md:flex w-9 h-9 rounded-xl items-center justify-center font-extrabold text-xs shrink-0 ${
                            s.isRotation ? 'bg-amber-50 text-amber-600' : 'bg-ghs-teal-light text-ghs-teal'
                        }`}>
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs md:text-sm font-extrabold text-ghs-deep truncate">{s.firstName} {s.lastName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[9px] md:text-[10px] text-ghs-muted font-bold uppercase tracking-wider truncate">
                                    {s.rank || s.category}
                                </span>
                                {type === 'pno' && (
                                    <span className="text-[8px] font-extrabold uppercase tracking-widest px-1 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100">PNO+</span>
                                )}
                                {type === 'senior' && (
                                    <span className="text-[8px] font-extrabold uppercase tracking-widest px-1 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">SR</span>
                                )}
                                {s.isRotation && (
                                    <span className="text-[8px] font-extrabold uppercase tracking-widest px-1 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">ROT</span>
                                )}
                            </div>
                        </div>
                    </div>
                </td>
                {/* Day cells */}
                {days.map((d, i) => {
                    const dateKey = d.toISOString().split('T')[0];
                    const isHoliday = holidayLookup.has(dateKey);
                    const onLeave = isStaffOnLeave(s, d);
                    const leaveRecord = onLeave ? getLeaveRecord(s, d) : null;
                    const leaveAbbr = leaveRecord ? (LEAVE_ABBR[leaveRecord.leaveType] || leaveRecord.leaveType?.substring(0, 3).toUpperCase() || 'LV') : null;
                    const key = `${s._id}_${dateKey}`;
                    const a = assignmentLookup.get(key);

                    return (
                        <td key={i} className="p-1 md:p-1.5">
                            <button
                                type="button"
                                disabled={onLeave}
                                onClick={() => onCellClick(s, d)}
                                className={`w-full h-10 md:h-12 rounded-lg md:rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                    (isHoliday || a?.shiftType?.name === 'Holiday') && !onLeave && (!a || a.shiftType?.name === 'Holiday')
                                        ? 'bg-ghs-gold-light border-[#E8C97A] hover:border-ghs-gold'
                                        : onLeave
                                        ? 'bg-slate-50 border-slate-100 cursor-not-allowed'
                                        : a?.shiftType?.name === 'Off'
                                        ? 'bg-rose-50/60 border-rose-100 hover:border-rose-200'
                                        : a
                                        ? 'bg-white border-slate-100 hover:border-ghs-teal hover:shadow-sm'
                                        : 'bg-ghs-surface border-transparent hover:border-ghs-teal/30 hover:bg-white'
                                }`}
                                title={
                                    a?.shiftType?.name === 'Holiday' || isHoliday
                                        ? (holidayLookup.get(dateKey) || 'Holiday')
                                        : onLeave
                                            ? `On Leave${leaveAbbr ? ` (${leaveAbbr})` : ''}`
                                            : a?.shiftType?.name === 'Off'
                                                ? 'Off'
                                                : undefined
                                }
                            >
                                {onLeave ? (
                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">
                                        {leaveAbbr || 'LV'}
                                    </span>
                                ) : a?.shiftType?.name === 'Holiday' || (isHoliday && !a) ? (
                                    <span className="text-[10px] font-extrabold text-ghs-gold uppercase tracking-wide">
                                        {a ? (displayCodeForAssignment(a, legend) || 'H') : 'H'}
                                    </span>
                                ) : a?.shiftType?.name === 'Off' ? (
                                    <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wide">
                                        {displayCodeForAssignment(a, legend) || 'O'}
                                    </span>
                                ) : a ? (
                                    <span
                                        className={`shift-block ${a.shiftType?.color || ''} text-[10px]! px-2! py-0.5!`}
                                        title={a.shiftType?.name || ''}
                                    >
                                        {displayCodeForAssignment(a, legend)
                                            || preferredSourceCode(a.shiftType?.name, legend)
                                            || a.shiftType?.name}
                                    </span>
                                ) : (
                                    <span className="text-slate-300 text-sm">+</span>
                                )}
                            </button>
                        </td>
                    );
                })}
            </tr>
        );
    });

    return (
        <div className="bg-white rounded-2xl md:rounded-[32px] border border-slate-100 shadow-synclly overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-ghs-surface">
                            {/* No. column */}
                            <th className="p-2 md:p-3 text-[9px] md:text-[10px] font-bold text-ghs-muted uppercase tracking-widest sticky left-0 bg-ghs-surface z-10 w-7 md:w-9 text-center border-r border-slate-100">
                                No.
                            </th>
                            {/* Staff name column */}
                            <th className="text-left p-2 md:p-3 text-[9px] md:text-[10px] font-bold text-ghs-muted uppercase tracking-widest sticky left-7 md:left-9 bg-ghs-surface z-10 min-w-[140px] md:min-w-[220px] border-r border-slate-100">
                                Staff
                            </th>
                            {days.map((d, i) => {
                                const key = d.toISOString().split('T')[0];
                                const isHoliday = holidayLookup.has(key);
                                const holidayName = holidayLookup.get(key);
                                const isSunday = d.getDay() === 0;
                                const isSaturday = d.getDay() === 6;
                                return (
                                    <th key={i} className={`p-1.5 md:p-2 min-w-[40px] md:min-w-[56px] ${isHoliday ? 'bg-ghs-gold-light' : ''}`}>
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className={`text-[8px] md:text-[9px] font-bold uppercase tracking-widest ${isSunday || isSaturday ? 'text-rose-400' : 'text-ghs-muted'}`}>
                                                {DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                                            </span>
                                            <span className={`text-xs md:text-sm font-extrabold ${isHoliday ? 'text-ghs-gold' : 'text-ghs-deep'}`}>{d.getDate()}</span>
                                            {isHoliday && (
                                                <span className="text-[7px] font-extrabold text-ghs-gold uppercase tracking-wide truncate max-w-[36px] md:max-w-[48px]" title={holidayName}>H</span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {renderStaffRows(regularStaff, 1)}

                        {/* Rotation staff divider */}
                        {rotationStaff.length > 0 && (
                            <>
                                <tr>
                                    <td colSpan={days.length + 2} className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                                        <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest">Rotation / Seconded Staff</span>
                                    </td>
                                </tr>
                                {renderStaffRows(rotationStaff, regularStaff.length + 1)}
                            </>
                        )}

                        {/* Leave block — blank spacer then label, keeps duty rows compact */}
                        {leaveStaff.length > 0 && (
                            <>
                                <tr aria-hidden="true">
                                    <td colSpan={days.length + 2} className="h-3 bg-white border-0 p-0" />
                                </tr>
                                <tr>
                                    <td colSpan={days.length + 2} className="px-4 py-2 bg-slate-100 border-t border-slate-200">
                                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">On leave</span>
                                    </td>
                                </tr>
                                {renderStaffRows(leaveStaff, regularStaff.length + rotationStaff.length + 1)}
                            </>
                        )}

                        {/* Coverage summary footer */}
                        {coverageCounts.shiftNames.length > 0 && (
                            <tr className="border-t-2 border-slate-200 bg-ghs-surface">
                                <td className="p-1.5 md:p-2 sticky left-0 bg-ghs-surface z-10 border-r border-slate-100 w-7 md:w-9" />
                                <td className="p-2 md:p-3 sticky left-7 md:left-9 bg-ghs-surface z-10 border-r border-slate-100 min-w-[140px] md:min-w-[220px]">
                                    <div className="space-y-0.5">
                                        {coverageCounts.shiftNames.map((name) => (
                                            <div key={name} className="flex items-center gap-1.5">
                                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                                    /^(M|XM|PM|Morning)$/i.test(name) ? 'bg-[#FFF1E6] text-[#C86A00]' :
                                                    /^(A|XA|PA|Afternoon)$/i.test(name) ? 'bg-[#E0F2FE] text-[#0369A1]' :
                                                    /^(N|XN|PN|Night)$/i.test(name) ? 'bg-[#EDE9FE] text-[#6D28D9]' :
                                                    /^(P|OFC|OFFICE|Office)$/i.test(name) ? 'bg-emerald-50 text-emerald-700' :
                                                    'bg-ghs-teal-light text-ghs-teal'
                                                }`}>{String(name).slice(0, 3)}</span>
                                                <span className="text-[9px] md:text-[10px] text-ghs-muted font-bold truncate">{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                {days.map((d, i) => {
                                    const dateKey = d.toISOString().split('T')[0];
                                    const dayCounts = coverageCounts.counts.get(dateKey) || {};
                                    return (
                                        <td key={i} className="p-1 md:p-1.5 text-center min-w-[40px] md:min-w-[56px]">
                                            <div className="space-y-0.5">
                                                {coverageCounts.shiftNames.map((name) => (
                                                    <div key={name} className={`text-[10px] md:text-[11px] font-extrabold rounded px-0.5 md:px-1 ${
                                                        dayCounts[name]
                                                            ? /^(M|XM|PM|Morning)$/i.test(name) ? 'text-[#C86A00]' :
                                                              /^(A|XA|PA|Afternoon)$/i.test(name) ? 'text-[#0369A1]' :
                                                              /^(N|XN|PN|Night)$/i.test(name) ? 'text-[#6D28D9]' :
                                                              /^(P|OFC|OFFICE|Office)$/i.test(name) ? 'text-emerald-700' :
                                                              'text-ghs-teal'
                                                            : 'text-slate-300'
                                                    }`}>
                                                        {dayCounts[name] || 0}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
