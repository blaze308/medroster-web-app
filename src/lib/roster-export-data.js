// Shared roster grid + legend for PDF / Excel / CSV exports.
// Prefer ward file codes (XM, P, …) from assignments / rosterSetup.legend.

import { formatLegendMeaning, preferredSourceCode } from './roster-setup';

export const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const SHIFT_CODE = {
    Morning: 'M',
    Afternoon: 'A',
    Night: 'N',
    SOD: 'SOD',
    Office: 'OFC',
};

/** Fallback legend when no ward setup legend exists. */
export const BASE_LEGEND = [
    { code: 'M', meaning: 'Morning cover shift' },
    { code: 'A', meaning: 'Afternoon cover shift' },
    { code: 'N', meaning: 'Night cover shift' },
    { code: 'SOD', meaning: 'Special / SOD duty' },
    {
        code: 'OFC',
        meaning: 'Clinic / OPD (weekday clinic or outpatient post)',
    },
    { code: 'O', meaning: 'Off / rest day' },
    { code: 'H', meaning: 'Public holiday' },
    { code: 'LV', meaning: 'Approved leave' },
];

const RANK_ABBR = {
    'Assistant Midwifery Principal': 'AMPS',
    'Principal Midwifery Officer': 'PMO',
    'Senior Midwifery Officer': 'SMO',
    'Midwifery Officer': 'MO',
    'Senior Staff Midwife': 'SSM',
    'Staff Midwife': 'SM',
    'Registered Midwife': 'RM',
    'Deputy Director of Nursing Services': 'DDNS',
    'Director of Nursing Services': 'DNS',
    'Principal Nursing Officer': 'PNO',
    'Senior Nursing Officer': 'SNO',
    'Nursing Officer': 'NO',
    'Senior Staff Nurse': 'SSN',
    'Staff Nurse': 'SN',
    'Enrolled Nurse': 'EN',
    'Nurse Assistant Clinical': 'NAC',
    'Nurse Assistant Preventive': 'NAP',
    'Senior Medical Officer': 'SMO',
    'Medical Officer': 'MO',
    'House Officer': 'HO',
    'Specialist': 'Spec',
    'Senior Specialist': 'SSpec',
    'Consultant': 'Cons',
    'Senior Consultant': 'SCons',
    'Physician Assistant': 'PA',
    'Senior Physician Assistant': 'SPA',
    'Community Health Nurse': 'CHN',
    'Community Health Nursing Officer': 'CHNO',
};

const RANK_SORT_ORDER = [
    'DDNS', 'DNS', 'AMPS', 'PNO', 'PMO', 'SNO', 'SMO', 'NO', 'MO',
    'SSN', 'SSM', 'SN', 'SM', 'RM', 'EN', 'NAC', 'NAP', 'HO', 'PA', 'SPA',
];

export function dateKey(d) {
    return new Date(d).toISOString().split('T')[0];
}

export function buildCycleDays(startDate, endDate) {
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

export function getShiftCode(shiftName, legend = []) {
    if (!shiftName) return '';
    return preferredSourceCode(shiftName, legend) || SHIFT_CODE[shiftName] || shiftName[0]?.toUpperCase() || '';
}

/** Display code for one assignment — ward file code first. */
export function displayCodeForAssignment(assignment, legend = []) {
    const raw = String(assignment?.sourceCode || '').trim();
    if (raw) return raw;
    const name = assignment?.shiftType?.name || '';
    return getShiftCode(name, legend);
}

export function getRankAbbr(rank) {
    return RANK_ABBR[rank] || rank || '';
}

function rankSortKey(rank) {
    const abbr = getRankAbbr(rank);
    const idx = RANK_SORT_ORDER.indexOf(abbr);
    return idx === -1 ? 999 : idx;
}

export function isOnLeave(staff, date) {
    if (!staff?.leaveRecords?.length) return false;
    const check = new Date(date);
    check.setHours(0, 0, 0, 0);
    return staff.leaveRecords.some((l) => {
        if (l.status && l.status !== 'Approved') return false;
        const s = new Date(l.startDate); s.setHours(0, 0, 0, 0);
        const e = new Date(l.endDate); e.setHours(23, 59, 59, 999);
        return check >= s && check <= e;
    });
}

function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

export function downloadTextFile(text, fileName, mime = 'text/plain;charset=utf-8') {
    downloadBlob(new Blob([text], { type: mime }), fileName);
}

export function downloadBlobFile(blob, fileName) {
    downloadBlob(blob, fileName);
}

function buildExportLegend(rosterSetup, usedCodes) {
    const setupLegend = Array.isArray(rosterSetup?.legend) ? rosterSetup.legend : [];
    const onDuty = setupLegend.filter(
        (e) => e?.meaning && e.meaning !== 'skip' && String(e.label || e.code || '').trim()
    );

    if (onDuty.length) {
        const rows = onDuty.map((e) => ({
            code: String(e.label || e.code).trim(),
            meaning: formatLegendMeaning(e) || e.meaning,
        }));
        for (const fallback of [
            { code: 'O', meaning: 'Off / rest day' },
            { code: 'H', meaning: 'Public holiday' },
            { code: 'LV', meaning: 'Approved leave' },
        ]) {
            if (!rows.some((r) => String(r.code).toUpperCase() === fallback.code)) {
                rows.push(fallback);
            }
        }
        for (const code of usedCodes) {
            if (code && !rows.some((r) => String(r.code).toUpperCase() === String(code).toUpperCase())) {
                rows.push({ code, meaning: 'Duty code from this roster' });
            }
        }
        return rows;
    }

    const legend = [...BASE_LEGEND];
    for (const code of usedCodes) {
        if (!legend.some((l) => l.code === code) && code) {
            legend.push({ code, meaning: 'Custom / imported duty code' });
        }
    }
    return legend;
}

/**
 * Build a plain grid model used by all export formats.
 */
export function buildRosterExportModel({ schedule, hospital, ward, staff, assignments, rosterSetup }) {
    const setup = rosterSetup || schedule?.rosterSetup || ward?.rosterSetup || null;
    const legendEntries = Array.isArray(setup?.legend) ? setup.legend : [];

    const days = buildCycleDays(schedule.startDate, schedule.endDate);
    const holidaySet = new Set((schedule.holidays || []).map((h) => dateKey(h.date || h)));

    const assignMap = new Map();
    for (const a of assignments || []) {
        const k = `${String(a.staffId)}_${dateKey(a.date)}`;
        assignMap.set(k, a);
    }

    const monthLabel = new Date(schedule.startDate)
        .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        .toUpperCase();
    const wardLabel = (ward?.name || 'WARD').toUpperCase();
    const title = `${wardLabel} DUTY ROSTER, ${monthLabel}`;
    const hospitalName = hospital?.name || '';
    const fileBase = `${wardLabel.replace(/\s+/g, '_')}_Roster_${monthLabel.replace(/\s+/g, '_')}`;

    const dayHeaders = days.map((d) => {
        const key = dateKey(d);
        const isH = holidaySet.has(key);
        return `${DAY_SHORT[d.getDay()]} ${d.getDate()}${isH ? ' H' : ''}`;
    });
    const dayKeys = days.map((d) => dateKey(d));
    const holidayFlags = days.map((d) => holidaySet.has(dateKey(d)));

    const sortedStaff = [...(staff || [])].sort((a, b) => {
        const ra = rankSortKey(a.rank);
        const rb = rankSortKey(b.rank);
        if (ra !== rb) return ra - rb;
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
    });
    const regularStaff = sortedStaff.filter((s) => !s.isRotation);
    const rotationStaff = sortedStaff.filter((s) => s.isRotation);

    const usedCodes = new Set();

    function cellFor(s, d) {
        const dk = dateKey(d);
        const isH = holidaySet.has(dk);
        const onLeave = isOnLeave(s, d);
        const k = `${String(s._id)}_${dk}`;
        const a = assignMap.get(k);
        if (onLeave) {
            usedCodes.add('LV');
            return 'LV';
        }
        if (isH && !a) {
            usedCodes.add('H');
            return 'H';
        }
        if (a) {
            const code = displayCodeForAssignment(a, legendEntries);
            usedCodes.add(code);
            return code;
        }
        usedCodes.add('O');
        return 'O';
    }

    function buildStaffRows(list, startNo, isRotation = false) {
        return list.map((s, idx) => ({
            no: startNo + idx,
            name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
            rank: getRankAbbr(s.rank || s.category),
            cells: days.map((d) => cellFor(s, d)),
            isRotation,
            _staff: s,
        }));
    }

    const staffRows = [
        ...buildStaffRows(regularStaff, 1, false),
        ...buildStaffRows(rotationStaff, regularStaff.length + 1, true),
    ];

    const shiftCodesToCount = ['Morning', 'Afternoon', 'Night', 'SOD', 'Office'];
    const summaryRows = shiftCodesToCount.map((shiftName) => {
        const code = getShiftCode(shiftName, legendEntries);
        let hasAny = false;
        const counts = days.map((d) => {
            const dk = dateKey(d);
            let count = 0;
            for (const s of staff || []) {
                const k = `${String(s._id)}_${dk}`;
                const a = assignMap.get(k);
                if (a?.shiftType?.name === shiftName) count++;
            }
            if (count > 0) hasAny = true;
            return count > 0 ? count : '';
        });
        if (!hasAny) return null;
        return { code, shiftName, counts };
    }).filter(Boolean);

    const legend = buildExportLegend(setup, usedCodes);

    return {
        title,
        hospitalName,
        monthLabel,
        wardLabel,
        fileBase,
        days,
        dayHeaders,
        dayKeys,
        holidayFlags,
        regularCount: regularStaff.length,
        rotationCount: rotationStaff.length,
        staffRows,
        summaryRows,
        legend,
        assignMap,
        holidaySet,
        legendEntries,
    };
}
