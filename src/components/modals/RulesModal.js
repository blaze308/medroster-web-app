'use client';

const RULE_GROUPS = [
    {
        title: 'Hard rules',
        items: [
            'Staff on approved leave cannot be assigned.',
            'No-night and maternity night flags block night duty (Labour Act §55 for protected workers).',
            'In-charge and assistant: weekday mornings only; off on weekends and marked holidays.',
            'Only-morning, only-afternoon, and weekday-only switches are hard personal restrictions.',
        ],
    },
    {
        title: 'Ghana guidelines (Flexible or Hardened)',
        items: [
            'Prefer at least one senior or in-charge on Morning, Afternoon, and Night.',
            'SOD counts toward day-side senior presence.',
            'Labour Act guideline: ~40h/week; hospital target defaults to 48h for Ghana practice.',
            'Labour Act §41: aim for ≥12h rest between shifts.',
            'Labour Act §42: aim for 48h contiguous rest in a 7-day window.',
            'At setup (or in settings) choose Flexible (warn only) or Hardened (enforce) for each guideline.',
        ],
    },
    {
        title: 'Shifts',
        items: [
            'Morning is 8:00 AM to 2:00 PM.',
            'Afternoon is 2:00 PM to 8:00 PM.',
            'Night is 8:00 PM to 8:00 AM.',
            'SOD (Supervisor on Duty) is 8:00 AM to 8:00 PM.',
        ],
    },
    {
        title: 'Leave, rest, preferences',
        items: [
            'Study leave means no weekend shifts.',
            'Marked cycle holidays add to regular staff off-day targets.',
            'Regular staff target ~12 off days in a 30/31-day cycle, plus marked holidays.',
            'Night shifts are capped at 3 by default; a fourth night is a caution warning.',
            'Preferred off days and preferred shifts are soft sort keys only.',
        ],
    },
];

export default function RulesModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-white rounded-[32px] overflow-hidden shadow-synclly-lg border border-slate-50 animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                <div className="p-8 border-b border-slate-100 flex items-start justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-extrabold text-synclly-deep tracking-tight">Rules</h2>
                        <p className="text-sm font-medium text-synclly-muted mt-1">
                            Hard personal restrictions vs Ghana guidelines you can set Flexible or Hardened at setup.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-synclly-surface text-synclly-muted hover:text-synclly-coral"
                    >
                        x
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto">
                    {RULE_GROUPS.map((group) => (
                        <section key={group.title} className="rounded-2xl bg-synclly-surface border border-slate-100 p-5">
                            <h3 className="text-sm font-extrabold text-synclly-deep mb-3">{group.title}</h3>
                            <ul className="space-y-2">
                                {group.items.map((item) => (
                                    <li key={item} className="text-xs font-medium text-synclly-muted leading-relaxed">
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
