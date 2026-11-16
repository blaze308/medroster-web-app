import MsIcon from '../landing/MsIcon';

const TABS = [
  { id: 'all', label: 'All Statutory Directives', icon: 'rule_folder' },
  { id: 'act651', label: 'Act 651 Labour Code', icon: 'health_and_safety' },
  { id: 'supervision', label: 'Nursing Ranks & Supervision', icon: 'supervisor_account' },
  { id: 'licensing', label: 'PIN / AIN Verification', icon: 'verified_user' },
  { id: 'leave', label: 'Leave & Protected Windows', icon: 'event_busy' },
];

export default function RulesBanner({ filter, onFilter }) {
  return (
    <section className="relative w-full bg-gradient-to-b from-surface-container-low to-surface pt-12 pb-16 px-4 lg:px-8 overflow-hidden">
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 pointer-events-none opacity-20" aria-hidden="true">
        <svg className="w-full h-full" fill="none" viewBox="0 0 400 400">
          <circle className="text-teal-brand" cx="200" cy="200" r="180" stroke="currentColor" strokeDasharray="8 8" strokeWidth="2" />
          <circle className="text-emerald-deep" cx="200" cy="200" r="130" stroke="currentColor" strokeWidth="1.5" />
          <circle className="text-teal-brand" cx="200" cy="200" r="80" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-slate-body text-[11px] leading-[14px] font-semibold">
            <MsIcon name="gavel" className="text-[16px] text-teal-brand" />
            Statutory Framework
          </span>
          <span className="text-outline-variant text-[11px] leading-[14px] font-semibold">/</span>
          <span className="text-[11px] leading-[14px] text-forest-mid font-semibold tracking-wide uppercase">
            Republic of Ghana • Ministry of Health
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-mint-surface text-emerald-deep text-xs font-medium ml-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-deep animate-ping" />
            Act 651 Engine Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8 flex flex-col gap-3">
            <h1 className="landing-display text-slate-black">
              Ghana Health Service & Labour Act <span className="text-emerald-deep"> (Act 651)</span> Regulatory Architecture
            </h1>
            <p className="text-[15px] leading-6 text-slate-body max-w-3xl">
              Engineered around the statutory labor codes, Nursing & Midwifery Council (N&MC) licensing directives, and GHS Regional Directorate supervisory quotas. Automated guardrails eliminate shift liabilities before monthly roster sign-off.
            </p>
          </div>
          <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] leading-4 font-semibold text-slate-muted">Compliance Shield Ratio</span>
              <span className="px-2 py-0.5 rounded bg-mint-surface text-emerald-deep text-xs font-bold whitespace-nowrap">100% Zero-Breach</span>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[36px] leading-[44px] font-bold text-slate-black">44,820+</span>
              <span className="text-xs leading-[18px] text-slate-muted">Clinical duty hours audited monthly</span>
            </div>
            <div className="w-full h-8 pt-1">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 200 30" aria-hidden="true">
                <path className="text-mint-surface opacity-60" d="M0,24 Q30,18 60,20 T120,8 T160,12 T200,4 L200,30 L0,30 Z" fill="currentColor" />
                <path className="text-teal-brand" d="M0,24 Q30,18 60,20 T120,8 T160,12 T200,4" fill="none" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-2">
          {TABS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilter(tab.id)}
                className={`px-4 py-2 rounded-lg text-[13px] leading-4 font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-emerald-deep text-on-primary shadow-sm'
                    : 'bg-surface-container hover:bg-surface-container-high text-slate-black'
                }`}
              >
                <MsIcon name={tab.icon} className="text-[18px]" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
