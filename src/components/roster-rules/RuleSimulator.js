import MsIcon from '../landing/MsIcon';

function NightCell({ day, label, tone = 'plain' }) {
  const shell = tone === 'alert'
    ? 'bg-crimson-surface'
    : tone === 'ok'
      ? 'bg-mint-surface'
      : 'bg-surface-container';
  const dayClass = tone === 'alert' ? 'text-crimson-alert font-bold' : tone === 'ok' ? 'text-emerald-deep font-bold' : 'text-slate-muted';
  const chip = tone === 'alert'
    ? 'bg-crimson-alert text-on-error font-bold'
    : tone === 'ok'
      ? 'bg-emerald-deep text-on-primary font-bold'
      : 'bg-surface-container-high text-slate-black';
  return (
    <div className={`p-2 rounded text-center ${shell} ${tone === 'alert' ? 'animate-pulse' : ''}`}>
      <span className={`text-[11px] leading-[14px] font-semibold block ${dayClass}`}>{day}</span>
      <span className={`px-1.5 py-0.5 rounded text-[11px] tabular-nums block mt-1 ${chip}`}>{label}</span>
    </div>
  );
}

function ViolationPanel({ scenario }) {
  if (scenario === 'senior') {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between gap-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-crimson-surface text-crimson-alert text-[11px] leading-[14px] font-bold">
              <MsIcon name="dangerous" className="text-[16px]" />
              Seniority Quota Breach
            </span>
            <span className="text-xs tabular-nums text-slate-muted">Ward: Paediatric Emergency</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container">
            <div className="w-10 h-10 rounded-full bg-crimson-surface flex items-center justify-center text-crimson-alert font-bold shrink-0">EM</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] leading-4 font-bold text-slate-black truncate">Staff Midwife (SM) Elsie Mensah</h3>
              <p className="text-xs text-slate-muted">Experience: 8 Months Post-Rotational • Junior Tier</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-crimson-surface text-crimson-alert text-[11px] font-bold whitespace-nowrap">No Senior In-Charge</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-muted uppercase">Duty Complement:</span>
            <div className="flex items-center justify-between text-sm"><span>SM Elsie Mensah (Junior)</span><span className="text-crimson-alert font-semibold">Unchaperoned</span></div>
            <div className="flex items-center justify-between text-sm"><span>Rotating Nurse Intern</span><span className="text-crimson-alert font-semibold">Unsupervised</span></div>
          </div>
          <div className="p-4 rounded-xl bg-crimson-surface/50 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-crimson-alert font-bold text-[13px]">
              <MsIcon name="warning" className="text-[20px]" />
              GHS Supervision Ratio Rule 02 Violation
            </div>
            <p className="text-xs text-crimson-alert/90">
              Shift drafted without a certified Principal (PNO) or Senior Nursing Officer (SNO). Breaches national acute care clinical governance protocol.
            </p>
          </div>
        </div>
        <div className="pt-2 text-crimson-alert text-[11px] font-semibold flex items-center justify-between gap-2">
          <span>Publication Status: BLOCKED BY COMPLIANCE GATE</span>
          <MsIcon name="lock" className="text-[18px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between gap-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-crimson-surface text-crimson-alert text-[11px] leading-[14px] font-bold">
            <MsIcon name="dangerous" className="text-[16px]" />
            Manual Drafting with Statutory Violation
          </span>
          <span className="text-xs tabular-nums text-slate-muted">Ward: Female Medical (Ridge Hospital)</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container">
          <div className="w-10 h-10 rounded-full bg-crimson-surface flex items-center justify-center text-crimson-alert font-bold shrink-0">KA</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] leading-4 font-bold text-slate-black truncate">Staff Nurse (SN) Kwesi Addo</h3>
            <p className="text-xs text-slate-muted">PIN: NMC/2021/49821 • Ward Post: Acute Med</p>
          </div>
          <span className="px-2 py-0.5 rounded bg-crimson-surface text-crimson-alert text-[11px] font-bold whitespace-nowrap">4th Night Assigned</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-slate-muted uppercase">Continuous Schedule Timeline (Days 10 to 14):</span>
          <div className="grid grid-cols-5 gap-1.5">
            <NightCell day="Wed 10" label="NIGHT 1" />
            <NightCell day="Thu 11" label="NIGHT 2" />
            <NightCell day="Fri 12" label="NIGHT 3" />
            <NightCell day="Sat 13" label="NIGHT 4!" tone="alert" />
            <NightCell day="Sun 14" label="DAY (M)" />
          </div>
        </div>
        <div className="p-4 rounded-xl bg-crimson-surface/50 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-crimson-alert font-bold text-[13px]">
            <MsIcon name="warning" className="text-[20px]" />
            Act 651 Section 41 Breach Detected
          </div>
          <p className="text-xs text-crimson-alert/90">
            Staff assigned four consecutive 12-hour night rotations without mandatory 48-hour decompression. Extreme clinical fatigue hazard and legal liability.
          </p>
        </div>
      </div>
      <div className="pt-2 text-crimson-alert text-[11px] font-semibold flex items-center justify-between gap-2">
        <span>Publication Status: BLOCKED BY COMPLIANCE GATE</span>
        <MsIcon name="lock" className="text-[18px]" />
      </div>
    </div>
  );
}

function ResolvedPanel({ scenario }) {
  if (scenario === 'senior') {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between gap-6">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-surface text-emerald-deep text-[11px] leading-[14px] font-bold">
              <MsIcon name="check_circle" className="text-[16px]" />
              MedRoster Senior Anchor Match
            </span>
            <span className="text-xs tabular-nums text-teal-brand font-semibold">100% GHS Certified</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-mint-surface">
            <div className="w-10 h-10 rounded-full bg-emerald-deep flex items-center justify-center text-on-primary shrink-0">
              <MsIcon name="shield_person" className="text-[20px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] leading-4 font-bold text-emerald-deep truncate">Senior Officer Auto-Paired</h3>
              <p className="text-xs text-forest-mid">SNO Margaret Boateng appointed Shift In-Charge</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-deep text-on-primary text-[11px] font-bold">Assigned</span>
          </div>
          <div className="p-3 rounded-lg bg-surface-container flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-slate-muted uppercase">Compliant Complement Verified:</span>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-emerald-deep">SNO Margaret Boateng</span>
              <span className="px-2 py-0.5 rounded bg-mint-surface text-emerald-deep text-[11px] font-bold">Shift In-Charge</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-body">
              <span>SM Elsie Mensah</span>
              <span className="text-[11px] font-semibold text-slate-muted">Fully Chaperoned</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-mint-surface flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-emerald-deep font-bold text-[13px] flex items-center gap-1.5">
                <MsIcon name="verified" className="text-[18px]" /> Legal Standard Met
              </span>
              <span className="text-[11px] font-semibold text-forest-mid">1:2 Senior-to-Junior Ratio</span>
            </div>
            <p className="text-xs text-forest-mid">
              Emergency ward now legally safe, reducing clinical misadventure exposure and ensuring high-acuity oversight.
            </p>
          </div>
        </div>
        <div className="pt-2 text-emerald-deep text-[11px] font-semibold flex items-center justify-between gap-2">
          <span>Publication Clearance: APPROVED FOR CLINICAL USE</span>
          <MsIcon name="verified" className="text-[18px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between gap-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-surface text-emerald-deep text-[11px] leading-[14px] font-bold">
            <MsIcon name="check_circle" className="text-[16px]" />
            MedRoster Dynamic Auto-Resolution
          </span>
          <span className="text-xs tabular-nums text-teal-brand font-semibold">100% GHS Certified</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-mint-surface">
          <div className="w-10 h-10 rounded-full bg-emerald-deep flex items-center justify-center text-on-primary shrink-0">
            <MsIcon name="auto_fix_high" className="text-[20px]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] leading-4 font-bold text-emerald-deep truncate">Rule Engine Intercepted & Shift Swapped</h3>
            <p className="text-xs text-forest-mid">Restored 48h Protected Rest; Float Pool Triggered</p>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-deep text-on-primary text-[11px] font-bold">Resolved</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-slate-muted uppercase">Auto-Rectified Schedule Timeline (Days 10 to 14):</span>
          <div className="grid grid-cols-5 gap-1.5">
            <NightCell day="Wed 10" label="NIGHT 1" />
            <NightCell day="Thu 11" label="NIGHT 2" />
            <NightCell day="Fri 12" label="NIGHT 3" />
            <NightCell day="Sat 13" label="MANDATORY OFF" tone="ok" />
            <NightCell day="Sun 14" label="MANDATORY OFF" tone="ok" />
          </div>
        </div>
        <div className="p-4 rounded-xl bg-mint-surface flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-emerald-deep font-bold text-[13px] flex items-center gap-1.5">
              <MsIcon name="swap_horiz" className="text-[18px]" /> Sat 13 Night Covered By:
            </span>
            <span className="text-[11px] font-semibold text-forest-mid">Float Nurse Pool</span>
          </div>
          <p className="text-xs text-forest-mid">
            Shift seamlessly transferred to <strong>Staff Midwife (SM) Abena Osei</strong> (PIN: NMC/2019/33219) with 3 available zero-night hours and valid clinical credentialing.
          </p>
        </div>
      </div>
      <div className="pt-2 text-emerald-deep text-[11px] font-semibold flex items-center justify-between gap-2">
        <span>Publication Clearance: APPROVED FOR DIRECTOR SIGNATURE</span>
        <MsIcon name="verified" className="text-[18px]" />
      </div>
    </div>
  );
}

export default function RuleSimulator({ scenario, onScenario }) {
  return (
    <section className="w-full bg-surface-container-low py-16 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-mint-surface text-emerald-deep text-[11px] leading-[14px] font-semibold uppercase mb-2">
              <MsIcon name="compare_arrows" className="text-[16px]" />
              Live Simulation Bench
            </span>
            <h2 className="landing-headline">Conflict Visualizer: Breach vs MedRoster Resolution</h2>
            <p className="text-sm leading-5 text-slate-body max-w-2xl mt-1">
              Simulate how traditional manual spreadsheet scheduling introduces serious statutory liability in busy wards, and how MedRoster automatically auto-rectifies violations.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-surface-container-lowest p-1.5 rounded-xl shadow-sm">
            <button
              type="button"
              onClick={() => onScenario('night')}
              className={`px-3 py-1.5 rounded-lg text-[11px] leading-[14px] font-semibold transition-all cursor-pointer ${
                scenario === 'night' ? 'bg-emerald-deep text-on-primary' : 'text-slate-body hover:bg-surface-container'
              }`}
            >
              Scenario A: 4th Night Violation
            </button>
            <button
              type="button"
              onClick={() => onScenario('senior')}
              className={`px-3 py-1.5 rounded-lg text-[11px] leading-[14px] font-semibold transition-all cursor-pointer ${
                scenario === 'senior' ? 'bg-emerald-deep text-on-primary' : 'text-slate-body hover:bg-surface-container'
              }`}
            >
              Scenario B: Junior Staff Unchaperoned
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <ViolationPanel scenario={scenario} />
          <ResolvedPanel scenario={scenario} />
        </div>
      </div>
    </section>
  );
}
