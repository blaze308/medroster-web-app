// Client-side PDF export matching the Ghana hospital duty roster Word doc format.
// Generates: Title, staff × day grid with shift codes, summary row, legend.

import { buildRosterExportModel } from './roster-export-data';

function shiftColor(shiftName) {
    if (shiftName === 'Morning') return [200, 100, 0];
    if (shiftName === 'Afternoon') return [3, 105, 161];
    if (shiftName === 'Night') return [109, 40, 217];
    if (shiftName === 'Office') return [4, 120, 87];
    return [0, 107, 107];
}

function codeColor(code) {
    const u = String(code || '').toUpperCase();
    if (u === 'H') return [160, 100, 0];
    if (u === 'LV' || u === 'L') return [150, 150, 150];
    if (u === 'O' || u === 'OFF' || u === 'D/O') return [180, 180, 180];
    if (u === 'P' || u === 'OFC' || u === 'OFFICE') return [4, 120, 87];
    if (u === 'SOD') return [0, 107, 107];
    if (u === 'N' || u === 'XN' || u === 'PN') return [109, 40, 217];
    if (u === 'A' || u === 'XA' || u === 'PA') return [3, 105, 161];
    if (u === 'M' || u === 'XM' || u === 'PM') return [200, 100, 0];
    return [0, 107, 107];
}

function cellStyle(code, isHoliday) {
    if (code === 'H') {
        return { fillColor: [255, 243, 205], textColor: [160, 100, 0], fontStyle: 'bold' };
    }
    if (code === 'LV') {
        return { textColor: [150, 150, 150], fontStyle: 'normal' };
    }
    if (code === 'O') {
        return { textColor: [180, 180, 180] };
    }
    const styles = { textColor: codeColor(code), fontStyle: 'bold' };
    if (isHoliday) styles.fillColor = [255, 243, 205];
    return styles;
}

export async function exportRosterPdf({ schedule, hospital, ward, department, staff, assignments, rosterSetup }) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const model = buildRosterExportModel({
        schedule,
        hospital,
        ward,
        staff,
        assignments,
        rosterSetup: rosterSetup || schedule?.rosterSetup || ward?.rosterSetup,
    });
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(model.title, doc.internal.pageSize.getWidth() / 2, 14, { align: 'center' });

    if (model.hospitalName) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(model.hospitalName, doc.internal.pageSize.getWidth() / 2, 19, { align: 'center' });
    }

    const FIXED_COLS = ['NO', 'NAME', 'RANK'];
    const dayHeaders = model.days.map((d, i) => {
        const isH = model.holidayFlags[i];
        const day = d.getDate();
        const short = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
        return {
            content: `${short}\n${day}${isH ? '\nH' : ''}`,
            styles: isH ? { fillColor: [255, 243, 205], fontStyle: 'bold', textColor: [160, 100, 0] } : {},
        };
    });

    const head = [[
        ...FIXED_COLS.map((c) => ({ content: c, styles: { fontStyle: 'bold' } })),
        ...dayHeaders,
    ]];

    const body = [];
    let rotationBannerInserted = false;
    let leaveBannerInserted = false;

    for (const row of model.staffRows) {
        if (row.isLeave && !leaveBannerInserted) {
            body.push([{
                content: '',
                colSpan: model.days.length + 3,
                styles: { fillColor: [255, 255, 255], minCellHeight: 4 },
            }]);
            body.push([{
                content: 'ON LEAVE',
                colSpan: model.days.length + 3,
                styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [100, 116, 139] },
            }]);
            leaveBannerInserted = true;
        } else if (row.isRotation && !rotationBannerInserted && !row.isLeave) {
            body.push([{
                content: 'ROTATION',
                colSpan: model.days.length + 3,
                styles: { fillColor: [255, 243, 210], fontStyle: 'bold', textColor: [120, 80, 0] },
            }]);
            rotationBannerInserted = true;
        }

        body.push([
            { content: String(row.no), styles: { halign: 'center' } },
            { content: row.name },
            { content: row.rank },
            ...row.cells.map((code, i) => ({
                content: code,
                styles: cellStyle(code, model.holidayFlags[i]),
            })),
        ]);
    }

    for (const sum of model.summaryRows) {
        const color = shiftColor(sum.shiftName);
        body.push([
            { content: '', styles: { fillColor: [244, 247, 249] } },
            { content: sum.code, styles: { fontStyle: 'bold', textColor: color, fillColor: [244, 247, 249] } },
            { content: '', styles: { fillColor: [244, 247, 249] } },
            ...sum.counts.map((c) => ({
                content: c === '' ? '' : String(c),
                styles: { textColor: color, fontStyle: 'bold', halign: 'center', fillColor: [244, 247, 249] },
            })),
        ]);
    }

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
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 38, halign: 'left' },
            2: { cellWidth: 14, halign: 'center' },
        },
        alternateRowStyles: { fillColor: [252, 253, 254] },
        margin: { left: 5, right: 5 },
        tableWidth: 'auto',
    });

    let y = (doc.lastAutoTable?.finalY || 23) + 6;
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 107, 107);
    doc.text('LEGEND', 5, y);
    y += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(60);

    const legendLines = model.legend.map((l) => `${l.code} = ${l.meaning}`);
    const colW = (pageW - 10) / 2;
    let col = 0;
    let rowY = y;
    for (const line of legendLines) {
        const x = 5 + col * colW;
        if (rowY > pageH - 10) {
            doc.addPage();
            rowY = 12;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(0, 107, 107);
            doc.text('LEGEND (continued)', 5, rowY);
            rowY += 3.5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(60);
        }
        const codePart = line.split('=')[0].trim();
        const isClinic = /clinic\s*\/\s*opd/i.test(line) || ['P', 'OFC', 'OFFICE'].includes(codePart.toUpperCase());
        if (isClinic) {
            doc.setTextColor(...codeColor(codePart || 'P'));
            doc.setFont('helvetica', 'bold');
        } else {
            doc.setTextColor(60);
            doc.setFont('helvetica', 'normal');
        }
        doc.text(line, x, rowY, { maxWidth: colW - 4 });
        col += 1;
        if (col >= 2) {
            col = 0;
            rowY += 3.2;
        }
    }
    if (col !== 0) rowY += 3.2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text(
        `Generated by MedRoster · ${new Date().toLocaleDateString()}`,
        5,
        Math.min(rowY + 4, pageH - 4),
    );

    doc.save(`${model.fileBase}.pdf`);
}
