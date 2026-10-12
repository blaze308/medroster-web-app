import { DEFAULT_SHIFT_TYPES, getDefaultHospitalSettings } from './ghana-data';
import { classifyStaffType } from './staff-utils';

/** Shift types with ids for ShiftPicker / local assign. */
export function sandboxShiftTypes() {
    return DEFAULT_SHIFT_TYPES.map((st) => {
        const id = st.name.toLowerCase();
        return { ...st, id, _id: id };
    });
}

export function sandboxSettings() {
    return getDefaultHospitalSettings();
}

const CODE_TO_SHIFT = {
    M: 'Morning',
    A: 'Afternoon',
    N: 'Night',
    SOD: 'SOD',
    OFC: 'Office',
    OFFICE: 'Office',
    XM: 'Morning',
    XA: 'Afternoon',
    XN: 'Night',
    PM: 'Morning',
    PA: 'Afternoon',
    PN: 'Night',
};

export function shiftTypeFromCode(shiftTypes, code) {
    const raw = String(code || '').trim();
    const upper = raw.toUpperCase();
    const byName = (shiftTypes || []).find(
        (st) => st.name === raw || st.name.toLowerCase() === raw.toLowerCase()
    );
    if (byName) return byName;
    const mapped = CODE_TO_SHIFT[upper];
    if (!mapped) return null;
    return (shiftTypes || []).find((st) => st.name === mapped) || null;
}

function dateKey(d) {
    return new Date(d).toISOString().split('T')[0];
}

function buildDays(startDate, endDate) {
    const days = [];
    const cur = new Date(startDate);
    const end = new Date(endDate);
    cur.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    while (cur <= end) {
        days.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

function isSupervisory(staff) {
    const type = staff.staffType || classifyStaffType(staff.rank);
    const role = staff.wardRole;
    return type === 'senior' || type === 'pno' || role === 'incharge' || role === 'assistant' || role === 'shift_incharge';
}

/**
 * Map imported roster preview rows (with cells/assignments) into calendar assignments.
 * Staff rows must already have stable `_id`s.
 */
export function mapPreviewToAssignments(staffRows, shiftTypes = sandboxShiftTypes()) {
    const assignments = [];
    for (const row of staffRows || []) {
        const staffId = row._id;
        if (!staffId) continue;
        const fromAssignments = Array.isArray(row.assignments) ? row.assignments : [];
        const fromCells = (row.cells || [])
            .filter((c) => CODE_TO_SHIFT[String(c.code || '').toUpperCase()] || ['Morning', 'Afternoon', 'Night', 'SOD', 'Office'].includes(c.code))
            .map((c) => ({ date: c.date, code: c.code, sod: c.sod, dutyOverlaps: c.dutyOverlaps }));
        const list = fromAssignments.length ? fromAssignments : fromCells;
        for (const a of list) {
            if (!a?.date) continue;
            const shift = shiftTypeFromCode(shiftTypes, a.sod ? 'SOD' : a.code);
            if (!shift) continue;
            const dk = dateKey(a.date);
            const dutyOverlaps = Array.isArray(a.dutyOverlaps) ? a.dutyOverlaps : [];
            assignments.push({
                _id: `a_${staffId}_${dk}`,
                staffId,
                date: `${dk}T00:00:00.000Z`,
                dutyOverlaps,
                shiftType: {
                    name: shift.name,
                    color: shift.color,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    dutyOverlaps,
                },
            });
        }
    }
    return assignments;
}

/**
 * Lightweight local auto-generate: fill Morning / Afternoon / Night per day when empty.
 * Prefers a senior/in-charge on Morning when available. Never fails hard.
 */
export function generateSandboxAssignments({
    staff = [],
    startDate,
    endDate,
    shiftTypes = sandboxShiftTypes(),
    existing = [],
    replace = true,
}) {
    const coverageNames = ['Morning', 'Afternoon', 'Night'];
    const shifts = coverageNames
        .map((name) => (shiftTypes || []).find((st) => st.name === name))
        .filter(Boolean);
    if (!staff.length || !shifts.length || !startDate || !endDate) {
        return replace ? [] : [...existing];
    }

    const days = buildDays(startDate, endDate);
    const next = replace ? [] : existing.map((a) => ({ ...a }));
    const taken = new Set(
        next.map((a) => `${String(a.staffId)}_${dateKey(a.date)}`)
    );
    const counts = new Map(staff.map((s) => [String(s._id), 0]));
    for (const a of next) {
        const id = String(a.staffId);
        counts.set(id, (counts.get(id) || 0) + 1);
    }

    const pool = staff.filter((s) => (s.employmentStatus || 'Active') !== 'On Leave');
    const seniors = pool.filter(isSupervisory);

    for (const day of days) {
        const dk = dateKey(day);
        const assignedToday = new Set(
            [...taken].filter((k) => k.endsWith(`_${dk}`)).map((k) => k.slice(0, k.lastIndexOf('_')))
        );

        for (const shift of shifts) {
            if (next.some((a) => dateKey(a.date) === dk && a.shiftType?.name === shift.name)) {
                continue;
            }
            let candidates = pool.filter((s) => !assignedToday.has(String(s._id)));
            if (shift.name === 'Night') {
                candidates = candidates.filter((s) => {
                    const type = s.staffType || classifyStaffType(s.rank);
                    return type !== 'senior' && type !== 'pno' && s.wardRole !== 'incharge' && s.wardRole !== 'assistant' && !s.noNightShift && !s.maternityNoNight;
                });
            }
            if (!candidates.length) continue;

            candidates.sort((a, b) => (counts.get(String(a._id)) || 0) - (counts.get(String(b._id)) || 0));
            let pick = candidates[0];
            if (shift.name === 'Morning' && seniors.length) {
                const seniorPick = candidates.find((s) => seniors.some((x) => String(x._id) === String(s._id)));
                if (seniorPick) pick = seniorPick;
            }

            const sid = String(pick._id);
            next.push({
                _id: `a_${sid}_${dk}_${shift.name}`,
                staffId: sid,
                date: `${dk}T00:00:00.000Z`,
                shiftType: {
                    name: shift.name,
                    color: shift.color,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                },
            });
            taken.add(`${sid}_${dk}`);
            assignedToday.add(sid);
            counts.set(sid, (counts.get(sid) || 0) + 1);
        }
    }

    return next;
}
