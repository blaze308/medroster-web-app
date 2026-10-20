'use client';

import { useState } from 'react';
import { DEPARTMENT_TEMPLATES } from '../../lib/ghana-data';

// Two-step flow:
//   Step 1: pick templates from a chip grid (multi-select).
//   Step 2: edit the selected names + add custom departments, then save.
//
// onSave: async (departments[]) => void  — caller does the API call.
// onSkip: optional, lets caller add departments later.
export default function DepartmentTemplatePicker({ onSave, onSkip, busy = false, error = '', existingNames = [] }) {
    const alreadyAdded = new Set(existingNames.map((name) => String(name || '').trim().toLowerCase()).filter(Boolean));
    const [step, setStep] = useState(1);
    const [selected, setSelected] = useState(() => {
        // Pre-select common base set that is not already on the hospital
        const base = ['Accident & Emergency', 'Outpatient Department', 'Pharmacy', 'Maternity'];
        return new Set(
            DEPARTMENT_TEMPLATES
                .filter((t) => base.includes(t.name) && !alreadyAdded.has(t.name.toLowerCase()))
                .map((t) => t.name)
        );
    });
    const [editable, setEditable] = useState([]);

    const toggle = (name) => {
        if (alreadyAdded.has(name.toLowerCase())) return;
        const next = new Set(selected);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        setSelected(next);
    };

    const goToReview = () => {
        const list = DEPARTMENT_TEMPLATES.filter((t) => selected.has(t.name)).map((t) => ({
            name: t.name,
            description: t.description,
        }));
        setEditable(list);
        setStep(2);
    };

    const updateDept = (idx, field, value) => {
        setEditable((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
    };

    const removeDept = (idx) => {
        setEditable((prev) => prev.filter((_, i) => i !== idx));
    };

    const addCustom = () => {
        setEditable((prev) => [...prev, { name: '', description: '', custom: true }]);
    };

    const handleSave = () => {
        const valid = editable
            .map((d) => ({ name: d.name.trim(), description: (d.description || '').trim() }))
            .filter((d) => d.name && !alreadyAdded.has(d.name.toLowerCase()));
        if (valid.length === 0) return;
        onSave(valid);
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="bg-white rounded-[40px] border border-slate-50 shadow-synclly-lg overflow-hidden">
                {/* Header */}
                <div className="px-4 sm:px-6 md:px-10 pt-6 sm:pt-8 md:pt-10 pb-4 md:pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-synclly-coral uppercase tracking-widest mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-synclly-coral animate-pulse" />
                        Step {step} of 2
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-synclly-deep tracking-tight mb-2">
                        {step === 1 ? 'Pick department groups' : 'Review and customise'}
                    </h2>
                    <p className="text-synclly-muted font-medium text-sm md:text-base">
                        {step === 1
                            ? 'Select the broad departments at your facility. You will add the actual wards and units inside each group next.'
                            : 'Rename anything to match your hospital, edit descriptions, or add department groups unique to you.'}
                    </p>
                </div>

                {/* Body */}
                <div className="px-4 sm:px-6 md:px-10 py-6 md:py-8 max-h-[60vh] overflow-y-auto">
                    {step === 1 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {DEPARTMENT_TEMPLATES.map((t) => {
                                const exists = alreadyAdded.has(t.name.toLowerCase());
                                const active = selected.has(t.name) && !exists;
                                return (
                                    <button
                                        key={t.name}
                                        type="button"
                                        onClick={() => toggle(t.name)}
                                        disabled={exists}
                                        className={`text-left p-4 rounded-2xl border transition-all ${
                                            exists
                                                ? 'bg-slate-50 border-slate-100 text-synclly-muted cursor-not-allowed'
                                                : active
                                                ? 'bg-synclly-coral/5 border-synclly-coral text-synclly-deep shadow-sm'
                                                : 'bg-synclly-surface border-slate-100 text-synclly-deep hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <span className="text-sm font-extrabold leading-tight">{t.name}</span>
                                            <span
                                                className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    active ? 'border-synclly-coral bg-synclly-coral text-white' : 'border-slate-200'
                                                }`}
                                            >
                                                {active && (
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-synclly-muted leading-snug">
                                            {exists ? 'Already added' : t.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {editable.map((d, idx) => (
                                <div key={idx} className="bg-synclly-surface border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-start">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                                        <input
                                            type="text"
                                            placeholder="Department group"
                                            value={d.name}
                                            onChange={(e) => updateDept(idx, 'name', e.target.value)}
                                            className="md:col-span-1 h-12 bg-white border border-slate-100 rounded-xl px-4 text-sm font-bold text-synclly-deep placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral transition-all"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Description (optional)"
                                            value={d.description || ''}
                                            onChange={(e) => updateDept(idx, 'description', e.target.value)}
                                            className="md:col-span-2 h-12 bg-white border border-slate-100 rounded-xl px-4 text-sm font-medium text-synclly-deep placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-synclly-coral/5 focus:border-synclly-coral transition-all"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeDept(idx)}
                                        className="w-10 h-10 shrink-0 rounded-xl text-rose-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                                        aria-label="Remove"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addCustom}
                                className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 text-synclly-muted hover:border-synclly-coral hover:text-synclly-coral text-sm font-bold transition-all"
                            >
                                + Add custom department group
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 md:px-10 py-4 md:py-6 border-t border-slate-100 flex flex-col gap-3">
                    {error && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-xs font-bold text-rose-600">
                            {error}
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-bold text-synclly-muted">
                            {step === 1 ? `${selected.size} selected` : `${editable.filter((d) => d.name.trim()).length} department groups`}
                        </div>

                        <div className="flex gap-3">
                            {step === 1 ? (
                                <>
                                    {onSkip && (
                                        <button
                                            type="button"
                                            onClick={onSkip}
                                            className="h-12 px-5 rounded-2xl bg-white border border-slate-200 text-synclly-muted font-bold text-sm hover:bg-slate-50 transition-all"
                                        >
                                            Skip for now
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={selected.size === 0}
                                        onClick={goToReview}
                                        className="h-12 px-8 rounded-2xl bg-synclly-coral text-white font-bold text-sm hover:bg-synclly-coral-hover shadow-xl shadow-synclly-coral/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Continue
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        disabled={busy}
                                        className="h-12 px-5 rounded-2xl bg-white border border-slate-200 text-synclly-muted font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy || editable.filter((d) => d.name.trim()).length === 0}
                                        onClick={handleSave}
                                        className="h-12 px-8 rounded-2xl bg-synclly-coral text-white font-bold text-sm hover:bg-synclly-coral-hover shadow-xl shadow-synclly-coral/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {busy ? 'Saving...' : 'Save Department Groups'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
