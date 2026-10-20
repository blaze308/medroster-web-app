'use client';

import { useState } from 'react';
import { getDefaultRuleModes, normalizeRuleModes } from '../../lib/rule-modes';
import RuleModesPanel from '../shared/RuleModesPanel';

export default function SettingsModal({ settings, onSave, onClose }) {
    const [form, setForm] = useState(() => ({
        maxConsecutiveDays: settings?.maxConsecutiveDays ?? 6,
        maxConsecutiveNights: settings?.maxConsecutiveNights ?? 3,
        minSeniorStaffPerShift: settings?.minSeniorStaffPerShift ?? settings?.minSeniorStaffPerDay ?? 1,
        maxHoursPerWeek: settings?.maxHoursPerWeek ?? 48,
        ruleModes: normalizeRuleModes(settings?.ruleModes || getDefaultRuleModes()),
    }));
    const [busy, setBusy] = useState(false);

    const handleSave = async () => {
        setBusy(true);
        try {
            const minSenior = Math.max(0, form.minSeniorStaffPerShift || 0);
            await onSave({
                ...form,
                minSeniorStaffPerDay: minSenior,
                minSeniorStaffPerShift: minSenior,
                supervisoryCoverageSeverity: 'warning',
                ruleModes: normalizeRuleModes(form.ruleModes),
                validationRules: {
                    enforceLeaveConflicts: true,
                    enforceRoleShiftRestrictions: true,
                    enforceSupervisoryCoverage: true,
                    warnConsecutiveShifts: true,
                },
            });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-white rounded-[32px] overflow-hidden shadow-synclly-lg border border-slate-50 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 max-h-[90vh] flex flex-col">
                <div className="px-4 sm:px-6 md:px-10 pt-6 sm:pt-8 md:pt-10 pb-4 md:pb-6 border-b border-slate-100">
                    <h2 className="text-xl md:text-2xl font-extrabold text-synclly-deep tracking-tight">Schedule Settings</h2>
                    <p className="text-synclly-muted font-medium text-sm mt-1">
                        Hard rules stay on for leave and personal restrictions. Choose Flexible or Hardened for on-ground guidelines.
                    </p>
                </div>

                <div className="overflow-y-auto flex-1 p-4 sm:p-6 md:p-10 space-y-6 md:space-y-8">
                    <section>
                        <h3 className="text-sm font-extrabold text-synclly-deep mb-1">Hard rules</h3>
                        <p className="text-xs font-medium text-synclly-muted mb-4">
                            Leave conflicts and role / work restrictions always block invalid assignments.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-sm font-extrabold text-synclly-deep mb-1">Targets</h3>
                        <p className="text-xs font-medium text-synclly-muted mb-4">
                            Numbers used for both Flexible (warn) and Hardened (enforce) modes.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <NumberField
                                label="Min seniors per shift"
                                value={form.minSeniorStaffPerShift}
                                min={0}
                                max={20}
                                onChange={(v) => setForm((f) => ({ ...f, minSeniorStaffPerShift: Math.max(0, v) }))}
                            />
                            <NumberField
                                label="Max hours per week"
                                value={form.maxHoursPerWeek}
                                min={20}
                                max={80}
                                onChange={(v) => setForm((f) => ({ ...f, maxHoursPerWeek: v }))}
                            />
                            <NumberField
                                label="Max consecutive days"
                                value={form.maxConsecutiveDays}
                                min={1}
                                max={14}
                                onChange={(v) => setForm((f) => ({ ...f, maxConsecutiveDays: v }))}
                            />
                            <NumberField
                                label="Max consecutive nights"
                                value={form.maxConsecutiveNights}
                                min={1}
                                max={7}
                                onChange={(v) => setForm((f) => ({ ...f, maxConsecutiveNights: v }))}
                            />
                        </div>
                    </section>

                    <RuleModesPanel
                        modes={form.ruleModes}
                        onChange={(ruleModes) => setForm((f) => ({ ...f, ruleModes }))}
                    />
                </div>

                <div className="px-4 sm:px-6 md:px-10 py-4 md:py-5 border-t border-slate-100 flex justify-between gap-3 sticky bottom-0 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="h-12 px-6 rounded-2xl bg-white border border-slate-200 text-synclly-muted font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={busy}
                        className="h-12 px-8 rounded-2xl bg-synclly-coral text-white font-bold text-sm hover:bg-synclly-coral-hover shadow-xl shadow-synclly-coral/20 disabled:opacity-50"
                    >
                        {busy ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function NumberField({ label, value, onChange, min, max }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-synclly-muted uppercase tracking-widest ml-1">{label}</label>
            <input
                type="number"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value) || 0)}
                className="w-full h-12 bg-synclly-surface border border-slate-100 rounded-xl px-4 text-sm font-bold text-synclly-deep focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral"
            />
        </div>
    );
}
