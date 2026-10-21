'use client';

import { useEffect, useState } from 'react';

/**
 * Confirm / alert modal. Optional checkbox options for multi-part clears.
 * @param {Array<{ id: string, label: string, hint?: string, defaultChecked?: boolean, locked?: boolean }>} [options]
 */
export default function ConfirmModal({
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    /** Single-button info mode (no cancel) */
    infoOnly = false,
    options = null,
    onConfirm,
    onClose,
}) {
    const [checked, setChecked] = useState(() => {
        const init = {};
        for (const o of options || []) {
            // Explicit defaultChecked; locked items default on when omitted
            init[o.id] = o.defaultChecked === undefined ? Boolean(o.locked) : Boolean(o.defaultChecked);
        }
        return init;
    });

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const toggle = (id, locked) => {
        if (locked) return;
        setChecked((c) => ({ ...c, [id]: !c[id] }));
    };

    const selectAll = () => {
        const next = {};
        for (const o of options || []) next[o.id] = true;
        setChecked(next);
    };

    const handleConfirm = () => {
        if (options?.length) {
            onConfirm?.(checked);
        } else {
            onConfirm?.(true);
        }
    };

    const anyChecked = !options?.length || Object.values(checked).some(Boolean);

    return (
        <div
            className="mr-fade fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div className="mr-pop-in w-full max-w-md rounded-3xl bg-white border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-6 pb-4">
                    <h2 id="confirm-modal-title" className="text-lg font-extrabold text-ghs-deep">
                        {title}
                    </h2>
                    {message ? (
                        <p className="mt-2 text-sm font-medium text-ghs-muted leading-snug whitespace-pre-line">
                            {message}
                        </p>
                    ) : null}
                </div>

                {options?.length ? (
                    <div className="px-6 pb-2 space-y-2">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-ghs-muted">
                                What to clear
                            </p>
                            <button
                                type="button"
                                onClick={selectAll}
                                className="text-[11px] font-bold text-ghs-teal hover:underline"
                            >
                                Clean slate (all)
                            </button>
                        </div>
                        {options.map((o) => (
                            <label
                                key={o.id}
                                className={`flex items-start gap-3 p-3 rounded-2xl border ${
                                    checked[o.id]
                                        ? 'border-ghs-teal/30 bg-ghs-teal/5'
                                        : 'border-slate-100 bg-ghs-surface'
                                } ${o.locked ? 'opacity-90' : 'cursor-pointer'}`}
                            >
                                <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={Boolean(checked[o.id])}
                                    disabled={o.locked}
                                    onChange={() => toggle(o.id, o.locked)}
                                />
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold text-ghs-deep">{o.label}</span>
                                    {o.hint ? (
                                        <span className="block text-[11px] font-medium text-ghs-muted mt-0.5 leading-snug">
                                            {o.hint}
                                        </span>
                                    ) : null}
                                </span>
                            </label>
                        ))}
                    </div>
                ) : null}

                <div className="p-6 pt-4 flex flex-wrap justify-end gap-2">
                    {!infoOnly && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-11 px-4 rounded-xl border border-slate-100 bg-white text-sm font-bold text-ghs-muted cursor-pointer"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={!anyChecked}
                        onClick={handleConfirm}
                        className={`h-11 px-4 rounded-xl text-sm font-bold text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-ghs-teal hover:opacity-90'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
