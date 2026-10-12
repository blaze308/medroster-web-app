// Client-side PDF export matching the Ghana hospital duty roster Word doc format.
// Generates: Title, staff × day grid with shift codes (M/A/N/O/H), M/A/N summary row.

const DAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const SHIFT_CODE = {
    Morning: 'M',
    Afternoon: 'A',
    Night: 'N',
    SOD: 'SOD',
    Office: 'OFC',
};

function dateKey(d) {
    return new Date(d).toISOString().split('T')[0];
}

function buildCycleDays(startDate, endDate) {
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

function getShiftCode(shiftName) {
    if (!shiftName) return '';
    return SHIFT_CODE[shiftName] || shiftName[0]?.toUpperCase() || '';
}

function isOnLeave(staff, date) {
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

// rank abbreviation lookup for the RANK column (matches docs style)
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

function getRankAbbr(rank) {
    return RANK_ABBR[rank] || rank || '';
}

const RANK_SORT_ORDER = [
    'DDNS', 'DNS', 'AMPS', 'PNO', 'PMO', 'SNO', 'SMO', 'NO', 'MO',
    'SSN', 'SSM', 'SN', 'SM', 'RM', 'EN', 'NAC', 'NAP', 'HO', 'PA', 'SPA',
];

function rankSortKey(rank) {
    const abbr = getRankAbbr(rank);
    const idx = RANK_SORT_ORDER.indexOf(abbr);
    return idx === -1 ? 999 : idx;
}

export async function exportRosterPdf({ schedule, hospital, ward, department, staff, assignments }) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const days = buildCycleDays(schedule.startDate, schedule.endDate);
    const holidaySet = new Set((schedule.holidays || []).map((h) => dateKey(h.date || h)));

    const assignMap = new Map();
    for (const a of assignments) {
        const k = `${String(a.staffId)}_${dateKey(a.date)}`;
        assignMap.set(k, a.shiftType?.name || '');
    }

    // Title
    const monthLabel = new Date(schedule.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
    const wardLabel = (ward?.name || 'WARD').toUpperCase();
    const title = `${wardLabel} DUTY ROSTER, ${monthLabel}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 14, { align: 'center' });

    // Sub-title
    if (hospital?.name) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(hospital.name, doc.internal.pageSize.getWidth() / 2, 19, { align: 'center' });
    }

    // Build table
    const FIXED_COLS = ['NO', 'NAME', 'RANK'];
    const dayHeaders = days.map((d) => {
        const key = dateKey(d);
        const isH = holidaySet.has(key);
        return { content: `${DAY_SHORT[d.getDay()]}\n${d.getDate()}${isH ? '\nH' : ''}`, styles: isH ? { fillColor: [255, 243, 205], fontStyle: 'bold', textColor: [160, 100, 0] } : {} };
    });

    const head = [[
        ...FIXED_COLS.map((c) => ({ content: c, styles: { fontStyle: 'bold' } })),
        ...dayHeaders,
    ]];

    // Staff rows — sort by rank hierarchy (senior first), matching Ghana ward rosters
    const sortedStaff = [...staff].sort((a, b) => {
        const ra = rankSortKey(a.rank);
        const rb = rankSortKey(b.rank);
        if (ra !== rb) return ra - rb;
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
    });
    const regularStaff = sortedStaff.filter((s) => !s.isRotation);
    const rotationStaff = sortedStaff.filter((s) => s.isRotation);

    function buildRows(staffList, startNo) {
        return staffList.map((s, idx) => {
            const cells = days.map((d) => {
                const dk = dateKey(d);
                const isH = holidaySet.has(dk);
                const onLeave = isOnLeave(s, d);
                const k = `${String(s._id)}_${dk}`;
                const shiftName = assignMap.get(k);
                if (onLeave) return { content: 'LV', styles: { textColor: [150, 150, 150], fontStyle: 'normal' } };
                if (isH && !shiftName) return { content: 'H', styles: { fillColor: [255, 243, 205], textColor: [160, 100, 0], fontStyle: 'bold' } };
                if (shiftName) {
                    const code = getShiftCode(shiftName);
                    const color = shiftName === 'Morning' ? [200, 100, 0] :
                                  shiftName === 'Afternoon' ? [3, 105, 161] :
                                  shiftName === 'Night' ? [109, 40, 217] :
                                  shiftName === 'Office' ? [4, 120, 87] :
                                  [0, 107, 107];
                    return { content: code, styles: { textColor: color, fontStyle: 'bold' } };
                }
                return { content: 'O', styles: { textColor: [180, 180, 180] } };
            });

            return [
                { content: String(startNo + idx), styles: { halign: 'center' } },
                { content: `${s.firstName} ${s.lastName}`.trim() },
                { content: getRankAbbr(s.rank || s.category) },
                ...cells,
            ];
        });
    }

    const body = buildRows(regularStaff, 1);

    if (rotationStaff.length > 0) {
        body.push([{
            content: 'ROTATION',
            colSpan: days.length + 3,
            styles: { fillColor: [255, 243, 210], fontStyle: 'bold', textColor: [120, 80, 0] },
        }]);
        body.push(...buildRows(rotationStaff, regularStaff.length + 1));
    }

    // Summary row — count M, A, N per day
    const shiftCodesToCount = ['Morning', 'Afternoon', 'Night', 'SOD', 'Office'];
    const summaryRows = shiftCodesToCount.map((shiftName) => {
        const code = getShiftCode(shiftName);
        const color = shiftName === 'Morning' ? [200, 100, 0] :
                      shiftName === 'Afternoon' ? [3, 105, 161] :
                      shiftName === 'Night' ? [109, 40, 217] :
                      shiftName === 'Office' ? [4, 120, 87] :
                      [0, 107, 107];

        let hasAny = false;
        const cells = days.map((d) => {
            const dk = dateKey(d);
            let count = 0;
            for (const s of staff) {
                const k = `${String(s._id)}_${dk}`;
                if (assignMap.get(k) === shiftName) count++;
            }
            if (count > 0) hasAny = true;
            return { content: count > 0 ? String(count) : '', styles: { textColor: color, fontStyle: 'bold', halign: 'center' } };
        });

        if (!hasAny) return null;
        return [
            { content: '', styles: { fillColor: [244, 247, 249] } },
            { content: code, styles: { fontStyle: 'bold', textColor: color, fillColor: [244, 247, 249] } },
            { content: '', styles: { fillColor: [244, 247, 249] } },
            ...cells.map((c) => ({ ...c, styles: { ...c.styles, fillColor: [244, 247, 249] } })),
        ];
    }).filter(Boolean);

    body.push(...summaryRows);

    autoTable(doc, {
        head,
        body,
        startY: 23,
        theme: 'grid',
        styles: {
            fontSize: 6.5,
            cellPadding: 1,
            halign: 'center',
            valign: 'middle',
            overflow: 'ellipsize',
        },
        headStyles: {
            fillColor: [0, 107, 107],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 6,
        },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },       // NO
            1: { cellWidth: 38, halign: 'left' },         // NAME
            2: { cellWidth: 14, halign: 'center' },        // RANK
        },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        margin: { left: 5, right: 5 },
        tableWidth: 'auto',
    });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text(`Generated by MedRoster · ${new Date().toLocaleDateString()}`, 5, doc.internal.pageSize.getHeight() - 4);

    const fileName = `${wardLabel.replace(/\s+/g, '_')}_Roster_${monthLabel.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
}
