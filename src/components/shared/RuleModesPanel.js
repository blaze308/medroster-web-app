'use client';

import { RULE_MODE_DEFS, normalizeRuleModes } from '../../lib/rule-modes';

/**
 * Flexible vs Hardened switches for on-ground Ghana guidelines.
 * @param {{ modes: object, onChange: (next: object) => void, title?: string, subtitle?: string }} props
 */
export default function RuleModesPanel({
    modes,
    onChange,
    title = 'How strict should these be?',
    subtitle = 'Leave and personal restrictions always stay hard. These on-ground guidelines can be Flexible (warn only) or Hardened (block generate / show as errors).',
}) {
    const resolved = normalizeRuleModes(modes);

    const setMode = (key, value) => {
        onChange({ ...resolved, [key]: value });
    };

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-sm font-extrabold text-synclly-deep">{title}</h3>
                {subtitle ? (
                    <p className="text-xs font-medium text-synclly-muted mt-1 leading-relaxed">{subtitle}</p>
                ) : null}
            </div>
            <ul className="space-y-3">
                {RULE_MODE_DEFS.map((def) => {
                    const hard = resolved[def.key] === 'hard';
                    return (
                        <li
                            key={def.key}
                            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-slate-100 bg-synclly-surface/60 px-4 py-3"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-synclly-deep">{def.label}</p>
                                <p className="text-[11px] font-medium text-synclly-muted mt-0.5 leading-relaxed">{def.hint}</p>
                            </div>
                            <div className="flex shrink-0 rounded-xl bg-white border border-slate-200 p-0.5 self-start sm:self-center">
                                <button
                                    type="button"
                                    onClick={() => setMode(def.key, 'flexible')}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition ${
                                        !hard
                                            ? 'bg-synclly-deep text-white'
                                            : 'text-synclly-muted hover:text-synclly-deep'
                                    }`}
                                >
                                    Flexible
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode(def.key, 'hard')}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition ${
                                        hard
                                            ? 'bg-synclly-coral text-white'
                                            : 'text-synclly-muted hover:text-synclly-deep'
                                    }`}
                                >
                                    Hardened
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
