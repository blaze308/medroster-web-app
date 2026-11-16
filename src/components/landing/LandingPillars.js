import MsIcon from './MsIcon';

const PILLARS = [
  {
    icon: 'account_tree',
    title: 'GHS Rank Hierarchy & In-Charge Routing',
    body: 'MedRoster guarantees every shift is staffed with the required clinical supervisory depth. Automatically verifies that a PNO or SNO acts as In-Charge, while junior Staff Nurses and rotation interns maintain safe bed ratios.',
    rows: [
      ['Supervisor Check', 'Strict Rule Active', true],
      ['Department Profiles', 'OPD, ICU, Maternity, Theatre', false],
    ],
  },
  {
    icon: 'policy',
    title: 'Ghana Labour Act (Act 651) Enforcement',
    body: 'Eliminate unsafe scheduling fatigue. MedRoster automatically enforces 48-hour continuous rest windows following night blocks, tracks statutory 3-month maternity leaves, study leaves, and annual leave allocations without manual logs.',
    rows: [
      ['Post-Night Shift Rest', 'Min 48h Enforced', true],
      ['Statutory Leave Audit', 'Auto-deducted & Tracked', false],
    ],
  },
  {
    icon: 'assignment_turned_in',
    title: 'Official Ward Noticeboard PDF Export',
    body: 'Generate printable duty rosters formatted to exact Ghana Health Service directorate standards. Includes designated signature blocks for DDNS Matrons, Medical Superintendents, and shift handovers.',
    rows: [
      ['Export Compatibility', 'A3 / A4 High-Res PDF', true],
      ['Institutional Validation', 'Matron & PIN Endorsed', false],
    ],
  },
];

export default function LandingPillars() {
  return (
    <section id="features" className="w-full bg-surface-container-lowest py-16 lg:py-24 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="max-w-3xl mb-16">
          <span className="text-[11px] leading-[14px] uppercase tracking-wider text-teal-brand font-bold">
            Clinical Precision Infrastructure
          </span>
          <h2 className="mt-2 landing-display">
            Engineered for Ministry of Health & GHS Protocols.
          </h2>
          <p className="mt-2 text-[15px] leading-6 text-on-surface-variant">
            Generic scheduling software ignores the Ghana public health system. MedRoster is built around the actual rules, grades, and statutory mandates of Ghanaian hospitals.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="flex flex-col p-8 rounded-xl bg-surface shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-mint-surface flex items-center justify-center text-emerald-deep mb-6">
                <MsIcon name={pillar.icon} className="text-[28px]" />
              </div>
              <h3 className="landing-title">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{pillar.body}</p>
              <div className="mt-6 bg-surface-container/40 p-4 rounded-lg flex flex-col gap-2">
                {pillar.rows.map(([label, value, accent]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-slate-muted text-[11px] font-semibold">{label}</span>
                    <span className={accent ? 'text-emerald-deep font-bold text-right' : 'text-slate-body font-medium text-right'}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
