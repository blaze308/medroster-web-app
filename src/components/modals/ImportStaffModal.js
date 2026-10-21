'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { auth } from '../../lib/firebase';
import { LEAVE_LEGEND, RANKS_BY_CATEGORY, STAFF_CATEGORIES } from '../../lib/ghana-data';

/** Map extracted rank / abbr onto a catalog rank so the review select can prefill. */
function resolveImportedRank(...candidates) {
    const catalog = [];
    for (const list of Object.values(RANKS_BY_CATEGORY)) catalog.push(...list);
    const uniq = [...new Set(catalog)];
    for (const raw of candidates) {
        const t = String(raw || '').trim();
        if (!t) continue;
        const exact = uniq.find((r) => r.toLowerCase() === t.toLowerCase());
        if (exact) return exact;
        const starts = uniq.find((r) => r.toLowerCase().startsWith(t.toLowerCase()) && t.length >= 3);
        if (starts) return starts;
        // Keep non-empty extracted text even if not in catalog (shows under "From file")
        return t;
    }
    return '';
}
import {
    applyRosterSetup,
    buildRosterSetupPayload,
    buildSetupProposal,
    codePlainHint,
    defaultDutyOverlaps,
    defaultOfficeDays,
    displayMeaningLabel,
    isRegularDutyOverlaps,
    kindFromMeaning,
    LEGEND_KIND_OPTIONS,
    OFFICE_DAY_OPTIONS,
    LEGEND_MEANING_OPTIONS,
    LEGEND_MEANINGS,
    normalizeDutyOverlaps,
} from '../../lib/roster-setup';
import { mapPreviewToAssignments, sandboxShiftTypes } from '../../lib/sandbox-roster';
import { getDefaultRuleModes, normalizeRuleModes } from '../../lib/rule-modes';
import ConfirmModal from './ConfirmModal';
import RuleModesPanel from '../shared/RuleModesPanel';
import { markImportHintShown, shouldShowImportHint } from '../../lib/import-hint-toast';

const FRESH_SETUP_CLEAR_OPTIONS = [
    {
        id: 'setup',
        label: 'Saved setup',
        hint: 'Forget codes, clinic days, and roles — re-map from this file',
        defaultChecked: true,
        locked: true,
    },
    {
        id: 'shifts',
        label: 'Shifts already on the roster',
        hint: 'Clear calendar assignments in the roster behind this import',
        defaultChecked: false,
    },
    {
        id: 'staff',
        label: 'Staff already on the roster',
        hint: 'Remove current staff list too (clean slate)',
        defaultChecked: false,
    },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function logExtractToBrowser(label, data, extra = {}) {
    const debug = data?.extractDebug || null;
    const clientMs = extra.clientMs ?? null;
    const serverMs = data?.requestMs ?? debug?.durationMs ?? null;
    const summary = {
        ...extra,
        /** Round-trip seen in the browser (upload + parse + network) */
        clientMs,
        /** Server-reported processing time */
        serverMs,
        took: clientMs != null ? `${clientMs}ms client` : undefined,
        serverTook: serverMs != null ? `${serverMs}ms server` : undefined,
        aiUsed: data?.aiUsed ?? debug?.aiUsed ?? false,
        source: data?.source,
        staff: data?.staff?.length || 0,
        days: data?.days?.length || 0,
        codes: (data?.codes || []).map((c) => {
            const unit = c.unit ? ` · ${c.unit}` : '';
            return `${c.label}→${c.meaning || '—'}${unit} (${c.confidence})`;
        }),
        needingConfirm: debug?.needingConfirm || (data?.codes || []).filter((c) => c.needsConfirm).map((c) => c.label),
        blanks: data?.blanks,
        path: debug?.path,
        openai: debug?.openai || data?.openaiDebug || null,
        extractDebug: debug,
    };
    // Browser DevTools — server logs alone don't show here
    console.groupCollapsed(`[MedRoster] ${label}${clientMs != null ? ` · ${clientMs}ms` : ''}`);
    console.log(summary);
    if (debug) console.log('extractDebug', debug);
    console.groupEnd();
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
    });
}

const ROSTER_ACCEPT = '.docx,.xlsx,.pdf,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp';
const MAX_ROSTER_BYTES = 10 * 1024 * 1024;

function isCsvFile(file) {
    return /\.csv$/i.test(file?.name || '') || String(file?.type || '') === 'text/csv';
}

function isRosterImage(file) {
    return String(file.type || '').startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name || '');
}

function compressRosterImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const max = 1600;
            let w = img.width;
            let h = img.height;
            if (w > max || h > max) {
                const scale = Math.min(max / w, max / h);
                w = Math.round(w * scale);
                h = Math.round(h * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => {
                URL.revokeObjectURL(url);
                if (!blob) {
                    reject(new Error('Could not compress image'));
                    return;
                }
                const name = String(file.name || 'roster.jpg').replace(/\.[^.]+$/, '.jpg');
                resolve(new File([blob], name, { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.82);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read image'));
        };
        img.src = url;
    });
}

async function prepareRosterFile(file) {
    if (file.size > MAX_ROSTER_BYTES) throw new Error('File is too large (max 10 MB)');
    if (isRosterImage(file) && file.size > 2 * 1024 * 1024) return compressRosterImage(file);
    return file;
}

/**
 * Import staff from CSV or an existing duty roster (photo, PDF, Word, Excel).
 * Same UX for hospital, individual, and guest — only save target differs.
 * modes: 'hospital' | 'individual' | 'guest'
 */
export default function ImportStaffModal({
    mode = 'hospital',
    hospitalId,
    departments = [],
    wards = [],
    defaultDepartmentId,
    defaultWardId,
    lockWard = false,
    savedRosterSetup = null,
    onClearRosterSetup = null,
    onClose,
    onImported,
}) {
    return (
        <UnifiedImportModal
            mode={mode}
            hospitalId={hospitalId}
            departments={departments}
            wards={wards}
            defaultDepartmentId={defaultDepartmentId}
            defaultWardId={defaultWardId}
            lockWard={lockWard}
            savedRosterSetup={savedRosterSetup}
            onClearRosterSetup={onClearRosterSetup}
            onClose={onClose}
            onImported={onImported}
        />
    );
}

function UnifiedImportModal({
    mode = 'hospital',
    hospitalId, departments, wards, onClose, onImported,
    defaultDepartmentId: defaultDepartmentIdProp,
    defaultWardId: defaultWardIdProp,
    lockWard = false,
    savedRosterSetup = null,
    onClearRosterSetup = null,
}) {
    const isHospital = mode === 'hospital';
    const [step, setStep] = useState('upload');
    const [path, setPath] = useState('roster');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    /** True only while parsing/extracting a file — hides the modal and shows a page overlay. */
    const [reading, setReading] = useState(false);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);
    const [rawPreview, setRawPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [showGrid, setShowGrid] = useState(false);
    const [defaultDepartmentId, setDefaultDepartmentId] = useState(defaultDepartmentIdProp || departments[0]?._id || '');
    const [defaultWardId, setDefaultWardId] = useState(defaultWardIdProp || wards[0]?._id || '');
    const [setupDraft, setSetupDraft] = useState(null);
    /** 0 = Roles, 1 = Roster codes, 2 = Leave */
    const [setupSubStep, setSetupSubStep] = useState(0);
    const [confirmedSetup, setConfirmedSetup] = useState(null);
    const [toast, setToast] = useState(null); // { kind, message }
    const [showFreshClear, setShowFreshClear] = useState(false);
    const [importIntro, setImportIntro] = useState(false);
    const [rules, setRules] = useState({
        leaveStayOff: true,
        offAndHolidayStayOff: true,
        keepGridAsIs: true,
    });
    const [ruleModes, setRuleModes] = useState(() => getDefaultRuleModes());

    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(null), 4200);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        if (!shouldShowImportHint()) return;
        setImportIntro(true);
        markImportHintShown();
    }, []);

    useEffect(() => {
        if (step === 'setup') setSetupSubStep(0);
    }, [step, setupDraft?.proposal]);

    useEffect(() => {
        const root = document.documentElement;
        if (reading) root.classList.add('mr-reading');
        else root.classList.remove('mr-reading');
        return () => root.classList.remove('mr-reading');
    }, [reading]);

    const activeWard = useMemo(
        () => wards.find((w) => String(w._id) === String(defaultWardId)),
        [wards, defaultWardId]
    );
    const wardPack = savedRosterSetup || activeWard?.rosterSetup || null;

    const selectedCount = useMemo(
        () => (preview?.staff || []).filter((s) => s.selected !== false).length,
        [preview]
    );

    const toLocalStaff = (rows, days = []) => rows.map((s, i) => {
        const leaveType = s.leaveType || '';
        const onLeave = Boolean(leaveType);
        const sortedDates = (days || []).map((d) => d.date).filter(Boolean).sort();
        const leaveRecords = onLeave && sortedDates.length
            ? [{
                id: `leave_${Date.now()}_${i}`,
                startDate: `${sortedDates[0]}T00:00:00.000Z`,
                endDate: `${sortedDates[sortedDates.length - 1]}T23:59:59.000Z`,
                leaveType,
                status: 'Approved',
                notes: s.leaveNote || s.notes || '',
            }]
            : [];
        return {
            _id: s._id || `${mode}_${Date.now()}_${i}`,
            firstName: s.firstName || '',
            lastName: s.lastName || '',
            rank: s.rankFull || s.rank || '',
            phone: s.phone || '',
            email: s.email || '',
            wardRole: s.wardRole || 'regular',
            isRotation: Boolean(s.isRotation),
            employmentStatus: onLeave ? 'On Leave' : 'Active',
            maternityNoNight: /maternity/i.test(leaveType),
            annualLeaveDays: s.annualLeaveDays,
            notes: s.notes || s.leaveNote || '',
            cells: s.cells || [],
            assignments: s.assignments || [],
            leaveType,
            leaveRecords,
        };
    });

    const downloadTemplate = async () => {
        try {
            const templateUrl = isHospital
                ? `${API_URL}/api/hospitals/${hospitalId}/staff/template/download`
                : mode === 'guest'
                    ? `${API_URL}/api/guest/staff/template`
                    : `${API_URL}/api/me/staff/template`;
            if (mode === 'guest') {
                window.open(templateUrl, '_blank');
                return;
            }
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(templateUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'medroster-staff-template.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message || 'Failed to download template');
        }
    };

    const pickFile = (next) => {
        if (!next) return;
        setFile(next);
        setPath(isCsvFile(next) ? 'csv' : 'roster');
        setError('');
    };

    const draftFromProposal = (nextPreview, pack) => {
        const proposal = buildSetupProposal(nextPreview, pack);
        return {
            legend: (proposal.legendDraft || []).map((e) => ({
                label: e.label,
                meaning: e.meaning || '',
                unit: e.unit || '',
                codeHint: e.codeHint || codePlainHint(e.label),
                legendNote: e.legendNote || '',
                dutyKind: e.dutyKind || kindFromMeaning(e.meaning || ''),
                dutyOverlaps: e.dutyOverlaps?.length
                    ? e.dutyOverlaps
                    : defaultDutyOverlaps(e.meaning || ''),
                officeDays: e.meaning === 'Office'
                    ? (e.officeDays?.length ? e.officeDays : defaultOfficeDays('Office'))
                    : [],
                outsideMorning: e.meaning === 'Office' ? Boolean(e.outsideMorning) : false,
                needsConfirm: Boolean(e.needsConfirm),
                confidence: e.confidence,
                userChecked: !e.needsConfirm && Boolean(e.meaning),
            })),
            inchargeStaffKey: pack?.inchargeStaffKey
                || proposal.roleGuesses.find((r) => r.guessedRole === 'incharge')?.key
                || '',
            assistantStaffKey: pack?.assistantStaffKey
                || proposal.roleGuesses.find((r) => r.guessedRole === 'assistant')?.key
                || '',
            leaveByKey: Object.fromEntries(
                (proposal.roleGuesses || [])
                    .filter((r) => r.leaveLikely || r.leaveType)
                    .map((r) => [r.key, { onLeave: true, leaveType: r.leaveType || 'annual' }])
            ),
            coverTargets: proposal.coverTargets || pack?.coverTargets || null,
            roleGuesses: proposal.roleGuesses,
            blanks: proposal.blanks,
            needsFullSetup: proposal.needsFullSetup,
            rolesEssential: !pack?.confirmedAt,
            inchargeSkipped: false,
            assistantSkipped: false,
            inchargeChecked: Boolean(pack?.inchargeStaffKey)
                || Boolean(proposal.roleGuesses.find((r) => r.guessedRole === 'incharge')),
            assistantChecked: Boolean(pack?.assistantStaffKey)
                || Boolean(proposal.roleGuesses.find((r) => r.guessedRole === 'assistant')),
            proposal,
        };
    };

    const runParse = async () => {
        if (!file) { setError('Choose a file first'); return; }
        const useCsv = isCsvFile(file) || path === 'csv';
        setPath(useCsv ? 'csv' : 'roster');
        setLoading(true);
        setReading(true);
        setError('');
        try {
            let data;
            if (useCsv) {
                const text = await file.text();
                if (isHospital) {
                    data = await apiFetch(`/api/hospitals/${hospitalId}/staff/parse-csv`, {
                        method: 'POST',
                        body: JSON.stringify({ csvText: text }),
                    });
                } else if (mode === 'guest') {
                    const res = await fetch(`${API_URL}/api/guest/staff/import`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ csvText: text }),
                    });
                    data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Could not read that CSV');
                    data = { source: 'csv', staff: data.staff || [] };
                } else {
                    data = await apiFetch('/api/me/staff/import', {
                        method: 'POST',
                        body: JSON.stringify({ csvText: text }),
                    });
                    data = { source: 'csv', staff: data.staff || [] };
                }
            } else {
                const ready = await prepareRosterFile(file);
                const dataUrl = await fileToBase64(ready);
                const fileBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
                const body = { fileBase64, fileName: ready.name || file.name };
                const extractT0 = performance.now();
                console.log('[MedRoster] extract request →', {
                    fileName: body.fileName,
                    bytes: ready.size || file.size,
                    mode,
                    startedAt: new Date().toISOString(),
                });
                if (isHospital) {
                    data = await apiFetch(`/api/hospitals/${hospitalId}/staff/extract`, {
                        method: 'POST',
                        body: JSON.stringify({ ...body, wardId: defaultWardId || undefined }),
                    });
                } else if (mode === 'guest') {
                    const res = await fetch(`${API_URL}/api/guest/staff/extract`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                    data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Could not read that roster');
                } else {
                    data = await apiFetch('/api/me/staff/extract', {
                        method: 'POST',
                        body: JSON.stringify(body),
                    });
                }
                const clientMs = Math.round(performance.now() - extractT0);
                logExtractToBrowser('extract response ←', data, {
                    fileName: body.fileName,
                    clientMs,
                });
            }
            const staff = (data.staff || []).map((s, i) => {
                const rankFull = resolveImportedRank(s.rankFull, s.rank, s.rankAbbr);
                return {
                    ...s,
                    firstName: s.firstName || '',
                    lastName: s.lastName || '',
                    rankFull,
                    rank: rankFull,
                    key: s.key || s.no || s._id || `row-${i}`,
                    selected: s.selected !== false && !(s.errors && s.errors.length),
                };
            });
            if (!staff.length) throw new Error('No staff rows found in that file');
            const nextPreview = { ...data, source: data.source || (useCsv ? 'csv' : 'roster'), staff };
            setRawPreview(nextPreview);
            setConfirmedSetup(null);

            if (!useCsv && nextPreview.source === 'roster') {
                const { proposal, ...draft } = draftFromProposal(nextPreview, wardPack);
                setSetupDraft(draft);
                if (wardPack?.confirmedAt && !proposal.needsFullSetup) {
                    const payload = buildRosterSetupPayload({
                        ...draft,
                        legend: draft.legend,
                    });
                    const remapped = applyRosterSetup(nextPreview, {
                        ...payload,
                        leaveByKey: draft.leaveByKey || {},
                    });
                    setConfirmedSetup(payload);
                    setPreview({
                        ...remapped,
                        staff: (remapped.staff || []).map((s, i) => ({
                            ...s,
                            key: s.key || s.no || s._id || `row-${i}`,
                            selected: s.selected !== false,
                        })),
                        source: 'roster',
                    });
                    setStep('review');
                } else {
                    setPreview(nextPreview);
                    setStep('setup');
                }
            } else {
                setSetupDraft(null);
                setPreview(nextPreview);
                setStep('review');
            }
        } catch (err) {
            console.error('[MedRoster] extract failed', err);
            setError(err.message || 'Could not read that file');
        } finally {
            setLoading(false);
            setReading(false);
        }
    };

    const pendingSetupLabels = useMemo(() => {
        if (!setupDraft) return [];
        return (setupDraft.legend || [])
            .filter((e) => e.needsConfirm && !e.userChecked)
            .map((e) => e.label);
    }, [setupDraft]);

    const pendingRoles = useMemo(() => {
        if (!setupDraft?.rolesEssential) return [];
        const missing = [];
        if (!setupDraft.inchargeStaffKey && !setupDraft.inchargeSkipped) missing.push('in-charge');
        if (!setupDraft.assistantStaffKey && !setupDraft.assistantSkipped) missing.push('assistant');
        return missing;
    }, [setupDraft]);

    const setupHasLegendStep = Boolean((setupDraft?.legend || []).length);

    const advanceSetupWizard = () => {
        setError('');
        if (setupSubStep === 0) {
            setSetupDraft((d) => ({
                ...d,
                inchargeSkipped: d.inchargeStaffKey ? d.inchargeSkipped : true,
                assistantSkipped: d.assistantStaffKey ? d.assistantSkipped : true,
                inchargeChecked: true,
                assistantChecked: true,
            }));
            setSetupSubStep(setupHasLegendStep ? 1 : 2);
            return;
        }
        if (setupSubStep === 1) {
            if (pendingSetupLabels.length) {
                setToast({
                    kind: 'warning',
                    message: `Confirm each code first (${pendingSetupLabels.join(', ')}). Pick a meaning, then press Confirm.`,
                });
                return;
            }
            setSetupSubStep(2);
            return;
        }
        applySetupAndReview();
    };

    const applyFreshSetup = (selected = { setup: true }) => {
        if (!rawPreview) return;
        onClearRosterSetup?.({
            setup: true,
            shifts: Boolean(selected.shifts),
            staff: Boolean(selected.staff),
        });
        const { proposal: _freshProposal, ...draft } = draftFromProposal(rawPreview, null);
        // Force every code + role to be re-checked (true clean setup)
        draft.legend = (draft.legend || []).map((e) => ({
            ...e,
            needsConfirm: true,
            userChecked: false,
        }));
        draft.rolesEssential = true;
        draft.inchargeStaffKey = '';
        draft.assistantStaffKey = '';
        draft.inchargeSkipped = false;
        draft.assistantSkipped = false;
        draft.inchargeChecked = false;
        draft.assistantChecked = false;
        setConfirmedSetup(null);
        setSetupDraft(draft);
        setSetupSubStep(0);
        setPreview(null);
        setStep('setup');
        setShowFreshClear(false);
        const extras = [];
        if (selected.shifts) extras.push('shifts');
        if (selected.staff) extras.push('staff');
        setToast({
            kind: 'info',
            message: extras.length
                ? `Cleared setup + ${extras.join(' + ')} — confirm codes and roles below.`
                : 'Saved setup cleared — confirm every code and role below.',
        });
    };

    const startFreshSetup = () => {
        if (!rawPreview) return;
        setShowFreshClear(true);
    };

    const applySetupAndReview = () => {
        if (!rawPreview || !setupDraft) {
            setStep('review');
            return;
        }
        if (pendingRoles.length) {
            setToast({
                kind: 'warning',
                message: `Pick ward ${pendingRoles.join(' and ')} (highlighted). You can skip, but set them if you know who they are.`,
            });
            return;
        }
        if (pendingSetupLabels.length) {
            setToast({
                kind: 'warning',
                message: `Check these codes first: ${pendingSetupLabels.join(', ')}. Pick a meaning (or skip) for each highlighted row.`,
            });
            return;
        }
        const payload = buildRosterSetupPayload(setupDraft);
        const remapped = applyRosterSetup(rawPreview, {
            ...payload,
            leaveByKey: setupDraft.leaveByKey || {},
        });
        const staff = (remapped.staff || []).map((s, i) => ({
            ...s,
            key: s.key || s.no || s._id || `row-${i}`,
            selected: s.selected !== false,
        }));
        setConfirmedSetup(payload);
        setPreview({ ...remapped, staff, source: 'roster' });
        setToast(null);
        setStep('review');
    };

    const updateRow = (key, patch) => {
        setPreview((p) => ({
            ...p,
            staff: p.staff.map((s) => (s.key === key ? { ...s, ...patch } : s)),
        }));
    };

    const confirm = async () => {
        const selected = (preview?.staff || []).filter((s) => s.selected !== false);
        if (!selected.length) { setError('Select at least one staff row'); return; }
        if (isHospital && (!defaultDepartmentId || !defaultWardId)) {
            setError('Pick a default department and ward');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (!isHospital) {
                const days = preview.days || [];
                const staff = toLocalStaff(selected, days);
                const assignments = mapPreviewToAssignments(staff, sandboxShiftTypes());
                const sortedDates = days.map((d) => d.date).filter(Boolean).sort();
                const data = {
                    imported: staff.length,
                    staff: staff.map(({ cells, assignments: _a, ...rest }) => rest),
                    assignments,
                    source: preview.source,
                    title: preview.title || '',
                    startDate: sortedDates[0] || null,
                    endDate: sortedDates[sortedDates.length - 1] || null,
                    rosterSetup: confirmedSetup || null,
                    ruleModes: normalizeRuleModes(ruleModes),
                };
                setResult(data);
                setStep('done');
                onImported?.(data);
                return;
            }
            if (confirmedSetup && defaultWardId) {
                await apiFetch(`/api/hospitals/${hospitalId}/wards/${defaultWardId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ rosterSetup: confirmedSetup }),
                });
            }
            if (preview?.source === 'roster') {
                await apiFetch(`/api/hospitals/${hospitalId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        settings: {
                            ruleModes: normalizeRuleModes(ruleModes),
                        },
                    }),
                });
            }
            let data;
            if (preview.source === 'roster') {
                data = await apiFetch(`/api/hospitals/${hospitalId}/staff/import-roster`, {
                    method: 'POST',
                    body: JSON.stringify({
                        staff: selected,
                        days: preview.days || [],
                        title: preview.title,
                        defaultDepartmentId,
                        defaultWardId,
                        createSchedule: rules.keepGridAsIs,
                        rules,
                    }),
                });
            } else {
                data = await apiFetch(`/api/hospitals/${hospitalId}/staff/import`, {
                    method: 'POST',
                    body: JSON.stringify({
                        staff: selected,
                        defaultDepartmentId,
                        defaultWardId,
                    }),
                });
            }
            setResult({ ...data, rosterSetup: confirmedSetup || null });
            setStep('done');
        } catch (err) {
            setError(err.message || 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    const wardName = wards.find((w) => String(w._id) === String(defaultWardId))?.name || 'this ward';
    const monthLabel = preview?.days?.[0]?.date
        ? new Date(`${preview.days[0].date}T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        : '';
    const stepHint = {
        upload: 'Drop a duty roster photo, PDF, Word, or Excel. We’ll read names and shifts.',
        setup: wardPack?.confirmedAt
            ? 'Only new or unclear codes are shown — the rest comes from this ward’s saved pack.'
            : 'One-time setup for this ward — we’ll remember it for next time.',
        review: 'Tick who to keep. Nothing is saved yet.',
        rules: 'How should we read the file? Core roster rules stay on.',
        done: isHospital
            ? 'People are on this ward. Open the roster when you want to edit shifts.'
            : 'Staff list updated. You can keep editing or export when ready.',
    }[step];

    if (reading) {
        return (
            <div
                className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-[60] sm:max-w-sm pointer-events-none"
                role="status"
                aria-live="polite"
                aria-busy="true"
            >
                <div className="mr-pop-in pointer-events-auto cursor-wait flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-synclly-lg backdrop-blur-md">
                    <div className="relative w-6 h-6 shrink-0">
                        <div className="absolute inset-0 rounded-full bg-ghs-teal/15 animate-pulse" />
                        <div className="absolute inset-0.5 rounded-full border-2 border-slate-200 border-t-ghs-teal animate-spin" />
                    </div>
                    <div className="min-w-0 text-left">
                        <p className="text-sm font-extrabold text-ghs-deep truncate">Reading roster…</p>
                        <p className="text-[11px] font-medium text-ghs-muted truncate mt-0.5">
                            {file?.name || 'Your file'} · you can keep working
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mr-fade fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            {toast && (
                <div
                    className={`fixed top-4 left-4 right-4 md:left-auto md:right-6 md:top-20 z-[60] md:max-w-md px-4 md:px-5 py-3 rounded-2xl shadow-lg border text-sm font-bold ${
                        toast.kind === 'error'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : toast.kind === 'warning'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}
                >
                    {toast.message}
                </div>
            )}
            <div className={`mr-pop-in bg-white rounded-2xl md:rounded-[28px] shadow-xl w-full max-w-[calc(100vw-1.5rem)] p-4 sm:p-6 max-h-[94vh] overflow-y-auto ${
                step === 'review'
                    ? 'md:max-w-6xl'
                    : step === 'setup' || (step === 'review' && showGrid)
                        ? 'md:max-w-5xl'
                        : 'max-w-lg'
            }`}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-extrabold text-ghs-deep leading-tight">
                            {step === 'done' ? 'Imported' : 'Import staff data'}
                        </h3>
                        {step !== 'done' && step !== 'setup' && (
                            <p className="text-[11px] font-medium text-ghs-muted mt-0.5">Photo, PDF, Word, or Excel</p>
                        )}
                        {step !== 'done' && (
                            <p className="text-xs text-ghs-muted font-medium mt-1">{stepHint}</p>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="text-ghs-muted hover:text-ghs-deep text-xl leading-none">×</button>
                </div>

                {step === 'upload' && (
                    <div className="space-y-4">
                        {importIntro && (
                            <div
                                className="rounded-2xl border border-ghs-teal/25 bg-ghs-teal/5 px-4 py-3 flex items-start gap-3"
                                role="status"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-extrabold text-ghs-deep">How import works</p>
                                    <p className="text-[11px] font-medium text-ghs-muted leading-snug mt-0.5">
                                        Upload a duty roster photo, PDF, Word, or Excel — or a CSV staff list. We read
                                        names and shifts, then you match roster letters and choose who to keep before
                                        anything is saved.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setImportIntro(false)}
                                    className="shrink-0 h-8 px-3 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-ghs-deep cursor-pointer"
                                >
                                    Got it
                                </button>
                            </div>
                        )}
                        {isHospital && !lockWard && (
                            <DeptWardPickers
                                departments={departments}
                                wards={wards}
                                defaultDepartmentId={defaultDepartmentId}
                                defaultWardId={defaultWardId}
                                setDefaultDepartmentId={setDefaultDepartmentId}
                                setDefaultWardId={setDefaultWardId}
                            />
                        )}
                        {isHospital && lockWard && (
                            <p className="text-xs font-medium text-ghs-muted">Saving to <span className="font-bold text-ghs-deep">{wardName}</span>.</p>
                        )}
                        <FileDropZone
                            accept={ROSTER_ACCEPT}
                            file={file}
                            onFile={pickFile}
                            title="Drop your roster here, or click to browse"
                            hint="Photo, PDF, Word, or Excel · max 10 MB"
                        />
                    </div>
                )}

                {step === 'setup' && setupDraft && (
                    <>
                        <ImportSetupStepper currentIndex={setupSubStep} />
                        <WardSetupStep
                            subStep={setupSubStep}
                            draft={setupDraft}
                            setDraft={setSetupDraft}
                            wardName={wardName}
                            hasSavedPack={Boolean(wardPack?.confirmedAt) && !setupDraft.rolesEssential}
                            pendingLabels={pendingSetupLabels}
                            onStartFresh={
                                (mode === 'guest' || mode === 'individual') && (wardPack?.confirmedAt || confirmedSetup)
                                    ? startFreshSetup
                                    : null
                            }
                        />
                    </>
                )}

                {step === 'review' && preview && (
                    <ReviewTable
                        preview={preview}
                        updateRow={updateRow}
                        showGrid={showGrid}
                        onToggleGrid={() => setShowGrid((v) => !v)}
                    />
                )}

                {step === 'rules' && (
                    <div className="space-y-6">
                        {isHospital && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-extrabold text-ghs-deep">Import preferences</h3>
                                {[
                                    { key: 'leaveStayOff', label: 'People on leave stay off', hint: 'Do not put them on shifts for those days.' },
                                    { key: 'offAndHolidayStayOff', label: 'Off and holiday stay off', hint: 'O and H cells are not shifts.' },
                                    { key: 'keepGridAsIs', label: 'Keep the uploaded grid', hint: 'Do not auto-generate over what we just read.' },
                                ].map((item) => (
                                    <label key={item.key} className="flex items-start gap-3 p-3 rounded-2xl border border-slate-100 bg-ghs-surface">
                                        <input
                                            type="checkbox"
                                            className="mt-1 accent-ghs-teal"
                                            checked={rules[item.key]}
                                            onChange={(e) => setRules((r) => ({ ...r, [item.key]: e.target.checked }))}
                                        />
                                        <span>
                                            <span className="block text-sm font-extrabold text-ghs-deep">{item.label}</span>
                                            <span className="block text-[11px] font-medium text-ghs-muted mt-0.5">{item.hint}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                        <RuleModesPanel modes={ruleModes} onChange={setRuleModes} />
                    </div>
                )}

                {step === 'done' && result && (
                    <div className="py-4">
                        <p className="text-base font-extrabold text-ghs-deep">
                            {result.imported} {result.imported === 1 ? 'staff member' : 'staff'}
                            {isHospital ? ` on ${wardName}` : ' added'}
                            {monthLabel ? ` for ${monthLabel}` : ''}.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-3 text-xs font-bold text-rose-600">{error}</div>
                )}

                <div className={`flex gap-3 pt-4 ${step === 'setup' ? 'items-center justify-between' : ''}`}>
                    {step === 'setup' ? (
                        <button
                            type="button"
                            onClick={() => {
                                setError('');
                                if (setupSubStep === 0) {
                                    setSetupDraft((d) => ({
                                        ...d,
                                        inchargeSkipped: d.inchargeStaffKey ? d.inchargeSkipped : true,
                                        assistantSkipped: d.assistantStaffKey ? d.assistantSkipped : true,
                                        inchargeChecked: true,
                                        assistantChecked: true,
                                    }));
                                    setSetupSubStep(setupHasLegendStep ? 1 : 2);
                                } else {
                                    setSetupSubStep((s) => Math.max(0, s - 1));
                                }
                            }}
                            className="h-12 px-2 rounded-2xl font-bold text-sm text-ghs-muted hover:text-ghs-deep"
                        >
                            {setupSubStep === 0 ? 'Skip for now' : '‹ Back'}
                        </button>
                    ) : step === 'upload' || step === 'done' ? (
                        <button
                            type="button"
                            onClick={() => {
                                if (step === 'done') {
                                    if (isHospital) onImported?.({ ...result, stayOnWard: true });
                                    else onClose();
                                } else onClose();
                            }}
                            className="flex-1 h-12 rounded-2xl border border-slate-200 font-bold text-sm text-ghs-muted"
                        >
                            {step === 'done' ? (isHospital ? 'Stay on this ward' : 'Done') : 'Close'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setError('');
                                if (step === 'rules') setStep('review');
                                else if (step === 'review') {
                                    if (rawPreview && setupDraft) {
                                        setSetupSubStep(setupHasLegendStep ? 1 : 2);
                                        setStep('setup');
                                    } else {
                                        setStep('upload');
                                        setPreview(null);
                                        setRawPreview(null);
                                        setSetupDraft(null);
                                    }
                                } else if (step === 'setup') {
                                    setStep('upload');
                                    setPreview(null);
                                    setRawPreview(null);
                                    setSetupDraft(null);
                                }
                            }}
                            className="flex-1 h-12 rounded-2xl border border-slate-200 font-bold text-sm text-ghs-muted"
                        >
                            Back
                        </button>
                    )}
                    {step === 'upload' && (
                        <button
                            type="button"
                            disabled={loading || !file}
                            onClick={runParse}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm disabled:opacity-50"
                        >
                            {loading ? 'Reading…' : 'Continue'}
                        </button>
                    )}
                    {step === 'setup' && (
                        <button
                            type="button"
                            onClick={advanceSetupWizard}
                            className="h-12 min-w-[9rem] px-6 rounded-2xl bg-ghs-teal text-white font-bold text-sm shrink-0"
                        >
                            {setupSubStep === 2 ? 'Finish import' : 'Continue ›'}
                        </button>
                    )}
                    {step === 'review' && (
                        <button
                            type="button"
                            disabled={loading || !selectedCount}
                            onClick={() => {
                                setError('');
                                if (preview?.source === 'roster') setStep('rules');
                                else confirm();
                            }}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm disabled:opacity-50"
                        >
                            {preview?.source === 'roster'
                                ? `Continue with ${selectedCount}`
                                : (loading ? 'Saving…' : `Confirm ${selectedCount} staff`)}
                        </button>
                    )}
                    {step === 'rules' && (
                        <button
                            type="button"
                            disabled={loading || !selectedCount}
                            onClick={confirm}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm disabled:opacity-50"
                        >
                            {loading ? 'Saving…' : (isHospital ? 'Save' : `Confirm ${selectedCount} staff`)}
                        </button>
                    )}
                    {step === 'done' && isHospital && result?.scheduleId && (
                        <button
                            type="button"
                            onClick={() => onImported?.({ ...result, openRoster: true })}
                            className="flex-1 h-12 rounded-2xl bg-ghs-teal text-white font-bold text-sm"
                        >
                            Open roster
                        </button>
                    )}
                </div>
            </div>

            {showFreshClear && (
                <ConfirmModal
                    title="Reset setup from this file?"
                    message="Saved codes and roles will be forgotten so you remap everything below. Optionally wipe the roster behind this import too."
                    confirmLabel="Clear selected"
                    danger
                    options={FRESH_SETUP_CLEAR_OPTIONS}
                    onClose={() => setShowFreshClear(false)}
                    onConfirm={(selected) => applyFreshSetup(selected)}
                />
            )}
        </div>
    );
}

function LeaveLegendPanel() {
    const [open, setOpen] = useState(false);
    return (
        <div className="mb-3 rounded-2xl border border-slate-100 bg-ghs-surface overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-white/60"
            >
                <span>
                    <span className="block text-sm font-extrabold text-ghs-deep">
                        Leave guide — how many days?
                    </span>
                    <span className="block text-[11px] font-medium text-ghs-muted mt-0.5">
                        {open ? 'Hide tip sheet' : 'Annual, maternity, sick leave, and more'}
                    </span>
                </span>
                <span className="text-sm font-extrabold text-ghs-teal shrink-0" aria-hidden>
                    {open ? '−' : '+'}
                </span>
            </button>
            {open && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-100/80">
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                        {LEAVE_LEGEND.map((item) => (
                            <div key={item.key} className="text-[11px] leading-snug">
                                <span className="font-extrabold text-ghs-deep">{item.label}</span>
                                <span className="font-bold text-ghs-teal"> · {item.days}</span>
                                <span className="block font-medium text-ghs-muted mt-0.5">{item.note}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] font-medium text-ghs-muted mt-3 leading-snug">
                        Tip: annual leave is counted in work days — weekends stretch the calendar time off. Your ward may give more than the minimum.
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Kind-first chooser for unclear codes: Clinic/OPD vs ward shift vs off/leave vs skip.
 * Does not auto-confirm — parent still requires Confirm.
 */
function LegendKindChooser({
    dutyKind = '',
    meaning = '',
    onKindChange,
    onMeaningChange,
}) {
    const kind = dutyKind || kindFromMeaning(meaning);
    return (
        <div className="mb-2 space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ghs-muted">
                What is this code?
            </p>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Duty kind">
                {LEGEND_KIND_OPTIONS.map((o) => {
                    const active = kind === o.value;
                    return (
                        <button
                            key={o.value}
                            type="button"
                            title={o.hint}
                            onClick={() => onKindChange(o.value)}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                                active
                                    ? 'bg-ghs-teal text-white'
                                    : 'bg-slate-100 text-ghs-muted hover:bg-slate-200 hover:text-ghs-deep'
                            }`}
                        >
                            {o.label}
                        </button>
                    );
                })}
            </div>
            {kind === 'ward' && (
                <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-ghs-muted">
                        Which ward shift?
                    </p>
                    <div className="flex flex-wrap gap-1" role="group" aria-label="Cover shift">
                        {['Morning', 'Afternoon', 'Night'].map((shift) => {
                            const active = meaning === shift;
                            return (
                                <button
                                    key={shift}
                                    type="button"
                                    onClick={() => onMeaningChange(shift)}
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                                        active
                                            ? 'bg-ghs-deep text-white'
                                            : 'bg-white border border-slate-200 text-ghs-muted hover:border-ghs-teal hover:text-ghs-deep'
                                    }`}
                                >
                                    {shift}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            {kind === 'off' && (
                <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-ghs-muted">
                        Not on duty as
                    </p>
                    <div className="flex flex-wrap gap-1" role="group" aria-label="Off type">
                        {['Off', 'Holiday', 'Leave'].map((m) => {
                            const active = meaning === m;
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => onMeaningChange(m)}
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                                        active
                                            ? 'bg-ghs-deep text-white'
                                            : 'bg-white border border-slate-200 text-ghs-muted hover:border-ghs-teal hover:text-ghs-deep'
                                    }`}
                                >
                                    {m}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
            {kind === 'clinic' && (
                <p className="text-[10px] font-medium text-ghs-muted leading-snug">
                    Clinic / OPD — set days below, then Confirm.
                </p>
            )}
            {kind === 'skip' && (
                <p className="text-[10px] font-medium text-ghs-muted leading-snug">
                    This code will be ignored — press Confirm or Skip to finish.
                </p>
            )}
        </div>
    );
}

/** Clinic / OPD = morning-like clinic days; rare option adds Afternoon / Night cover. */
function OfficeClinicPanel({
    officeDays = [],
    dutyOverlaps = ['Morning'],
    onChange,
}) {
    const overlaps = normalizeDutyOverlaps(dutyOverlaps, 'Office');
    const hasExtra = overlaps.includes('Afternoon') || overlaps.includes('Night');
    const [showRare, setShowRare] = useState(hasExtra);
    const selected = Array.isArray(officeDays) ? officeDays : [];
    const regular = isRegularDutyOverlaps(overlaps);

    const emit = (nextDays, nextOverlaps) => {
        const cleaned = normalizeDutyOverlaps(nextOverlaps, 'Office');
        onChange({
            officeDays: OFFICE_DAY_OPTIONS.map((o) => o.value).filter((d) => nextDays.includes(d)),
            dutyOverlaps: cleaned,
            outsideMorning: cleaned.includes('Afternoon') || cleaned.includes('Night'),
        });
    };

    const toggleDay = (day) => {
        const has = selected.includes(day);
        if (has && selected.length === 1) return;
        const next = has ? selected.filter((d) => d !== day) : [...selected, day];
        emit(
            OFFICE_DAY_OPTIONS.map((o) => o.value).filter((d) => next.includes(d)),
            overlaps
        );
    };

    const toggleExtraShift = (shift) => {
        // Morning is always included for Clinic / OPD
        if (shift === 'Morning') return;
        const has = overlaps.includes(shift);
        const next = has
            ? overlaps.filter((s) => s !== shift)
            : [...overlaps, shift];
        emit(selected.length ? selected : defaultOfficeDays('Office'), next);
    };

    const rareOpen = showRare || hasExtra;

    return (
        <div className="mt-1.5 space-y-1.5">
            <p className="text-[10px] font-medium text-ghs-deep leading-snug">
                Morning-like hours (8–2) · separate from ward Morning · no typical take-ups
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-ghs-muted">
                Clinic / OPD days
            </p>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Operating weekdays">
                {OFFICE_DAY_OPTIONS.map((o) => {
                    const active = selected.includes(o.value);
                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => toggleDay(o.value)}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                                active
                                    ? 'bg-ghs-teal text-white'
                                    : 'bg-slate-100 text-ghs-muted hover:bg-slate-200 hover:text-ghs-deep'
                            }`}
                        >
                            {o.label}
                        </button>
                    );
                })}
            </div>
            <p className="text-[10px] font-medium text-ghs-muted leading-snug">
                Like antenatal or polyclinic sessions — often weekdays only.
            </p>
            <button
                type="button"
                onClick={() => setShowRare((v) => !v)}
                className="text-[10px] font-medium text-ghs-muted hover:text-ghs-teal"
            >
                {rareOpen ? 'Hide rare option' : 'Rare: also includes Afternoon or Night…'}
            </button>
            {rareOpen && (
                <div className="rounded-xl border border-slate-100 bg-white/80 p-2.5 space-y-1.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-ghs-muted">
                        Also includes
                    </p>
                    <div className="flex flex-wrap gap-1" role="group" aria-label="Extra cover shifts">
                        {['Morning', 'Afternoon', 'Night'].map((shift) => {
                            const locked = shift === 'Morning';
                            const active = overlaps.includes(shift);
                            return (
                                <button
                                    key={shift}
                                    type="button"
                                    disabled={locked}
                                    title={locked ? 'Clinic / OPD always includes Morning' : `Toggle ${shift}`}
                                    onClick={() => toggleExtraShift(shift)}
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                                        active
                                            ? 'bg-ghs-teal text-white'
                                            : 'bg-slate-100 text-ghs-muted hover:bg-slate-200 hover:text-ghs-deep'
                                    } ${locked ? 'opacity-90 cursor-not-allowed' : ''}`}
                                >
                                    {shift}{locked ? ' (always)' : ''}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] font-medium text-ghs-muted leading-snug">
                        Uncommon — only add Afternoon or Night if this role really covers those sessions.
                    </p>
                    {regular && (
                        <p className="text-[10px] font-bold text-amber-800 leading-snug">
                            All three shifts tagged — treated as a regular cover shift (not Clinic / OPD-only).
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function MeaningPicker({ value, onChange, pending = false, detectedUnit = '' }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);
    const searchRef = useRef(null);

    const options = LEGEND_MEANING_OPTIONS;
    // Step through real meanings first; skip is last (not the default look)
    const cycle = [...LEGEND_MEANINGS, ''];
    const idx = value ? Math.max(0, cycle.indexOf(value)) : 0;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) =>
            `${o.label} ${o.hint} ${o.group} ${o.value}`.toLowerCase().includes(q)
        );
    }, [query, options]);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (ev) => {
            if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    useEffect(() => {
        if (open) {
            setQuery('');
            queueMicrotask(() => searchRef.current?.focus());
        }
    }, [open]);

    const step = (dir) => {
        // From empty/pending, first › lands on Morning (not skip)
        const from = value ? idx : -1;
        const next = cycle[(from + dir + cycle.length) % cycle.length];
        onChange(next);
    };

    const currentLabel = value
        ? (options.find((o) => o.value === value)?.label || value)
        : (pending
            ? (detectedUnit ? `Pick shift (unit: ${detectedUnit})` : 'Pick meaning…')
            : 'Skip / ignore');

    return (
        <div ref={rootRef} className="relative">
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    aria-label="Previous meaning"
                    onClick={() => step(-1)}
                    className="h-9 w-8 shrink-0 rounded-lg border border-slate-100 bg-white text-ghs-muted hover:bg-slate-50 font-bold"
                >
                    ‹
                </button>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className={`flex-1 min-h-9 rounded-lg border bg-white px-2 py-1.5 text-left ${
                        pending ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-100'
                    }`}
                >
                    <span className={`block text-xs font-bold truncate ${pending ? 'text-amber-900' : 'text-ghs-deep'}`}>
                        {currentLabel}
                    </span>
                    {detectedUnit ? (
                        <span className="block text-[10px] font-medium text-ghs-muted truncate mt-0.5">
                            Name: {detectedUnit}
                        </span>
                    ) : pending ? (
                        <span className="block text-[10px] font-medium text-amber-800/80 truncate mt-0.5">
                            Name unknown — edit Name / unit →
                        </span>
                    ) : null}
                </button>
                <button
                    type="button"
                    aria-label="Next meaning"
                    onClick={() => step(1)}
                    className="h-9 w-8 shrink-0 rounded-lg border border-slate-100 bg-white text-ghs-muted hover:bg-slate-50 font-bold"
                >
                    ›
                </button>
            </div>
            {open && (
                <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {detectedUnit && (
                        <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 text-[11px] font-medium text-amber-900 leading-snug">
                            Roster marked this as <span className="font-extrabold">{detectedUnit}</span>
                            {' '}— that is a unit/location. Still pick the shift meaning if this code is also a duty.
                        </div>
                    )}
                    <div className="p-2 border-b border-slate-100">
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search meanings…"
                            className="w-full h-9 rounded-lg border border-slate-100 bg-ghs-surface px-2 text-xs font-medium"
                        />
                    </div>
                    <div className="max-h-52 overflow-y-auto py-1">
                        {['On duty', 'Not on duty'].map((group) => {
                            const rows = filtered.filter((o) => o.group === group);
                            if (!rows.length) return null;
                            return (
                                <div key={group}>
                                    <p className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-ghs-muted">
                                        {group}
                                    </p>
                                    {rows.map((o) => (
                                        <button
                                            key={o.value}
                                            type="button"
                                            className={`w-full text-left px-3 py-2 hover:bg-ghs-teal/5 ${
                                                value === o.value ? 'bg-ghs-teal/10' : ''
                                            }`}
                                            onClick={() => {
                                                onChange(o.value);
                                                setOpen(false);
                                            }}
                                        >
                                            <span className="block text-xs font-extrabold text-ghs-deep">{o.label}</span>
                                            <span className="block text-[10px] font-medium text-ghs-muted mt-0.5">{o.hint}</span>
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                        <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-ghs-teal/5 border-t border-slate-50 ${
                                !value ? 'font-extrabold text-ghs-deep' : 'font-medium text-ghs-muted'
                            }`}
                            onClick={() => {
                                onChange('');
                                setOpen(false);
                            }}
                        >
                            Skip / ignore
                            {detectedUnit ? (
                                <span className="block text-[10px] font-medium text-ghs-muted mt-0.5">
                                    Keep unit “{detectedUnit}” only — no shift
                                </span>
                            ) : null}
                        </button>
                        {!filtered.length && (
                            <p className="px-3 py-3 text-[11px] font-medium text-ghs-muted">No match for “{query}”.</p>
                        )}
                    </div>
                    <div className="px-3 py-1.5 border-t border-slate-100 text-[9px] font-medium text-ghs-muted">
                        {LEGEND_MEANINGS.length} meanings · use ‹ › to step
                    </div>
                </div>
            )}
        </div>
    );
}

function legendKeywordTitle(entry) {
    const dutyKind = entry.dutyKind || kindFromMeaning(entry.meaning || '');
    if (dutyKind === 'skip' && entry.userChecked) {
        return `Ignore · code ${entry.label}`;
    }
    if (entry.meaning) {
        const label = displayMeaningLabel(entry.meaning) || entry.meaning;
        return `${label} · code ${entry.label}`;
    }
    return `Code ${entry.label}`;
}

function legendSelectValue(entry) {
    const dutyKind = entry.dutyKind || kindFromMeaning(entry.meaning || '');
    if (dutyKind === 'skip') return '__ignore__';
    if (entry.meaning) return entry.meaning;
    return '';
}

function applyLegendSelectValue(setLegend, entry, raw) {
    if (!raw) return;
    if (raw === '__ignore__') {
        setLegend(entry.label, {
            meaning: '',
            dutyKind: 'skip',
            dutyOverlaps: [],
            officeDays: [],
            outsideMorning: false,
            needsConfirm: true,
            userChecked: false,
        });
        return;
    }
    if (raw === 'Office') {
        setLegend(entry.label, {
            meaning: 'Office',
            dutyKind: 'clinic',
            dutyOverlaps: defaultDutyOverlaps('Office'),
            officeDays: entry.officeDays?.length ? entry.officeDays : defaultOfficeDays('Office'),
            outsideMorning: Boolean(entry.outsideMorning),
            needsConfirm: true,
            userChecked: false,
        });
        return;
    }
    if (['Off', 'Holiday', 'Leave'].includes(raw)) {
        setLegend(entry.label, {
            meaning: raw,
            dutyKind: 'off',
            dutyOverlaps: [],
            officeDays: [],
            outsideMorning: false,
            needsConfirm: true,
            userChecked: false,
        });
        return;
    }
    setLegend(entry.label, {
        meaning: raw,
        dutyKind: 'ward',
        dutyOverlaps: defaultDutyOverlaps(raw),
        officeDays: [],
        outsideMorning: false,
        needsConfirm: true,
        userChecked: false,
    });
}

function toggleLegendConfirmed(setLegend, entry) {
    const dutyKind = entry.dutyKind || kindFromMeaning(entry.meaning || '');
    const canConfirm = Boolean(entry.meaning) || dutyKind === 'skip';
    const ok = entry.userChecked || (!entry.needsConfirm && entry.meaning);

    if (ok && entry.userChecked) {
        setLegend(entry.label, { needsConfirm: true, userChecked: false });
        return;
    }
    if (!canConfirm) return;
    setLegend(entry.label, {
        needsConfirm: false,
        userChecked: true,
        dutyKind: dutyKind === 'skip' ? 'skip' : (kindFromMeaning(entry.meaning) || dutyKind),
        meaning: dutyKind === 'skip' ? '' : entry.meaning,
    });
}

function LegendCodeRow({ entry, setLegend }) {
    const pending = entry.needsConfirm && !entry.userChecked;
    const ok = entry.userChecked || (!entry.needsConfirm && (entry.meaning || entry.dutyKind === 'skip'));
    const dutyKind = entry.dutyKind || kindFromMeaning(entry.meaning || '');
    const isClinic = entry.meaning === 'Office' || dutyKind === 'clinic';
    const canConfirm = Boolean(entry.meaning) || dutyKind === 'skip';
    const rowTint = pending ? 'bg-amber-50/80' : ok ? 'bg-emerald-50/40' : 'bg-white';

    return (
        <>
            <tr className={rowTint}>
                <td className="p-2 align-top w-[50%] min-h-[5.5rem]">
                    <div className="min-h-[5.5rem] flex flex-col justify-start">
                        <p className="text-sm font-extrabold text-ghs-deep leading-snug">{legendKeywordTitle(entry)}</p>
                        {(entry.codeHint || codePlainHint(entry.label)) ? (
                            <p className="text-[10px] font-medium text-ghs-muted mt-0.5 leading-snug">
                                {entry.codeHint || codePlainHint(entry.label)}
                            </p>
                        ) : null}
                        <select
                            className={`w-full h-9 mt-2 rounded-lg border bg-white px-2 text-xs font-semibold ${
                                pending ? 'border-amber-300' : 'border-slate-100'
                            }`}
                            value={legendSelectValue(entry)}
                            onChange={(ev) => applyLegendSelectValue(setLegend, entry, ev.target.value)}
                            aria-label={`Meaning for code ${entry.label}`}
                        >
                            <option value="">Choose meaning…</option>
                            <optgroup label="Off / leave">
                                <option value="Leave">Leave</option>
                                <option value="Off">Off</option>
                                <option value="Holiday">Holiday</option>
                            </optgroup>
                            <optgroup label="Ward cover">
                                <option value="Morning">Morning</option>
                                <option value="Afternoon">Afternoon</option>
                                <option value="Night">Night</option>
                            </optgroup>
                            <optgroup label="Other">
                                <option value="Office">Clinic / OPD</option>
                                <option value="__ignore__">Ignore this letter</option>
                            </optgroup>
                        </select>
                    </div>
                </td>
                <td className="p-2 align-top w-[38%]">
                    <input
                        className="w-full h-9 rounded-lg border border-slate-100 bg-white px-2 text-xs font-medium"
                        value={entry.unit || ''}
                        placeholder="Clinic or unit name (if needed)"
                        title="e.g. Antenatal, Ultrasound, General X-ray"
                        aria-label={`Unit name for code ${entry.label}`}
                        onChange={(ev) => setLegend(entry.label, {
                            unit: ev.target.value,
                            needsConfirm: pending ? true : entry.needsConfirm,
                            userChecked: pending ? false : entry.userChecked,
                        })}
                    />
                </td>
                <td className="p-2 align-top w-[12%] text-center">
                    <button
                        type="button"
                        disabled={!canConfirm}
                        onClick={() => toggleLegendConfirmed(setLegend, entry)}
                        aria-label={ok ? 'Confirmed — tap to edit' : 'Confirm this letter'}
                        className={`w-10 h-10 mx-auto rounded-full border-2 flex items-center justify-center text-sm font-extrabold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            ok
                                ? 'border-ghs-teal bg-ghs-teal text-white'
                                : pending
                                    ? 'border-amber-400 bg-white text-amber-700'
                                    : 'border-slate-200 bg-white text-ghs-muted'
                        }`}
                    >
                        {ok ? '✓' : ''}
                    </button>
                </td>
            </tr>
            {isClinic && dutyKind !== 'skip' && (
                <tr className={rowTint}>
                    <td colSpan={3} className="px-2 pb-3 pt-0">
                        <OfficeClinicPanel
                            officeDays={entry.officeDays?.length ? entry.officeDays : defaultOfficeDays('Office')}
                            dutyOverlaps={entry.dutyOverlaps?.length ? entry.dutyOverlaps : defaultDutyOverlaps('Office')}
                            onChange={(patch) => setLegend(entry.label, {
                                ...patch,
                                dutyKind: 'clinic',
                                meaning: 'Office',
                                needsConfirm: true,
                                userChecked: false,
                            })}
                        />
                    </td>
                </tr>
            )}
        </>
    );
}

const SETUP_WIZARD_STEPS = [
    { id: 'roles', label: 'Roles' },
    { id: 'codes', label: 'Roster codes' },
    { id: 'leave', label: 'Leave' },
];

function ImportSetupStepper({ currentIndex }) {
    return (
        <div className="flex items-center w-full mb-5" aria-label="Import setup progress">
            {SETUP_WIZARD_STEPS.map((s, i) => {
                const done = i < currentIndex;
                const active = i === currentIndex;
                return (
                    <div key={s.id} className={`flex items-center min-w-0 ${i < SETUP_WIZARD_STEPS.length - 1 ? 'flex-1' : ''}`}>
                        <div className="flex items-center gap-2 shrink-0">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border-2 ${
                                    done
                                        ? 'bg-ghs-teal border-ghs-teal text-white'
                                        : active
                                            ? 'border-ghs-teal text-ghs-teal bg-white'
                                            : 'border-slate-200 text-slate-400 bg-white'
                                }`}
                            >
                                {done ? '✓' : i + 1}
                            </div>
                            <span
                                className={`text-sm font-bold truncate ${
                                    active || done ? 'text-ghs-deep' : 'text-ghs-muted'
                                }`}
                            >
                                {s.label}
                            </span>
                        </div>
                        {i < SETUP_WIZARD_STEPS.length - 1 && (
                            <div
                                className={`h-0.5 flex-1 mx-2 min-w-[0.75rem] rounded-full ${
                                    i < currentIndex ? 'bg-ghs-teal' : 'bg-slate-200'
                                }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function staffAvatarInitial(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1] || parts[0] || '?';
    return last.charAt(0).toUpperCase();
}

function SetupLeaveStaffRow({ person, leave, onToggle, onLeaveTypeChange }) {
    const onLeave = Boolean(leave?.onLeave);
    const leaveKey = leave?.leaveType || person.leaveType || 'annual';

    return (
        <div className="flex items-center gap-3 p-3 bg-white">
            <input
                type="checkbox"
                className="w-5 h-5 accent-ghs-teal shrink-0"
                checked={onLeave}
                onChange={(e) => onToggle(person.key, e.target.checked)}
            />
            <div className="w-9 h-9 rounded-full bg-ghs-teal/10 text-ghs-teal flex items-center justify-center text-sm font-extrabold shrink-0">
                {staffAvatarInitial(person.name)}
            </div>
            <span className="flex-1 text-sm font-bold text-ghs-deep min-w-0 truncate">{person.name}</span>
            {onLeave && (
                <select
                    className="h-10 max-w-[min(100%,14rem)] rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold shrink-0"
                    value={leaveKey}
                    onChange={(e) => onLeaveTypeChange(person.key, e.target.value)}
                >
                    {LEAVE_LEGEND.map((item) => (
                        <option key={item.key} value={item.key}>
                            {item.label} · {item.days}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}

function SetupRoleCard({
    icon,
    title,
    staffKey,
    skipped,
    roleGuesses,
    onChange,
}) {
    const selected = roleGuesses.find((r) => r.key === staffKey);
    const status = selected ? selected.name : skipped ? 'Skipped' : 'Not set';
    const statusTone = selected
        ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
        : skipped
            ? 'bg-slate-100 text-ghs-muted border-slate-100'
            : 'bg-amber-50 text-amber-900 border-amber-100';

    return (
        <div className="rounded-2xl border border-slate-100 bg-ghs-surface p-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-ghs-teal shrink-0">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-extrabold text-ghs-deep">{title}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusTone}`}>
                            {status}
                        </span>
                    </div>
                    <select
                        className="w-full h-11 mt-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                        value={staffKey || ''}
                        onChange={(e) => onChange(e.target.value)}
                    >
                        <option value="">Choose a staff member…</option>
                        {roleGuesses.map((r) => (
                            <option key={r.key} value={r.key}>
                                {r.name}{r.rank ? ` · ${r.rank}` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}

function LegendCodeCard({ entry, setLegend }) {
    const pending = entry.needsConfirm && !entry.userChecked;
    const ok = entry.userChecked || (!entry.needsConfirm && (entry.meaning || entry.dutyKind === 'skip'));
    const dutyKind = entry.dutyKind || kindFromMeaning(entry.meaning || '');
    const isClinic = entry.meaning === 'Office' || dutyKind === 'clinic';
    const canConfirm = Boolean(entry.meaning) || dutyKind === 'skip';
    const needsUnit = entry.meaning === 'Office' && !String(entry.unit || '').trim();
    const title = entry.meaning
        ? displayMeaningLabel(entry.meaning)
        : (entry.label || '?');
    const subtitle = entry.codeHint || codePlainHint(entry.label) || '';

    return (
        <div
            className={`rounded-2xl border p-4 ${
                needsUnit && !ok
                    ? 'border-amber-200 bg-amber-50/40'
                    : ok
                        ? 'border-slate-100 bg-white'
                        : 'border-slate-100 bg-ghs-surface'
            }`}
        >
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-ghs-teal/10 text-ghs-teal flex items-center justify-center text-sm font-extrabold shrink-0">
                    {entry.label}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-extrabold text-ghs-deep">{title}</p>
                            {subtitle ? (
                                <p className="text-[11px] font-medium text-ghs-muted mt-0.5">{subtitle}</p>
                            ) : null}
                            {needsUnit && !ok ? (
                                <p className="text-[11px] font-bold text-amber-800 mt-0.5">Needs a unit name</p>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            disabled={!canConfirm}
                            onClick={() => toggleLegendConfirmed(setLegend, entry)}
                            className={`shrink-0 h-9 px-3 rounded-xl text-xs font-extrabold border transition-colors disabled:opacity-40 ${
                                ok
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-white border-slate-200 text-ghs-deep hover:border-ghs-teal'
                            }`}
                        >
                            {ok ? '✓ Confirmed' : '✓ Confirm'}
                        </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 mt-3">
                        <select
                            className={`h-10 rounded-xl border bg-white px-3 text-sm font-semibold ${
                                pending ? 'border-amber-300' : 'border-slate-200'
                            }`}
                            value={legendSelectValue(entry)}
                            onChange={(ev) => applyLegendSelectValue(setLegend, entry, ev.target.value)}
                            aria-label={`Meaning for code ${entry.label}`}
                        >
                            <option value="">Choose meaning…</option>
                            <optgroup label="Off / leave">
                                <option value="Leave">Leave</option>
                                <option value="Off">Off</option>
                                <option value="Holiday">Holiday</option>
                            </optgroup>
                            <optgroup label="Ward cover">
                                <option value="Morning">Morning</option>
                                <option value="Afternoon">Afternoon</option>
                                <option value="Night">Night</option>
                            </optgroup>
                            <optgroup label="Other">
                                <option value="Office">Clinic / OPD</option>
                                <option value="__ignore__">Ignore this letter</option>
                            </optgroup>
                        </select>
                        <input
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium"
                            value={entry.unit || ''}
                            placeholder="Unit name (optional)"
                            aria-label={`Unit name for code ${entry.label}`}
                            onChange={(ev) => setLegend(entry.label, {
                                unit: ev.target.value,
                                needsConfirm: pending ? true : entry.needsConfirm,
                                userChecked: pending ? false : entry.userChecked,
                            })}
                        />
                    </div>
                    {isClinic && dutyKind !== 'skip' && (
                        <div className="mt-3">
                            <OfficeClinicPanel
                                officeDays={entry.officeDays?.length ? entry.officeDays : defaultOfficeDays('Office')}
                                dutyOverlaps={entry.dutyOverlaps?.length ? entry.dutyOverlaps : defaultDutyOverlaps('Office')}
                                onChange={(patch) => setLegend(entry.label, {
                                    ...patch,
                                    dutyKind: 'clinic',
                                    meaning: 'Office',
                                    needsConfirm: true,
                                    userChecked: false,
                                })}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function WardSetupStep({
    subStep = 0,
    draft,
    setDraft,
    wardName,
    hasSavedPack,
    pendingLabels = [],
    onStartFresh = null,
}) {
    const allStaff = draft.roleGuesses || [];
    const leaveFromUpload = useMemo(
        () => allStaff.filter((r) => r.leaveLikely || r.leaveType),
        [allStaff]
    );
    const leaveRest = useMemo(() => {
        const flaggedKeys = new Set(leaveFromUpload.map((r) => r.key));
        return allStaff
            .filter((r) => !flaggedKeys.has(r.key))
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    }, [allStaff, leaveFromUpload]);
    const leaveFromUploadSorted = useMemo(
        () => [...leaveFromUpload].sort((a, b) => String(a.name).localeCompare(String(b.name))),
        [leaveFromUpload]
    );

    const toggleLeave = (key, checked, defaultLeaveType = 'annual') => {
        setDraft((d) => {
            const next = { ...(d.leaveByKey || {}) };
            if (checked) {
                const person = allStaff.find((r) => r.key === key);
                next[key] = {
                    onLeave: true,
                    leaveType: next[key]?.leaveType || person?.leaveType || defaultLeaveType,
                };
            } else {
                delete next[key];
            }
            return { ...d, leaveByKey: next };
        });
    };

    const setLeaveType = (key, leaveType) => {
        setDraft((d) => ({
            ...d,
            leaveByKey: {
                ...(d.leaveByKey || {}),
                [key]: { onLeave: true, leaveType },
            },
        }));
    };

    const legendRows = useMemo(
        () => [...(draft.legend || [])].sort((a, b) => String(a.label).localeCompare(String(b.label))),
        [draft.legend]
    );
    const confirmedCount = legendRows.filter(
        (e) => e.userChecked || (!e.needsConfirm && (e.meaning || e.dutyKind === 'skip'))
    ).length;

    const setLegend = (label, patch) => {
        setDraft((d) => ({
            ...d,
            legend: (d.legend || []).map((e) => (e.label === label ? { ...e, ...patch } : e)),
        }));
    };

    if (subStep === 0) {
        return (
            <div className="space-y-4">
                <div>
                    <h4 className="text-base font-extrabold text-ghs-deep">Who runs this ward?</h4>
                    <p className="text-sm font-medium text-ghs-muted mt-1">
                        Pick the in-charge and assistant. Not sure yet? You can skip and set this later.
                    </p>
                    {onStartFresh ? (
                        <button
                            type="button"
                            onClick={onStartFresh}
                            className="mt-2 text-[11px] font-bold text-ghs-teal hover:underline underline-offset-2"
                        >
                            Reset saved setup from this file
                        </button>
                    ) : null}
                </div>
                <div className="space-y-3">
                    <SetupRoleCard
                        title="Ward in-charge"
                        staffKey={draft.inchargeStaffKey}
                        skipped={draft.inchargeSkipped}
                        roleGuesses={draft.roleGuesses || []}
                        icon={(
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        )}
                        onChange={(key) => setDraft((d) => ({
                            ...d,
                            inchargeStaffKey: key,
                            inchargeSkipped: false,
                            inchargeChecked: true,
                        }))}
                    />
                    <SetupRoleCard
                        title="Assistant in-charge"
                        staffKey={draft.assistantStaffKey}
                        skipped={draft.assistantSkipped}
                        roleGuesses={draft.roleGuesses || []}
                        icon={(
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        )}
                        onChange={(key) => setDraft((d) => ({
                            ...d,
                            assistantStaffKey: key,
                            assistantSkipped: false,
                            assistantChecked: true,
                        }))}
                    />
                </div>
            </div>
        );
    }

    if (subStep === 1) {
        return (
            <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h4 className="text-base font-extrabold text-ghs-deep">What do the roster letters mean?</h4>
                        <p className="text-sm font-medium text-ghs-muted mt-1">
                            Confirm each code. Add a unit name where it applies.
                        </p>
                    </div>
                    {legendRows.length > 0 && (
                        <p className="text-sm font-bold text-ghs-muted shrink-0 pt-0.5">
                            {confirmedCount}/{legendRows.length} confirmed
                        </p>
                    )}
                </div>
                <div className="rounded-2xl border border-ghs-teal/20 bg-ghs-teal/5 px-4 py-3 flex gap-2 text-[11px] font-medium text-ghs-deep leading-snug">
                    <span className="text-ghs-teal font-extrabold shrink-0" aria-hidden>i</span>
                    <span>
                        <span className="font-bold">P</span> = Polyclinic ·{' '}
                        <span className="font-bold">XM / XA / XN</span> = X-ray morning / afternoon / night ·{' '}
                        <span className="font-bold">M / A / N</span> = ward cover
                    </span>
                </div>
                {legendRows.length > 0 ? (
                    <div className="space-y-3 max-h-[min(52vh,28rem)] overflow-y-auto pr-1">
                        {legendRows.map((e) => (
                            <LegendCodeCard key={e.label} entry={e} setLegend={setLegend} />
                        ))}
                    </div>
                ) : (
                    <p className="text-sm font-medium text-ghs-muted">
                        All codes already mapped for {wardName || 'this ward'}.
                        {hasSavedPack ? ' Continue to leave.' : ''}
                    </p>
                )}
                {pendingLabels.length > 0 && (
                    <p className="text-[11px] font-bold text-amber-800">
                        {pendingLabels.length} code{pendingLabels.length === 1 ? '' : 's'} still need confirmation.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h4 className="text-base font-extrabold text-ghs-deep">Who&apos;s on leave?</h4>
                <p className="text-sm font-medium text-ghs-muted mt-1">
                    Everyone from this import is listed. We pre-tick people your roster marked on leave — untick if
                    that&apos;s wrong, or tick anyone else who should be on leave.
                </p>
            </div>
            <LeaveLegendPanel />
            {allStaff.length > 0 ? (
                <div className="space-y-4 max-h-[min(52vh,28rem)] overflow-y-auto pr-1">
                    {leaveFromUploadSorted.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1 mb-2">
                                On leave in uploaded roster
                            </p>
                            <div className="rounded-2xl border border-ghs-teal/25 overflow-hidden divide-y divide-slate-100 bg-ghs-teal/[0.03]">
                                {leaveFromUploadSorted.map((r) => (
                                    <SetupLeaveStaffRow
                                        key={r.key}
                                        person={r}
                                        leave={draft.leaveByKey?.[r.key]}
                                        onToggle={toggleLeave}
                                        onLeaveTypeChange={setLeaveType}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    {leaveRest.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1 mb-2">
                                {leaveFromUploadSorted.length > 0 ? 'Everyone else' : 'All staff'}
                            </p>
                            <div className="rounded-2xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                                {leaveRest.map((r) => (
                                    <SetupLeaveStaffRow
                                        key={r.key}
                                        person={r}
                                        leave={draft.leaveByKey?.[r.key]}
                                        onToggle={toggleLeave}
                                        onLeaveTypeChange={setLeaveType}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-sm font-medium text-ghs-muted rounded-2xl border border-slate-100 bg-ghs-surface p-4">
                    No staff rows in this import.
                </p>
            )}
        </div>
    );
}

function FileDropZone({ accept, file, onFile, title, hint }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const pick = (next) => {
        if (!next) return;
        onFile(next);
    };

    return (
        <div>
            <p className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1 mb-2">
                Upload file here
            </p>
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragging(false);
                    pick(e.dataTransfer.files?.[0] || null);
                }}
                className={`w-full rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors cursor-pointer ${
                    dragging
                        ? 'border-ghs-teal bg-ghs-teal/10'
                        : file
                            ? 'border-ghs-teal/40 bg-ghs-teal/5'
                            : 'border-slate-200 bg-ghs-surface hover:border-ghs-teal hover:bg-ghs-teal/5'
                }`}
            >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-100 text-ghs-teal">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>
                <p className="text-sm font-extrabold text-ghs-deep">
                    {file ? file.name : title}
                </p>
                <p className="text-[11px] font-medium text-ghs-muted mt-1.5 leading-snug">
                    {file ? 'Click to choose a different file' : hint}
                </p>
            </button>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="sr-only"
                onChange={(e) => {
                    pick(e.target.files?.[0] || null);
                    e.target.value = '';
                }}
            />
        </div>
    );
}

function DeptWardPickers({ departments, wards, defaultDepartmentId, defaultWardId, setDefaultDepartmentId, setDefaultWardId }) {
    const departmentWards = wards.filter((w) => String(w.departmentId) === String(defaultDepartmentId));
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Default department</label>
                <select
                    value={defaultDepartmentId}
                    onChange={(e) => {
                        setDefaultDepartmentId(e.target.value);
                        const first = wards.find((w) => String(w.departmentId) === e.target.value);
                        setDefaultWardId(first?._id || '');
                    }}
                    className="w-full h-11 mt-1 rounded-xl border border-slate-100 bg-ghs-surface px-3 text-sm"
                >
                    <option value="">—</option>
                    {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">Default ward</label>
                <select
                    value={defaultWardId}
                    onChange={(e) => setDefaultWardId(e.target.value)}
                    className="w-full h-11 mt-1 rounded-xl border border-slate-100 bg-ghs-surface px-3 text-sm"
                >
                    <option value="">—</option>
                    {(departmentWards.length ? departmentWards : wards).map((w) => (
                        <option key={w._id} value={w._id}>{w.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function ReviewRankSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);
    const searchRef = useRef(null);
    const current = value || '';

    const grouped = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rows = [];
        for (const cat of STAFF_CATEGORIES) {
            const ranks = (RANKS_BY_CATEGORY[cat] || []).filter((r) =>
                !q || r.toLowerCase().includes(q) || cat.toLowerCase().includes(q)
            );
            if (ranks.length) rows.push({ cat, ranks });
        }
        if (current && !Object.values(RANKS_BY_CATEGORY).some((list) => list.includes(current))) {
            if (!q || current.toLowerCase().includes(q)) {
                rows.unshift({ cat: 'From file', ranks: [current] });
            }
        }
        return rows;
    }, [query, current]);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (ev) => {
            if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    useEffect(() => {
        if (open) {
            setQuery('');
            queueMicrotask(() => searchRef.current?.focus());
        }
    }, [open]);

    return (
        <div ref={rootRef} className="relative min-w-[8rem] md:min-w-[11rem]">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`w-full h-10 rounded-xl border bg-white px-2.5 text-left text-xs font-bold truncate ${
                    current ? 'border-slate-100 text-ghs-deep' : 'border-amber-200 text-amber-800'
                }`}
            >
                {current || '— pick rank —'}
            </button>
            {open && (
                <div className="absolute z-30 left-0 right-0 mt-1 min-w-[12rem] md:min-w-[16rem] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search rank…"
                            className="w-full h-9 rounded-lg border border-slate-100 bg-ghs-surface px-2 text-xs font-medium"
                        />
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-ghs-teal/5 ${
                                !current ? 'bg-ghs-teal/10 font-extrabold text-ghs-deep' : 'font-medium text-ghs-muted'
                            }`}
                            onClick={() => {
                                onChange('');
                                setOpen(false);
                            }}
                        >
                            Clear rank
                        </button>
                        {grouped.map(({ cat, ranks }) => (
                            <div key={cat}>
                                <p className="px-3 pt-2.5 pb-1 text-[11px] font-extrabold text-ghs-deep">
                                    {cat}
                                </p>
                                {ranks.map((r) => (
                                    <button
                                        key={`${cat}-${r}`}
                                        type="button"
                                        className={`w-full text-left px-3 py-1.5 pl-4 text-xs font-medium hover:bg-ghs-teal/5 ${
                                            current === r ? 'bg-ghs-teal/10 font-bold text-ghs-teal' : 'text-ghs-muted'
                                        }`}
                                        onClick={() => {
                                            onChange(r);
                                            setOpen(false);
                                        }}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        ))}
                        {!grouped.length && (
                            <p className="px-3 py-3 text-[11px] font-medium text-ghs-muted">
                                No rank matches “{query}”.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ReviewTable({ preview, updateRow, showGrid, onToggleGrid }) {
    const days = preview.days || [];
    return (
        <div className="space-y-4">
            {preview.title && (
                <p className="text-xs font-bold text-ghs-deep">
                    {preview.title}
                    {preview.aiUsed ? <span className="ml-2 font-medium text-ghs-muted">· AI extract</span> : <span className="ml-2 font-medium text-ghs-muted">· grid parse</span>}
                </p>
            )}
            {preview.source === 'roster' && (
                <button type="button" onClick={onToggleGrid} className="text-[11px] font-bold text-ghs-teal">
                    {showGrid ? 'Hide day grid' : 'Show day grid'}
                </button>
            )}
            <div className="overflow-auto max-h-[min(72vh,720px)] border border-slate-100 rounded-2xl">
                <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr className="text-left text-[10px] uppercase tracking-wider text-ghs-muted">
                            <th className="p-2 w-10">In</th>
                            <th className="p-2 min-w-[7rem] md:min-w-[9rem]">Name</th>
                            <th className="p-2 min-w-[8rem] md:min-w-[12rem]">Rank</th>
                            {preview.source === 'csv' && <th className="p-2">Phone</th>}
                            {preview.source === 'roster' && showGrid && days.slice(0, 16).map((d) => (
                                <th key={d.date} className="p-1 font-bold text-center">{d.dayNum || d.dow}</th>
                            ))}
                            <th className="p-2 min-w-[10rem] md:min-w-[16rem] md:w-[28%]">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(preview.staff || []).map((s) => {
                            const noteValue = s.leaveNote || s.notes || (s.errors || []).join('; ') || '';
                            return (
                                <tr key={s.key} className={s.selected === false ? 'opacity-40' : 'align-top'}>
                                    <td className="p-2 pt-3">
                                        <input
                                            type="checkbox"
                                            checked={s.selected !== false}
                                            onChange={(e) => updateRow(s.key, { selected: e.target.checked })}
                                        />
                                    </td>
                                    <td className="p-2 min-w-[7rem] md:min-w-[9rem]">
                                        <input
                                            className="w-full h-10 rounded-xl border border-slate-100 bg-white px-2 font-bold text-ghs-deep"
                                            value={`${s.firstName || ''} ${s.lastName || ''}`.trim()}
                                            onChange={(e) => {
                                                const parts = e.target.value.trim().split(/\s+/);
                                                updateRow(s.key, { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') });
                                            }}
                                        />
                                    </td>
                                    <td className="p-2 min-w-[8rem] md:min-w-[12rem]">
                                        <ReviewRankSelect
                                            value={s.rankFull || s.rank || ''}
                                            onChange={(rank) => updateRow(s.key, { rankFull: rank, rank })}
                                        />
                                        {s.rankAbbr && !s.rankFull && (
                                            <div className="text-[10px] text-ghs-muted mt-1 px-1">{s.rankAbbr}</div>
                                        )}
                                    </td>
                                    {preview.source === 'csv' && (
                                        <td className="p-2 pt-3">{s.phone || '—'}</td>
                                    )}
                                    {preview.source === 'roster' && showGrid && days.slice(0, 16).map((d) => {
                                        const cell = (s.cells || []).find((c) => c.date === d.date);
                                        return (
                                            <td key={d.date} className="p-1 text-center font-bold pt-3" title={cell?.unit || cell?.text || ''}>
                                                <div>{cell?.code || cell?.text || ''}</div>
                                            </td>
                                        );
                                    })}
                                    <td className="p-2 min-w-[10rem] md:min-w-[16rem]">
                                        <textarea
                                            rows={2}
                                            className="w-full min-h-[2.75rem] rounded-xl border border-slate-100 bg-white px-2.5 py-2 text-xs font-medium text-ghs-deep resize-y leading-snug"
                                            placeholder="Leave type, unit tip, or anything to remember…"
                                            value={noteValue}
                                            onChange={(e) => updateRow(s.key, {
                                                leaveNote: e.target.value,
                                                notes: e.target.value,
                                            })}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

