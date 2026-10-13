// Pure staff helpers — safe for client and server (no Node fs/mongoose).
// Used by the validation engine and UI components.

// Derive staffType ('regular' | 'senior' | 'pno') from a Ghana Health Service
// rank string. Server-side this is also done by Staff model's pre-save hook;
// the same logic is duplicated here so client-side validation can run without
// hitting the API.
export function classifyStaffType(rank) {
    if (!rank) return 'regular';
    const r = String(rank).toLowerCase();

    if (
        r.includes('principal') ||
        r.includes('matron') ||
        r.includes('director') ||
        r.includes('chief')
    ) {
        return 'pno';
    }

    if (
        r.includes('senior') ||
        r.includes('specialist') ||
        r.includes('consultant') ||
        r === 'nursing officer' ||
        r === 'midwifery officer' ||
        r === 'medical officer'
    ) {
        return 'senior';
    }

    return 'regular';
}

export function isSeniorStaff(rank) {
    const type = classifyStaffType(rank);
    return type === 'senior' || type === 'pno';
}

// Format a staff document into a single display name.
export function staffDisplayName(staff) {
    if (!staff) return '';
    if (staff.fullName) return staff.fullName;
    return `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.name || 'Unknown';
}

// Whether a staff member is on leave on a given date, based on their leaveRecords array.
export function isStaffOnLeave(staff, date) {
    if (!staff?.leaveRecords || staff.leaveRecords.length === 0) {
        return false;
    }

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return staff.leaveRecords.some((leave) => {
        if (leave.status && leave.status !== 'Approved') return false;

        const startDate = new Date(leave.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(leave.endDate);
        endDate.setHours(23, 59, 59, 999);

        return checkDate >= startDate && checkDate <= endDate;
    });
}

/**
 * True when this person should sit in the leave block at the bottom of a roster:
 * employment status On Leave, or approved leave covers every day of the cycle.
 */
export function isStaffOnLeaveForRoster(staff, startDate, endDate) {
    if (!staff) return false;
    if ((staff.employmentStatus || 'Active') === 'On Leave') return true;
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return false;
    const cur = new Date(start);
    let any = false;
    while (cur <= end) {
        any = true;
        if (!isStaffOnLeave(staff, cur)) return false;
        cur.setDate(cur.getDate() + 1);
    }
    return any;
}

// Lookup a staff member by id (string-compared so it works for both Mongo
// ObjectId strings and plain string ids).
export function getStaffById(staffList, staffId) {
    if (!staffList) return null;
    const target = String(staffId);
    return staffList.find((s) => String(s._id || s.id) === target) || null;
}

// Format an assignment count for fairness sorting (lower = picked first).
export function getAssignmentCount(assignments, staffId) {
    const target = String(staffId);
    return assignments.filter((a) => String(a.staffId) === target).length;
}
