'use client';

import { useState } from 'react';
import MsIcon from '../landing/MsIcon';
import MarketingFrame from '../marketing/MarketingFrame';

const SCALES = {
  poly: { label: 'Polyclinic (4 Wards)', wards: 4, clinicians: 38 },
  regional: { label: 'Regional (14 Wards)', wards: 14, clinicians: 180 },
  teaching: { label: 'Teaching (32+ Wards)', wards: 32, clinicians: 450 },
};

const CASES = [
  {
    id: 'ridge',
    kind: 'regional',
    span: 'lg:col-span-7',
    badge: 'Regional Flagship',
    badgeClass: 'bg-secondary-container text-on-secondary-container',
    title: 'Greater Accra Regional Hospital (Ridge)',
    unit: 'Ward 4B Female Medical & Intensive Care Unit (ICU)',
    panel: 'Ridge ward station',
    tall: true,
    stats: [
      ['Rostering Time', '16 hrs → 4 mins', 'text-emerald-deep'],
      ['Shift Grievances', '-100% Resolved', 'text-crimson-alert'],
      ['Bed-to-Nurse Ratio', 'Optimal 1:4', 'text-teal-brand'],
    ],
    body: 'Before deployment, Ward In-Charges spent consecutive weekends balancing complex ICU specialist coverage against rotating shift preferences. MedRoster automated shift pairing, completely eliminating grievance escalations to the Deputy Director of Nursing Services.',
    foot: 'Supervised by Ward In-Charge Faustina Mensah',
    meta: 'Active 14 Mos',
  },
  {
    id: 'kbth',
    kind: 'teaching',
    span: 'lg:col-span-5',
    badge: 'Tertiary Referral',
    badgeClass: 'bg-mint-surface text-emerald-deep',
    title: 'Korle Bu Teaching Hospital',
    unit: 'Accident & Emergency (A&E) Directorate',
    panel: 'Korle Bu A&E',
    body: 'Automated clinical rank hierarchy oversight ensuring no House Officer is ever assigned an unbacked midnight triage shift without an accredited Senior Medical Officer or Specialist on immediate call.',
    pair: [
      ['Cohort Size', '240+ Rotating Staff'],
      ['Supervision Integrity', '100% Consultant Tier'],
    ],
    foot: 'A&E Core Active',
    meta: 'KBTH-DIRECTORATE-01',
  },
  {
    id: 'kath',
    kind: 'teaching',
    span: 'lg:col-span-6',
    badge: 'Ashanti Regional Center',
    badgeClass: 'bg-amber-surface text-amber-shift',
    title: 'Komfo Anokye Teaching Hospital (KATH)',
    unit: 'Maternal & Child Health Wing',
    icon: 'pregnant_woman',
    body: 'Streamlined mandatory maternity leave handovers and rotating night quotas. MedRoster systematically balances antenatal ward and labour delivery suites to avoid fatigue spikes during high-volume delivery nights.',
    pair: [
      ['Night Quota Equity', 'Equitable ±1 shift/mo'],
      ['Leave Handover Gap', 'Zero uncovered beds'],
    ],
    foot: 'Directorate: Obstetrics & Gynaecology',
    meta: 'Kumasi, Ghana',
  },
  {
    id: 'north',
    kind: 'teaching',
    span: 'lg:col-span-6',
    badge: 'Northern & Volta Corridors',
    badgeClass: 'bg-secondary-container text-on-secondary-container',
    title: 'Tamale (TTH) & Ho Teaching Hospitals',
    unit: 'Cross-Directorate Surgical & Internal Medicine',
    icon: 'hub',
    body: 'Multi-department simultaneous deployment uniting rural satellite postings with tertiary main campuses. Clinical heads coordinate theater schedules, intensive care, and OPD rotations across regional distances in unified real time.',
    pair: [
      ['TTH Surgical Units', '12 Wings Integrated'],
      ['Ho TH Paediatrics', 'Fully Automated'],
    ],
    foot: 'Directorates: Surgery & Paediatrics',
    meta: 'Tamale & Ho, Ghana',
  },
];

const MORE = [
  { name: 'Tema General Hospital', unit: 'Trauma & Maternity Suites', staff: '118 Staff Active', kind: 'regional' },
  { name: 'Sunyani Municipal Hospital', unit: 'Emergency & Outpatient', staff: '74 Staff Active', kind: 'regional' },
  { name: 'Cape Coast Teaching Hospital', unit: 'ENT & General Surgery', staff: '162 Staff Active', kind: 'teaching' },
  { name: 'Kaneshie Polyclinic', unit: '24-Hour Ambulatory Shift Unit', staff: '45 Staff Active', kind: 'regional' },
];

const STEPS = [
  ['01', '< 15 Mins', 'Staff PIN/AIN & Rank Ingestion', 'Upload standard GHS staff CSV spreadsheets or enter PIN/AIN numbers manually. Automatically maps ranks from Nursing Officer to Principal Medical Officer.', 'upload_file', 'GHS Format Ready'],
  ['02', 'Ward Level', 'Custom Ward Rule Configuration', 'Specify handovers, minimum senior sister coverage per night, weekend rotations, and Act 651 statutory rest rules per medical specialty.', 'tune', 'Labour Act 651 Built-in'],
  ['03', '1 Hour', 'Ward In-Charge Training', 'A single 1-hour dedicated on-site or virtual briefing for Matrons and In-Charges. Zero technical complexity; designed around familiar ward shift vernacular.', 'school', 'Accredited Briefing'],
  ['04', 'Instant', 'Noticeboard & SMS Rollout', 'Generate one-click A3 printouts for physical staff room noticeboards or publish secure mobile viewing links directly to clinician phones.', 'print', 'Dual Digital & Paper Sync'],
];

const REGIONS = ['Greater Accra', 'Ashanti', 'Northern', 'Volta', 'Western', 'Central', 'Eastern', 'Other Region'];

function Panel({ label, className, icon }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <MsIcon name={icon || 'local_hospital'} className="absolute top-4 left-4 text-[40px] text-emerald-deep/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-black/80 via-slate-black/20 to-transparent" />
      <span className="absolute bottom-3 left-4 text-[11px] font-semibold text-on-primary">{label}</span>
    </div>
  );
}

export default function HospitalsScreen() {
  const [filter, setFilter] = useState('all');
  const [scale, setScale] = useState('poly');
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const shown = (kind) => filter === 'all' || filter === kind;
  const current = SCALES[scale];
  const hours = current.wards * 14;

  const submit = (event) => {
    event.preventDefault();
    setSent(true);
    setOpen(false);
  };

  return (
    <MarketingFrame>
      <section className="w-full bg-emerald-deep text-on-primary">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] leading-[14px] font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-fixed animate-ping" />
            <span className="uppercase tracking-wider text-primary-fixed">Network Status: Live</span>
            <span className="text-mint-border/40">•</span>
            <span>Ghana Health Service Directorate Synced: 16 Regions</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><MsIcon name="verified_user" className="text-[14px] text-primary-fixed" /> Act 651 Audited</span>
            <span className="hidden sm:inline text-mint-border/40">•</span>
            <span className="hidden sm:inline">Avg Roster Generation: 3.8s</span>
          </div>
        </div>
      </section>

      <section className="relative w-full bg-surface-container-lowest overflow-hidden py-16 lg:py-24">
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full bg-mint-surface/50 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint-surface text-forest-mid text-[11px] font-semibold w-fit">
                <MsIcon name="apartment" className="text-[15px]" />
                Ghana Health Service & Teaching Hospital Deployments
              </div>
              <h1 className="landing-display">Trusted Across Ghana’s Teaching, Regional & District Hospitals</h1>
              <p className="text-[15px] leading-6 text-slate-body max-w-2xl">
                From tertiary referral teaching hospitals to polyclinics, MedRoster orchestrates duty schedules for over 3,200 clinicians across Ghana Health Service directorates.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a href="#deployment-protocol" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-deep text-on-primary hover:bg-forest-mid text-[13px] font-semibold shadow-md">
                  <MsIcon name="verified" className="text-[18px]" /> Review Deployment Protocol
                </a>
                <a href="#facility-directory" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-mint-surface text-emerald-deep hover:bg-secondary-container text-[13px] font-semibold">
                  <MsIcon name="domain_verification" className="text-[18px]" /> Browse Active Facilities
                </a>
              </div>
            </div>
            <div className="lg:col-span-4 bg-surface-container-low rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-muted">Real-Time Clinical Coverage</span>
                <span className="px-2 py-0.5 rounded bg-mint-surface text-emerald-deep text-[11px] font-semibold">Active 24/7</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-[36px] leading-[44px] font-bold text-emerald-deep tabular-nums">3,248</span>
                <span className="text-xs text-slate-muted">Clinicians Rostered Today</span>
              </div>
              <div className="w-full bg-surface-container-lowest rounded-lg p-3 shadow-sm">
                <div className="flex justify-between text-[11px] text-slate-muted font-semibold">
                  <span>Roster Shift Compliance</span>
                  <span className="text-emerald-deep">100%</span>
                </div>
                <svg className="w-full h-10 text-emerald-deep" fill="none" viewBox="0 0 200 40" aria-hidden="true">
                  <path d="M0 32 L25 28 L50 30 L75 22 L100 24 L125 15 L150 18 L175 8 L200 6 V40 H0 Z" fill="currentColor" fillOpacity="0.08" />
                  <path d="M0 32 L25 28 L50 30 L75 22 L100 24 L125 15 L150 18 L175 8 L200 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-body">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-deep" />Doctors: 840+</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-brand" />Nurses: 1,920+</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-shift" />House Officers: 310</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-stitch-secondary" />Midwives: 178</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full bg-slate-canvas py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            ['local_hospital', 'Scale', '45+', 'Hospital Facilities', 'Operational across teaching, regional and metropolitan polyclinic tiers.', 'text-emerald-deep'],
            ['calendar_month', 'Volume', '120,000+', 'Compliant Shifts', 'Generated and managed with zero off-duty handover collision.', 'text-teal-brand'],
            ['gavel', 'Audit', '0', 'Act 651 Violations', 'Guaranteed continuous rest intervals and strictly enforced overtime caps.', 'text-forest-mid'],
            ['sentiment_very_satisfied', 'Morale', '99.4%', 'Staff Satisfaction', 'Measured anonymously across 45 active ward noticeboard feedbacks.', 'text-stitch-secondary'],
          ].map(([icon, tag, value, title, body, color]) => (
            <div key={title} className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <MsIcon name={icon} className={`${color} text-[28px]`} />
                <span className="text-[11px] uppercase text-slate-muted">{tag}</span>
              </div>
              <div>
                <div className="text-[36px] leading-[44px] font-bold text-slate-black tabular-nums">{value}</div>
                <div className={`text-base font-semibold ${color}`}>{title}</div>
                <p className="text-xs text-slate-muted mt-1">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="facility-directory" className="w-full py-16 lg:py-24 bg-surface scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="text-[11px] uppercase tracking-wider text-teal-brand font-bold">Documented Institutional Deployments</span>
              <h2 className="landing-headline">Field Provenance & Clinical Impact Studies</h2>
              <p className="text-sm text-slate-body">Direct accounts of rota transitions from manual paper rosters and WhatsApp group disputes to algorithmic fairness.</p>
            </div>
            <div className="inline-flex flex-wrap p-1 bg-surface-container-low rounded-lg gap-1">
              {[
                ['all', 'All Centers'],
                ['teaching', 'Teaching Hospitals'],
                ['regional', 'Regional Hospitals'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer ${
                    filter === id ? 'bg-surface-container-lowest text-emerald-deep shadow-sm font-bold' : 'text-slate-muted hover:bg-surface-container'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {CASES.filter((item) => shown(item.kind)).map((item) => (
              <article key={item.id} className={`${item.span} bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col`}>
                {item.panel && <Panel label={item.panel} className={item.tall ? 'h-64 bg-mint-surface' : 'h-48 bg-surface-container'} />}
                <div className="p-5 flex flex-col gap-4 flex-1">
                  {!item.panel && (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase ${item.badgeClass}`}>{item.badge}</span>
                        <h3 className="landing-title mt-2">{item.title}</h3>
                        <span className="text-xs text-slate-muted">{item.unit}</span>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-mint-surface flex items-center justify-center text-emerald-deep shrink-0">
                        <MsIcon name={item.icon} className="text-[24px]" />
                      </div>
                    </div>
                  )}
                  {item.panel && (
                    <div>
                      <span className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase ${item.badgeClass}`}>{item.badge}</span>
                      <h3 className="landing-title mt-2">{item.title}</h3>
                      <span className="text-xs text-slate-muted">{item.unit}</span>
                    </div>
                  )}
                  {item.stats && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-container-low p-3 rounded-lg">
                      {item.stats.map(([label, value, color]) => (
                        <div key={label}>
                          <span className="text-[11px] text-slate-muted block">{label}</span>
                          <span className={`text-base font-bold tabular-nums ${color}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {item.pair && (
                    <div className="grid grid-cols-2 gap-3 bg-surface-container-low p-3 rounded-lg text-sm">
                      {item.pair.map(([label, value]) => (
                        <div key={label}>
                          <span className="text-[11px] text-slate-muted block">{label}</span>
                          <span className="font-bold text-slate-black">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-slate-body">{item.body}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-muted font-semibold">
                    <span>{item.foot}</span>
                    <span className="text-emerald-deep">{item.meta}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {MORE.some((item) => shown(item.kind)) && (
            <div className="bg-surface-container-low rounded-xl p-5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-base font-semibold text-slate-black">Other Active Ghana Health Service Deployments</span>
                <span className="text-[11px] text-slate-muted">Public Health Directorates & Polyclinics</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {MORE.filter((item) => shown(item.kind)).map((item) => (
                  <div key={item.name} className="bg-surface-container-lowest p-4 rounded-lg shadow-sm">
                    <span className="text-[13px] font-bold text-slate-black block">{item.name}</span>
                    <span className="text-xs text-slate-muted block">{item.unit}</span>
                    <span className="inline-block mt-2 text-[11px] text-forest-mid font-semibold">{item.staff}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="w-full bg-slate-canvas py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col gap-6">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-teal-brand font-bold">Geographic Reach</span>
            <h2 className="landing-headline">Nationwide Administrative Footprint</h2>
          </div>
          <div className="relative w-full min-h-80 rounded-xl overflow-hidden shadow-sm bg-mint-surface">
            <MsIcon name="public" className="absolute top-8 right-8 text-[72px] text-emerald-deep/20" />
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 bg-surface-container-lowest/95 p-4 rounded-xl shadow-lg flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-deep" />
                <span className="text-[13px] font-bold text-slate-black">National Network Headquarters</span>
              </div>
              <p className="text-xs text-slate-body">MoH & Ghana Health Service Administrative Gateway. Hosting encrypted duty rosters with off-grid offline local caching for remote clinics.</p>
              <div className="flex items-center justify-between text-[11px] font-semibold text-teal-brand">
                <span>Primary Node: Ridge / Accra</span>
                <span>Uptime: 99.98%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="deployment-protocol" className="w-full py-16 lg:py-24 bg-surface-container-lowest scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col gap-8">
          <div className="max-w-2xl">
            <span className="text-[11px] uppercase tracking-wider text-forest-mid font-bold">Rapid Onboarding Workflow</span>
            <h2 className="landing-headline">Directorate Integration Protocol</h2>
            <p className="text-sm text-slate-body">We designed MedRoster to deploy into existing Ghana Health Service hospital hierarchies in four pragmatic steps without disrupting ongoing clinical shifts.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(([num, time, title, body, icon, note]) => (
              <div key={num} className="bg-surface-container-low rounded-xl p-5 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="w-8 h-8 rounded-full bg-emerald-deep text-on-primary font-bold text-[13px] flex items-center justify-center">{num}</span>
                  <span className="text-[11px] text-slate-muted">{time}</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-black mb-1">{title}</h3>
                  <p className="text-xs text-slate-body">{body}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-deep">
                  <MsIcon name={icon} className="text-[16px]" />
                  {note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-surface py-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="bg-surface-container-lowest rounded-xl p-6 lg:p-8 shadow-md grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 flex flex-col gap-3">
              <span className="text-[11px] uppercase tracking-wide text-forest-mid font-bold">Rostering Efficiency Estimator</span>
              <h2 className="landing-headline">Calculate Monthly Hours Saved for Your Facility</h2>
              <p className="text-sm text-slate-body">Select your institution type and approximate ward count to calculate time restored to direct patient care and bedside supervision.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                {Object.entries(SCALES).map(([id, item]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setScale(id)}
                    className={`px-3 py-2 rounded-lg text-[11px] font-semibold cursor-pointer ${
                      scale === id ? 'bg-emerald-deep text-on-primary' : 'bg-surface-container-low text-slate-black hover:bg-mint-surface'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-6 bg-surface-container-low p-5 rounded-xl flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-slate-muted">Estimated Monthly Metric Impact</span>
                <span className="px-2.5 py-1 rounded bg-mint-surface text-emerald-deep text-[11px] font-bold">Act 651 Compliant</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-lowest p-4 rounded-lg">
                  <span className="text-[11px] text-slate-muted block">Admin Hours Saved/Mo</span>
                  <span className="text-[36px] leading-[44px] font-bold text-emerald-deep tabular-nums">{hours} hrs</span>
                  <span className="text-xs text-slate-muted">Reclaimed by Matrons</span>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-lg">
                  <span className="text-[11px] text-slate-muted block">Rota Conflict Reduction</span>
                  <span className="text-[36px] leading-[44px] font-bold text-teal-brand">100%</span>
                  <span className="text-xs text-slate-muted">Eliminates overlap</span>
                </div>
              </div>
              <div className="bg-surface-container-lowest p-4 rounded-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MsIcon name="groups" className="text-emerald-deep" />
                  <div>
                    <span className="text-[11px] text-slate-muted block">Clinician Reach</span>
                    <span className="text-base font-bold text-slate-black tabular-nums">~{current.clinicians} Healthcare Staff</span>
                  </div>
                </div>
                <a href="#request-deployment" className="px-4 py-2 rounded-lg bg-emerald-deep text-on-primary text-[11px] font-semibold hover:bg-forest-mid">Start Ingestion</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="request-deployment" className="w-full bg-emerald-deep text-on-primary py-16 lg:py-24 relative overflow-hidden scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint-surface/20 text-primary-fixed text-[11px] font-semibold w-fit">
              <MsIcon name="badge" className="text-[15px]" />
              Ghana Health Service Directorate Facilitation
            </div>
            <h2 className="landing-display landing-display-inverse">Request Hospital Deployment & On-Site Matron Training</h2>
            <p className="text-[15px] leading-6 text-mint-surface/90 max-w-xl">
              We provide on-site technical deployment teams to regional hospitals and polyclinics. We configure your ward rules, import clinical rotas, and train nurse managers within a single administrative morning.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={() => { setSent(false); setOpen(true); }} className="px-6 py-3.5 rounded-lg bg-on-primary text-emerald-deep font-bold text-[13px] shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                <MsIcon name="calendar_today" className="text-[20px]" />
                Schedule Institutional Briefing
              </button>
              <a href="tel:+233302000000" className="px-6 py-3.5 rounded-lg bg-forest-mid text-on-primary text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-teal-brand">
                <MsIcon name="call" className="text-[20px]" />
                Directorate Desk: +233 (0) 30 200 0000
              </a>
            </div>
            {sent && <p className="text-sm text-mint-surface">Request noted. A coordinator will contact the facility within 24 business hours.</p>}
            <div className="flex flex-wrap gap-4 text-[11px] text-mint-surface/80">
              {['No IT Infrastructure Overhead', 'Act 651 Statutory Verification', 'Offline Emergency Support'].map((item) => (
                <span key={item} className="flex items-center gap-1.5"><MsIcon name="check_circle" className="text-[16px]" />{item}</span>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 bg-surface-container-lowest text-on-surface rounded-xl p-5 shadow-xl flex flex-col gap-4">
            <div>
              <span className="text-[11px] uppercase text-slate-muted block">Direct Liaison</span>
              <h3 className="text-base font-bold text-slate-black">Health Directorate Dispatch Desk</h3>
              <span className="text-xs text-slate-muted">MedRoster Public Health Deployment Unit</span>
            </div>
            {[
              ['location_on', 'Accra Support Center:', 'Ridge Hospital Commercial Complex, GHS Access Wing, Castle Road, Accra'],
              ['mail', 'Institutional Inquiries:', 'deployments@medroster.health.gov.gh'],
              ['schedule', 'Support Availability:', '24/7 Clinical Emergency On-Call Rota Dispatch'],
            ].map(([icon, title, body]) => (
              <div key={title} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg">
                <MsIcon name={icon} className="text-emerald-deep text-[20px]" />
                <div>
                  <span className="text-[11px] font-bold text-slate-black block">{title}</span>
                  <span className="text-xs text-slate-body">{body}</span>
                </div>
              </div>
            ))}
            <div className="text-center text-[11px] text-slate-muted">Official GHS Rota Partner & Act 651 Audited</div>
          </div>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-[80] bg-slate-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-surface-container-lowest max-w-lg w-full rounded-xl shadow-2xl p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MsIcon name="local_hospital" className="text-emerald-deep" />
                <h3 className="text-base font-bold text-slate-black">Request Directorate Deployment</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 rounded-full hover:bg-surface-container text-slate-muted cursor-pointer" aria-label="Close">
                <MsIcon name="close" className="text-[18px]" />
              </button>
            </div>
            <p className="text-xs text-slate-body">Please enter hospital leadership details. A clinical deployment coordinator will review ward capacity and confirm the matron briefing window.</p>
            <label className="text-[11px] font-semibold text-slate-black">Hospital / Health Facility Name
              <input required className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="e.g. Ridge Hospital / Tema General" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold text-slate-black">Region
                <select className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                  {REGIONS.map((region) => <option key={region}>{region}</option>)}
                </select>
              </label>
              <label className="text-[11px] font-semibold text-slate-black">Estimated Wards
                <input type="number" min="1" max="100" defaultValue="6" className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" />
              </label>
            </div>
            <label className="text-[11px] font-semibold text-slate-black">Administrator / Matron In-Charge Name
              <input required className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="DDNS / Medical Superintendent Name" />
            </label>
            <label className="text-[11px] font-semibold text-slate-black">Official Contact Phone (Ghana)
              <input required type="tel" className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="+233 XX XXX XXXX" />
            </label>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-surface-container text-[13px] font-semibold text-slate-black cursor-pointer">Cancel</button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-emerald-deep text-on-primary text-[13px] font-semibold flex items-center gap-1.5 cursor-pointer">
                <MsIcon name="send" className="text-[16px]" /> Confirm On-Site Request
              </button>
            </div>
          </form>
        </div>
      )}
    </MarketingFrame>
  );
}
