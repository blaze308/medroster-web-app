'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
    STAFF_CATEGORIES,
    RANKS_BY_CATEGORY,
    QUALIFICATIONS,
    EMPLOYMENT_STATUSES,
    WARD_ROLES,
    MIN_ANNUAL_LEAVE_DAYS,
} from '../../lib/ghana-data';
import { LeaveManagerPanel } from './LeaveModal';

const BASE_SECTIONS = [
    { id: 'personal', label: 'Personal' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PREFERRED_SHIFTS = ['Morning', 'Afternoon'];

function emptyStaff(departmentId) {
    return {
        firstName: '',
        lastName: '',
        phone: '',
        category: 'Nurse',
        rank: '',
        qualification: '',
        specialization: '',
        dateHired: '',
        employmentStatus: 'Active',
        annualLeaveBalance: MIN_ANNUAL_LEAVE_DAYS,
        departmentId: departmentId || '',
        wardId: '',
        wardRole: 'regular',
        isRotation: false,
        workRestriction: 'none',
        noNightShift: false,
        maternityNoNight: false,
        preferredOffDays: [],
        preferredShifts: [],
    };
}

function toDateInput(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString().split('T')[0];
}

export default function StaffFormModal({ hospitalId, departments, wards = [], staff, defaultDepartmentId, defaultWardId, onClose, onSaved }) {
    const isEdit = !!staff;
    const sectionTabs = useMemo(() => {
        if (!isEdit) return BASE_SECTIONS;
        return [...BASE_SECTIONS, { id: 'leave', label: 'Leave' }];
    }, [isEdit]);

    const [active, setActive] = useState('personal');
    const [form, setForm] = useState(() => {
        if (staff) {
            return {
                ...emptyStaff(staff.departmentId),
                ...staff,
                dateHired: toDateInput(staff.dateHired),
            };
        }
        return { ...emptyStaff(defaultDepartmentId), wardId: defaultWardId || '' };
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [leaveSnapshot, setLeaveSnapshot] = useState(null);

    useEffect(() => {
        if (!isEdit) {
            setActive('personal');
            setLeaveSnapshot(null);
            return;
        }
        if (!staff?._id) return;
        setLeaveSnapshot({
            _id: staff._id,
            firstName: staff.firstName,
            lastName: staff.lastName,
            annualLeaveBalance: staff.annualLeaveBalance,
            leaveRecords: staff.leaveRecords || [],
        });
    }, [isEdit, staff]);

    const refreshLeaveFromServer = async () => {
        if (!staff?._id) return;
        try {
            const s = await apiFetch(`/api/hospitals/${hospitalId}/staff/${staff._id}`);
            setLeaveSnapshot({
                _id: s._id,
                firstName: s.firstName,
                lastName: s.lastName,
                annualLeaveBalance: s.annualLeaveBalance,
                leaveRecords: s.leaveRecords || [],
            });
            setForm((f) => ({
                ...f,
                annualLeaveBalance: s.annualLeaveBalance ?? f.annualLeaveBalance,
                leaveRecords: s.leaveRecords || [],
            }));
        } catch {
            // Non-critical refresh failure — silently ignore
        }
    };

    const ranks = useMemo(() => {
        const list = RANKS_BY_CATEGORY[form.category] || RANKS_BY_CATEGORY.Other;
        if (form.rank && !list.includes(form.rank)) return [form.rank, ...list];
        return list;
    }, [form.category, form.rank]);
    const departmentWards = useMemo(
        () => wards.filter((ward) => String(ward.departmentId) === String(form.departmentId)),
        [wards, form.departmentId]
    );

    const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const toggleArrayValue = (key, value) => {
        setForm((f) => {
            const current = Array.isArray(f[key]) ? f[key] : [];
            return {
                ...f,
                [key]: current.includes(value)
                    ? current.filter((item) => item !== value)
                    : [...current, value],
            };
        });
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();
        if (!form.firstName.trim() || !form.lastName.trim()) {
            setError('First and last name are required');
            setActive('personal');
            return;
        }
        if (!form.departmentId || !form.wardId) {
            setError('Department and ward are required');
            setActive('personal');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const url = isEdit
                ? `/api/hospitals/${hospitalId}/staff/${staff._id}`
                : `/api/hospitals/${hospitalId}/staff`;
            const method = isEdit ? 'PATCH' : 'POST';

            const payload = {
                firstName: form.firstName,
                lastName: form.lastName,
                phone: form.phone,
                category: form.category,
                rank: form.rank,
                qualification: form.qualification,
                specialization: form.specialization,
                dateHired: form.dateHired || null,
                employmentStatus: form.employmentStatus,
                annualLeaveBalance: Number(form.annualLeaveBalance) || 0,
                departmentId: form.departmentId,
                wardId: form.wardId,
                wardRole: form.wardRole,
                isRotation: Boolean(form.isRotation),
                workRestriction: form.workRestriction,
                noNightShift: Boolean(form.noNightShift),
                maternityNoNight: Boolean(form.maternityNoNight),
                preferredOffDays: form.preferredOffDays || [],
                preferredShifts: form.preferredShifts || [],
            };

            const data = await apiFetch(url, { method, body: JSON.stringify(payload) });
            onSaved(data);
        } catch (err) {
            setError(err.message || 'Failed to save staff');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-3xl bg-white rounded-[40px] overflow-hidden shadow-synclly-lg border border-slate-50 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 max-h-[90vh] flex flex-col">
                <div className="px-4 sm:px-6 md:px-10 pt-6 sm:pt-8 md:pt-10 pb-4 border-b border-slate-100">
                    <h2 className="text-xl md:text-2xl font-extrabold text-synclly-deep tracking-tight">
                        {isEdit ? 'Edit Staff Member' : 'Add Staff Member'}
                    </h2>
                    <p className="text-synclly-muted font-medium text-sm mt-1">
                        Full profile for rostering — name, rank, ward, and shift preferences.
                    </p>

                    <div className="flex gap-2 mt-6 overflow-x-auto -mx-1 px-1">
                        {sectionTabs.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => setActive(s.id)}
                                className={`shrink-0 px-4 h-9 rounded-xl text-[11px] font-bold transition-all ${
                                    active === s.id
                                        ? 'bg-synclly-coral text-white shadow-md shadow-synclly-coral/20'
                                        : 'bg-synclly-surface text-synclly-muted hover:text-synclly-deep'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                    <div className="px-4 sm:px-6 md:px-10 py-6 md:py-8 space-y-6">
                        {active === 'personal' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="First Name" required>
                                    <Input value={form.firstName} onChange={(v) => update('firstName', v)} placeholder="Akosua" />
                                </Field>
                                <Field label="Last Name" required>
                                    <Input value={form.lastName} onChange={(v) => update('lastName', v)} placeholder="Mensah" />
                                </Field>
                                <Field label="Phone">
                                    <Input value={form.phone} onChange={(v) => update('phone', v)} placeholder="+233 24 000 0000" />
                                </Field>
                                <Field label="Category">
                                    <Select
                                        value={form.category}
                                        onChange={(v) => {
                                            const nextRanks = RANKS_BY_CATEGORY[v] || RANKS_BY_CATEGORY.Other;
                                            setForm((f) => ({
                                                ...f,
                                                category: v,
                                                rank: nextRanks.includes(f.rank) ? f.rank : '',
                                            }));
                                        }}
                                        options={STAFF_CATEGORIES}
                                    />
                                </Field>
                                <Field label="Rank / Grade">
                                    <Select value={form.rank} onChange={(v) => update('rank', v)} options={['', ...ranks]} placeholder="Select rank" />
                                </Field>
                                <Field label="Qualification">
                                    <Select value={form.qualification} onChange={(v) => update('qualification', v)} options={['', ...QUALIFICATIONS]} placeholder="Select" />
                                </Field>
                                <Field label="Specialization">
                                    <Input value={form.specialization} onChange={(v) => update('specialization', v)} placeholder="e.g. Critical Care" />
                                </Field>
                                <Field label="Employment Status">
                                    <Select value={form.employmentStatus} onChange={(v) => update('employmentStatus', v)} options={EMPLOYMENT_STATUSES} />
                                </Field>
                                <Field label={`Annual leave (days · min ${MIN_ANNUAL_LEAVE_DAYS})`}>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={form.annualLeaveBalance}
                                        onChange={(v) => update('annualLeaveBalance', v)}
                                    />
                                </Field>
                                <Field label="Department" required>
                                    <Select
                                        value={form.departmentId}
                                        onChange={(v) => {
                                            update('departmentId', v);
                                            const firstWard = wards.find((ward) => String(ward.departmentId) === String(v));
                                            update('wardId', firstWard?._id || '');
                                        }}
                                        options={[
                                            { value: '', label: 'Select department' },
                                            ...departments.map((d) => ({ value: d._id, label: d.name })),
                                        ]}
                                    />
                                </Field>
                                <Field label="Ward" required>
                                    <Select
                                        value={form.wardId}
                                        onChange={(v) => update('wardId', v)}
                                        options={[
                                            { value: '', label: 'Select ward' },
                                            ...departmentWards.map((w) => ({ value: w._id, label: w.name })),
                                        ]}
                                    />
                                </Field>
                                <Field label="Ward Role">
                                    <Select
                                        value={form.wardRole}
                                        onChange={(v) => update('wardRole', v)}
                                        options={WARD_ROLES}
                                    />
                                </Field>
                                <div className="sm:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Toggle label="Only morning" checked={form.workRestriction === 'onlyMorning'} onChange={(checked) => update('workRestriction', checked ? 'onlyMorning' : 'none')} />
                                    <Toggle label="Only afternoon" checked={form.workRestriction === 'onlyAfternoon'} onChange={(checked) => update('workRestriction', checked ? 'onlyAfternoon' : 'none')} />
                                    <Toggle label="Weekday only" checked={form.workRestriction === 'weekdayOnly'} onChange={(checked) => update('workRestriction', checked ? 'weekdayOnly' : 'none')} />
                                    <Toggle label="Study leave - no weekends" checked={form.workRestriction === 'studyLeave'} onChange={(checked) => update('workRestriction', checked ? 'studyLeave' : 'none')} />
                                    <Toggle label="No night shift" checked={form.noNightShift} onChange={(checked) => update('noNightShift', checked)} />
                                    <Toggle label="Maternity - no nights" checked={form.maternityNoNight} onChange={(checked) => update('maternityNoNight', checked)} />
                                    <Toggle label="Rotation / Seconded staff" checked={form.isRotation} onChange={(checked) => update('isRotation', checked)} />
                                </div>
                                <div className="col-span-2 rounded-2xl bg-synclly-surface border border-slate-100 p-4 space-y-4">
                                    <div>
                                        <p className="text-xs font-extrabold text-synclly-deep">Preferred rules</p>
                                        <p className="text-[11px] font-medium text-synclly-muted mt-1">
                                            Preferences are not hard priority rules. Auto-generation applies core rules first, then tries these when possible.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest">Preferred off days</p>
                                        <div className="flex flex-wrap gap-2">
                                            {DAYS.map((day) => (
                                                <Chip key={day} active={(form.preferredOffDays || []).includes(day)} onClick={() => toggleArrayValue('preferredOffDays', day)}>
                                                    {day.slice(0, 3)}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest">Preferred shifts</p>
                                        <div className="flex flex-wrap gap-2">
                                            {PREFERRED_SHIFTS.map((shift) => (
                                                <Chip key={shift} active={(form.preferredShifts || []).includes(shift)} onClick={() => toggleArrayValue('preferredShifts', shift)}>
                                                    {shift}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {active === 'leave' && isEdit && leaveSnapshot && (
                            <LeaveManagerPanel
                                hospitalId={hospitalId}
                                staff={leaveSnapshot}
                                onUpdated={refreshLeaveFromServer}
                            />
                        )}
                    </div>

                    {error && (
                        <div className="mx-4 sm:mx-6 md:mx-10 bg-rose-50 border border-rose-100 rounded-2xl p-3 text-xs font-bold text-rose-600">
                            {error}
                        </div>
                    )}

                    <div className="px-4 sm:px-6 md:px-10 py-4 md:py-6 border-t border-slate-100 flex justify-between gap-3 sticky bottom-0 bg-white">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="h-12 px-6 rounded-2xl bg-white border border-slate-200 text-synclly-muted font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="h-12 px-8 rounded-2xl bg-synclly-coral text-white font-bold text-sm hover:bg-synclly-coral-hover shadow-xl shadow-synclly-coral/20 disabled:opacity-50"
                        >
                            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Staff'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, required, full, children }) {
    return (
        <div className={`space-y-2 ${full ? 'sm:col-span-2' : ''}`}>
            <label className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest ml-1">
                {label}
                {required && <span className="text-synclly-coral ml-1">*</span>}
            </label>
            {children}
        </div>
    );
}

function Input({ type = 'text', value, onChange, placeholder, ...rest }) {
    return (
        <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-medium text-synclly-deep placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral transition-all"
            {...rest}
        />
    );
}

function Select({ value, onChange, options, placeholder }) {
    const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o || placeholder || '\u2014' } : o));
    return (
        <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-medium text-synclly-deep focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral transition-all appearance-none cursor-pointer"
        >
            {opts.map((o) => (
                <option key={`${o.value}-${o.label}`} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
            <span className="text-xs font-bold text-synclly-deep">{label}</span>
            <input
                type="checkbox"
                checked={Boolean(checked)}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 accent-synclly-coral"
            />
        </label>
    );
}

function Chip({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`h-8 px-3 rounded-lg text-[11px] font-bold border transition-all ${
                active
                    ? 'bg-synclly-coral text-white border-synclly-coral'
                    : 'bg-white text-synclly-muted border-slate-100 hover:text-synclly-deep'
            }`}
        >
            {children}
        </button>
    );
}
