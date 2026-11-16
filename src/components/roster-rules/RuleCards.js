import MsIcon from '../landing/MsIcon';

function CardFooter({ label, code }) {
  return (
    <div className="mt-auto flex items-center justify-between gap-3 text-xs text-slate-muted bg-surface-container-low -mx-6 -mb-6 px-6 py-3">
      <span className="flex items-center gap-1.5 text-forest-mid font-medium">
        <MsIcon name="verified" className="text-[18px]" />
        {label}
      </span>
      <span className="font-medium tabular-nums text-slate-muted shrink-0">{code}</span>
    </div>
  );
}

export default function RuleCards({ filter }) {
  const visible = (category) => filter === 'all' || filter === category;

  return (
    <section className="w-full px-4 lg:px-8 py-12 max-w-7xl mx-auto flex flex-col gap-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] leading-[14px] text-teal-brand tracking-widest uppercase font-bold">Rule Engine Matrix</span>
          <h2 className="landing-headline">Algorithmic Rest & Clinical Safeguards</h2>
        </div>
        <div className="flex items-center gap-2 text-slate-muted text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-deep" />
          Enforced real-time during shift assignment
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visible('act651') && (
          <article className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-6 hover:shadow-md transition-all overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-mint-surface flex items-center justify-center text-emerald-deep font-bold shrink-0">01</div>
                  <div>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-slate-muted text-[11px] leading-[14px] font-semibold">Labour Act 2003 (Act 651) Sec 40–44</span>
                    <h3 className="landing-title mt-0.5">Mandatory Night Rest Intervals</h3>
                  </div>
                </div>
                <MsIcon name="bedtime" className="text-emerald-deep text-[24px] shrink-0" />
              </div>
              <p className="text-sm leading-5 text-slate-body">
                Strict cap of <strong className="text-slate-black font-semibold">3 consecutive night duties</strong> (20:00 – 08:00). Followed by a mandatory minimum of <strong className="text-slate-black font-semibold">48 consecutive post-night off-duty hours</strong> before any morning, afternoon, or on-call reassignment.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-surface-container flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-muted uppercase">Maximum Night Run</span>
                  <span className="text-base font-bold text-slate-black">3 Nights (36 hrs)</span>
                  <span className="text-xs text-emerald-deep">Hard-block on 4th night</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-container flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-muted uppercase">Mandated Recovery</span>
                  <span className="text-base font-bold text-slate-black">48h Consecutive</span>
                  <span className="text-xs text-teal-brand">Protected Off-Duty block</span>
                </div>
              </div>
            </div>
            <CardFooter label="Zero back-to-back night breach guarantee" code="REG-40A" />
          </article>
        )}

        {visible('supervision') && (
          <article className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-6 hover:shadow-md transition-all overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-secondary-container/40 flex items-center justify-center text-teal-brand font-bold shrink-0">02</div>
                  <div>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-slate-muted text-[11px] leading-[14px] font-semibold">GHS Ward Staffing Protocol Sec 12</span>
                    <h3 className="landing-title mt-0.5">In-Charge Pairing & Supervision Quota</h3>
                  </div>
                </div>
                <MsIcon name="supervised_user_circle" className="text-teal-brand text-[24px] shrink-0" />
              </div>
              <p className="text-sm leading-5 text-slate-body">
                No inpatient ward shift can operate solely with junior personnel. High-dependency and emergency shifts legally require at least one <strong className="text-slate-black font-semibold">PNO (Principal Nursing Officer)</strong> or <strong className="text-slate-black font-semibold">SNO (Senior Nursing Officer)</strong> physically rostered as Shift In-Charge.
              </p>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface-container">
                  <span className="text-[11px] font-medium text-slate-black">Shift In-Charge Anchor:</span>
                  <span className="px-2 py-0.5 rounded bg-mint-surface text-emerald-deep text-[11px] font-semibold whitespace-nowrap">PNO / SNO Mandatory</span>
                </div>
                <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface-container">
                  <span className="text-[11px] font-medium text-slate-black">Staff Nurses (SN) & Midwives (SM):</span>
                  <span className="px-2 py-0.5 rounded bg-surface text-slate-muted text-[11px] font-semibold whitespace-nowrap">Max 3 Junior : 1 Senior Ratio</span>
                </div>
              </div>
            </div>
            <CardFooter label="Real-time In-Charge Chaperone Validator" code="GHS-QUOTA-04" />
          </article>
        )}

        {visible('licensing') && (
          <article className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-6 hover:shadow-md transition-all overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-amber-surface flex items-center justify-center text-amber-shift font-bold shrink-0">03</div>
                  <div>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-slate-muted text-[11px] leading-[14px] font-semibold">N&MC Health Professions Regulatory Act 857</span>
                    <h3 className="landing-title mt-0.5">PIN & AIN Statutory Live Verification</h3>
                  </div>
                </div>
                <MsIcon name="badge" className="text-amber-shift text-[24px] shrink-0" />
              </div>
              <p className="text-sm leading-5 text-slate-body">
                Automated registry cross-check with the Nursing & Midwifery Council database prior to final monthly schedule publication. Staff with expired Professional Identification Numbers (PIN) or Auxiliary Identification Numbers (AIN) cannot be deployed on active clinical lines.
              </p>
              <div className="p-3 rounded-lg bg-surface-container flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-mint-surface flex items-center justify-center text-emerald-deep shrink-0">
                    <MsIcon name="fact_check" className="text-[18px]" />
                  </div>
                  <div>
                    <span className="text-[13px] leading-4 font-semibold text-slate-black block">Pre-Publication Audit Gate</span>
                    <span className="text-xs text-slate-muted">Automated 30-day renewal warning ping</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-mint-surface text-emerald-deep text-[11px] font-semibold whitespace-nowrap">Active Sync</span>
              </div>
            </div>
            <CardFooter label="NMC-Ghana Direct Integration Ready" code="NMC-PIN-SYNC" />
          </article>
        )}

        {visible('leave') && (
          <article className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-6 hover:shadow-md transition-all overflow-hidden">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-mint-surface flex items-center justify-center text-emerald-deep font-bold shrink-0">04</div>
                  <div>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-slate-muted text-[11px] leading-[14px] font-semibold">Ghana Civil Service Regulations Sec 57</span>
                    <h3 className="landing-title mt-0.5">Statutory Leave Entitlement Protection</h3>
                  </div>
                </div>
                <MsIcon name="calendar_month" className="text-emerald-deep text-[24px] shrink-0" />
              </div>
              <p className="text-sm leading-5 text-slate-body">
                Enforces strict quota deductions: <strong className="text-slate-black font-semibold">28 to 36 working days annual leave</strong> based on seniority level, <strong className="text-slate-black font-semibold">12 calendar weeks paid maternity leave</strong>, and certified MoH study leave. The engine completely locks protected windows against duty calls.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                {[
                  ['Annual Leave', '28–36 d'],
                  ['Maternity', '12 Weeks'],
                  ['MoH Study', 'Protected'],
                ].map(([label, value]) => (
                  <div key={label} className="p-2.5 rounded-lg bg-surface-container">
                    <span className="text-[11px] font-semibold text-slate-muted block">{label}</span>
                    <span className="text-base font-bold text-slate-black">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <CardFooter label="Tamper-proof leave roster segregation" code="GCS-LV-2025" />
          </article>
        )}
      </div>
    </section>
  );
}
