import { DEFAULT_SHIFT_TYPES, getDefaultHospitalSettings } from './ghana-data';
import { classifyStaffType, isStaffOnLeave } from './staff-utils';
import { validateRoleShiftCompatibility, validateWorkRestriction } from './validation';
import { preferredSourceCode } from './roster-setup';
import { isRuleHard, normalizeRuleModes } from './rule-modes';

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
    P: 'Office',
    XM: 'Morning',
    XA: 'Afternoon',
    XN: 'Night',
    PM: 'Morning',
    PA: 'Afternoon',
    PN: 'Night',
};

const ON_DUTY_NAMES = ['Morning', 'Afternoon', 'Night', 'SOD', 'Office'];

const COVER_NAMES = ['Morning', 'Afternoon', 'Night'];

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

function holidaySchedule(holidays = []) {
    return { holidays: holidays || [] };
}

function canAssignCover(staff, day, shift, holidays) {
    if (!staff || !shift) return false;
    if ((staff.employmentStatus || 'Active') === 'On Leave') return false;
    if (isStaffOnLeave(staff, day)) return false;
    const schedule = holidaySchedule(holidays);
    const role = validateRoleShiftCompatibility(staff, shift);
    if (!role.valid) return false;
    const restriction = validateWorkRestriction(staff, day, shift, schedule);
    if (!restriction.valid) return false;
    return true;
}

function dayHasCover(assignments, dk, shiftName) {
    return (assignments || []).some(
        (a) => dateKey(a.date) === dk && a.shiftType?.name === shiftName
    );
}

function staffTakenOnDay(assignments, dk) {
    return new Set(
        (assignments || [])
            .filter((a) => dateKey(a.date) === dk)
            .map((a) => String(a.staffId))
    );
}

/**
 * Scan empty Morning/Afternoon/Night cover slots and eligible staff.
 * Does not place Office/SOD — those stay as imported clinic / duty cells.
 */
function scanGeneratableSlots({
    staff = [],
    startDate,
    endDate,
    shiftTypes = sandboxShiftTypes(),
    existing = [],
    holidays = [],
}) {
    const shifts = COVER_NAMES
        .map((name) => (shiftTypes || []).find((st) => st.name === name))
        .filter(Boolean);
    if (!staff.length || !shifts.length || !startDate || !endDate) {
        return { slots: [], fillableCount: 0 };
    }

    const days = buildDays(startDate, endDate);
    const pool = staff.filter((s) => (s.employmentStatus || 'Active') !== 'On Leave');
    const slots = [];

    for (const day of days) {
        const dk = dateKey(day);
        const taken = staffTakenOnDay(existing, dk);
        for (const shift of shifts) {
            if (dayHasCover(existing, dk, shift.name)) continue;
            const candidates = pool.filter(
                (s) => !taken.has(String(s._id)) && canAssignCover(s, day, shift, holidays)
            );
            if (!candidates.length) continue;
            slots.push({ date: dk, shift, candidates });
        }
    }

    return { slots, fillableCount: slots.length };
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
            .filter((c) => (
                ON_DUTY_NAMES.includes(c.meaning)
                || CODE_TO_SHIFT[String(c.code || '').toUpperCase()]
                || ON_DUTY_NAMES.includes(c.code)
            ))
            .map((c) => ({
                date: c.date,
                code: c.code,
                meaning: c.meaning,
                unit: c.unit,
                sod: c.sod,
                dutyOverlaps: c.dutyOverlaps,
                officeDays: c.officeDays,
                outsideMorning: c.outsideMorning,
            }));
        const list = fromAssignments.length ? fromAssignments : fromCells;
        for (const a of list) {
            if (!a?.date) continue;
            const byMeaning = ON_DUTY_NAMES.includes(a.meaning)
                ? (shiftTypes || []).find((st) => st.name === a.meaning)
                : null;
            const shift = a.sod
                ? shiftTypeFromCode(shiftTypes, 'SOD')
                : (byMeaning || shiftTypeFromCode(shiftTypes, a.code));
            if (!shift) continue;
            const dk = dateKey(a.date);
            const dutyOverlaps = Array.isArray(a.dutyOverlaps) && a.dutyOverlaps.length
                ? a.dutyOverlaps
                : [shift.name === 'Afternoon' ? 'Afternoon' : shift.name === 'Night' ? 'Night' : 'Morning'];
            const sourceCode = String(a.code || '').trim() || undefined;
            assignments.push({
                _id: `a_${staffId}_${dk}`,
                staffId,
                date: `${dk}T00:00:00.000Z`,
                sourceCode,
                unit: a.unit || '',
                dutyOverlaps,
                officeDays: a.officeDays || [],
                outsideMorning: Boolean(a.outsideMorning),
                shiftType: {
                    name: shift.name,
                    color: shift.color,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    dutyOverlaps,
                    outsideMorning: Boolean(a.outsideMorning),
                },
            });
        }
    }
    return assignments;
}

/** How many empty cover slots auto-generate can fill right now. */
export function countGeneratableSlots(args) {
    return scanGeneratableSlots(args).fillableCount;
}

/**
 * Gap-fill Morning / Afternoon / Night when empty.
 * Preserves existing assignments (including Office clinic cells). Never auto-places Office/SOD.
 */
export function generateSandboxAssignments({
    staff = [],
    startDate,
    endDate,
    shiftTypes = sandboxShiftTypes(),
    existing = [],
    holidays = [],
    rosterSetup = null,
    replace = false,
    settings = null,
    ruleModes = null,
}) {
    const base = replace ? [] : (existing || []).map((a) => ({ ...a }));
    const { slots } = scanGeneratableSlots({
        staff,
        startDate,
        endDate,
        shiftTypes,
        existing: base,
        holidays,
    });
    if (!slots.length) return base;

    const resolvedSettings = {
        ...(settings || sandboxSettings()),
        ruleModes: normalizeRuleModes(ruleModes || settings?.ruleModes),
    };
    const maxConsecutive = resolvedSettings.maxConsecutiveDays ?? 6;
    const maxNights = resolvedSettings.maxConsecutiveNights ?? 3;
    const hardenDays = isRuleHard(resolvedSettings, 'consecutiveDays');
    const hardenNights = isRuleHard(resolvedSettings, 'consecutiveNights');

    const legend = Array.isArray(rosterSetup?.legend) ? rosterSetup.legend : [];
    const next = [...base];
    const counts = new Map(staff.map((s) => [String(s._id), 0]));
    const consecutiveTracker = new Map(staff.map((s) => [String(s._id), 0]));
    const consecutiveNightTracker = new Map(staff.map((s) => [String(s._id), 0]));
    const lastWorkedDate = new Map();
    for (const a of next) {
        const id = String(a.staffId);
        counts.set(id, (counts.get(id) || 0) + 1);
    }
    const seniors = staff.filter(isSupervisory);

    // Fill day-by-day so one person isn't double-booked when multiple slots share a day
    const byDay = new Map();
    for (const slot of slots) {
        if (!byDay.has(slot.date)) byDay.set(slot.date, []);
        byDay.get(slot.date).push(slot);
    }
    const sortedDays = [...byDay.keys()].sort();

    for (const dk of sortedDays) {
        const daySlots = byDay.get(dk);
        const day = new Date(`${dk}T00:00:00.000Z`);
        for (const [sid, last] of lastWorkedDate.entries()) {
            const diff = (day - last) / (24 * 3600 * 1000);
            if (diff > 1) {
                consecutiveTracker.set(sid, 0);
                consecutiveNightTracker.set(sid, 0);
            }
        }

        const taken = staffTakenOnDay(next, dk);
        // Prefer Morning first for senior placement
        const ordered = [...daySlots].sort((a, b) => {
            if (a.shift.name === 'Morning' && b.shift.name !== 'Morning') return -1;
            if (b.shift.name === 'Morning' && a.shift.name !== 'Morning') return 1;
            return 0;
        });

        for (const slot of ordered) {
            if (dayHasCover(next, dk, slot.shift.name)) continue;
            const isNight = slot.shift.name === 'Night';
            let candidates = slot.candidates.filter((s) => !taken.has(String(s._id)));
            // Re-check eligibility against live state
            candidates = candidates.filter((s) => canAssignCover(s, `${dk}T00:00:00.000Z`, slot.shift, holidays));
            if (hardenDays) {
                candidates = candidates.filter((s) => (consecutiveTracker.get(String(s._id)) || 0) < maxConsecutive);
            }
            if (hardenNights && isNight) {
                candidates = candidates.filter((s) => (consecutiveNightTracker.get(String(s._id)) || 0) < maxNights);
            }
            if (!candidates.length) continue;

            candidates.sort((a, b) => {
                const soft =
                    !hardenDays
                        ? (consecutiveTracker.get(String(a._id)) || 0) - (consecutiveTracker.get(String(b._id)) || 0)
                        : 0;
                return soft || (counts.get(String(a._id)) || 0) - (counts.get(String(b._id)) || 0);
            });
            let pick = candidates[0];
            if (seniors.length) {
                const seniorPick = candidates.find((s) => seniors.some((x) => String(x._id) === String(s._id)));
                if (seniorPick) pick = seniorPick;
            }

            const sid = String(pick._id);
            const dutyOverlaps = [slot.shift.name];
            const sourceCode = preferredSourceCode(slot.shift.name, legend) || undefined;
            next.push({
                _id: `a_${sid}_${dk}_${slot.shift.name}`,
                staffId: sid,
                date: `${dk}T00:00:00.000Z`,
                sourceCode,
                dutyOverlaps,
                shiftType: {
                    name: slot.shift.name,
                    color: slot.shift.color,
                    startTime: slot.shift.startTime,
                    endTime: slot.shift.endTime,
                    dutyOverlaps,
                },
            });
            taken.add(sid);
            counts.set(sid, (counts.get(sid) || 0) + 1);
            const prev = consecutiveTracker.get(sid) || 0;
            consecutiveTracker.set(sid, prev + 1);
            if (isNight) {
                consecutiveNightTracker.set(sid, (consecutiveNightTracker.get(sid) || 0) + 1);
            } else {
                consecutiveNightTracker.set(sid, 0);
            }
            lastWorkedDate.set(sid, day);
        }
    }

    return next;
}
