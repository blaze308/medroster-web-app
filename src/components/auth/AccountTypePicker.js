'use client';

export default function AccountTypePicker({ value, onChange }) {
    const options = [
        {
            id: 'individual',
            title: 'Individual',
            desc: 'Personal monthly rosters. Save to the cloud. Up to 50 staff.',
        },
        {
            id: 'enterprise',
            title: 'Hospital / Enterprise',
            desc: 'Full hospital account with departments, wards, join code, and year-long schedules.',
        },
    ];

    return (
        <div className="space-y-3">
            <label className="text-[10px] font-bold text-ghs-muted uppercase tracking-widest ml-1">
                Account type
            </label>
            <div className="grid gap-3">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChange(opt.id)}
                        className={`text-left p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
                            value === opt.id
                                ? 'border-ghs-teal bg-ghs-teal/5 ring-2 ring-ghs-teal/20'
                                : 'border-slate-100 bg-ghs-surface hover:border-slate-200'
                        }`}
                    >
                        <div className="font-extrabold text-ghs-deep text-sm">{opt.title}</div>
                        <p className="text-xs text-ghs-muted font-medium mt-1">{opt.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
