'use client';

import { useState } from 'react';
import Link from 'next/link';
import MsIcon from '../landing/MsIcon';
import MarketingFrame from '../marketing/MarketingFrame';
import { isGuestOnlyTesting } from '../../lib/guest-only-testing';

const MONEY = {
  ghs: {
    free: 'GH₵ 0',
    month: 'GH₵ 450',
    year: 'GH₵ 4,500',
    unit: '/ month per facility',
    yearNote: 'or GH₵ 4,500/year billed annually',
    leakage: 'GH₵ 18,500',
    axis: ['GH₵ 20k', 'GH₵ 12k', 'GH₵ 5k', 'GH₵ 0'],
    bars: ['GH₵ 18.5k', 'GH₵ 11.2k', 'GH₵ 450'],
  },
  usd: {
    free: '$0',
    month: '$35',
    year: '$350',
    unit: '/ month per facility',
    yearNote: 'or $350/year billed annually',
    leakage: '$1,400',
    axis: ['$1.5k', '$900', '$380', '$0'],
    bars: ['$1,400', '$850', '$35'],
  },
};

const FAQS = [
  {
    q: 'Can hospital rotation funds or GHS IGF (Internally Generated Funds) be used to pay for MedRoster?',
    a: 'Yes. MedRoster is classified under Public Procurement Authority (PPA) Class 8411 (Hospital Administrative & Software Support Services). Hospitals can disburse funds from ward administration allocations, clinical staff development budgets, or facility IGF accounts. Formal Ghana GRA tax invoices include VAT/NHIL/GETFund withholdings and GIFMIS vendor coding.',
  },
  {
    q: 'Do we need reliable high-speed internet connection in every clinical ward?',
    a: 'No. Duty matrix changes work in a local offline browser cache and sync when connectivity returns. Ward sisters can still generate a compliant noticeboard roster from a laptop or phone.',
  },
  {
    q: 'How does automated N&MC PIN/AIN and MDC license verification work?',
    a: 'Hospital Directorate and Teaching Hospital tiers check Nursing and Midwifery Council (N&MC) and Medical & Dental Council (MDC) credential rosters. If a nurse or medical officer is placed on an emergency or surgical rotation with an expired practicing certificate, the Matron is alerted.',
  },
  {
    q: 'What is the implementation timeline for a full district hospital?',
    a: 'A typical 12-to-15 ward district hospital can be onboarded within 48 to 72 hours. Ward names, staff ranks, and shift templates are pre-configured. Matrons receive a 45-minute briefing, then active rosters can be published.',
  },
];

const MATRIX = [
  { kind: 'head', label: '1. Core Clinical Rostering' },
  { label: 'Ward / Unit Allowance', cells: ['1 Ward', 'Up to 15 Wards', 'Unlimited'] },
  { label: 'Clinician Capacity (Per Ward)', cells: ['Up to 25 Staff', 'Up to 350 Total Staff', 'Unlimited'] },
  { label: 'Cross-Ward Cover & Float Pool Routing', cells: ['dash', 'check', 'check'] },
  { label: 'Automated Shift Conflict Resolution', cells: ['Manual Highlight', 'Auto-Balancing Engine', 'AI Multi-Unit Optimizer'] },
  { kind: 'head', label: '2. Statutory Labour Act 651 & GHS Mandates' },
  { label: 'Maximum Weekly Hours Rule (40h Cap)', cells: ['check', 'check', 'check'] },
  { label: 'Mandatory 48-Hour Continuous Rest Safeguard', cells: ['check', 'check', 'check'] },
  { label: 'Night-to-Morning Duty Turnaround Block (12h Gap)', cells: ['check', 'check', 'check'] },
  { label: 'Annual Leave Balance Tracking & Rollover Audit', cells: ['dash', 'check', 'check'] },
  { kind: 'head', label: '3. Staff Governance & Registry Verification' },
  { label: 'N&MC PIN/AIN Automated Registry Check', cells: ['dash', 'check', 'check'] },
  { label: 'MDC (Medical & Dental Council) Folio Logs', cells: ['dash', 'check', 'check'] },
  { label: 'Matron & Med Superintendent Digital Sign-off', cells: ['dash', '2-Tier Signoff', 'Multi-Tier Directorate Signoff'] },
  { kind: 'head', label: '4. Export Formats & Accessibility' },
  { label: 'Official GHS Ward Noticeboard PDF (A3/A4)', cells: ['check', 'check', 'check'] },
  { label: 'WhatsApp Shift Roster Card Broadcast', cells: ['Individual Manual', 'Automated Ward Group', 'Automated Direct Clinician SMS & WhatsApp'] },
  { label: 'Lightwave EHR / DHIMS2 Sync Connector', cells: ['dash', 'Add-on', 'Included'] },
  { kind: 'head', label: '5. Training, Governance & Support' },
  { label: 'Technical Support Channels', cells: ['Community Forum', 'Priority Ghana WhatsApp', '24/7 Dedicated Account Lead'] },
  { label: 'On-Site Hospital Sister Training Sessions', cells: ['dash', 'Webinar Only', 'In-Person Ward Sessions'] },
];

function Cell({ value, featured }) {
  const tone = featured ? 'bg-mint-surface/30 font-semibold text-forest-mid' : '';
  if (value === 'check') {
    return (
      <td className={`p-3 text-center text-forest-mid ${tone}`}>
        <MsIcon name="check_circle" className="text-[18px]" />
      </td>
    );
  }
  if (value === 'dash') {
    return (
      <td className={`p-3 text-center text-slate-muted ${featured ? 'bg-mint-surface/30' : ''}`}>
        <MsIcon name="remove" className="text-[18px]" />
      </td>
    );
  }
  return <td className={`p-3 text-center text-sm ${tone}`}>{value}</td>;
}

export default function PricingScreen() {
  const [currency, setCurrency] = useState('ghs');
  const [openFaq, setOpenFaq] = useState(null);
  const money = MONEY[currency];
  const paidHref = isGuestOnlyTesting() ? '/guest' : '/auth/register';

  return (
    <MarketingFrame>
      <section className="w-full bg-surface-container-lowest py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col items-center text-center gap-4">
          <span className="text-[11px] uppercase tracking-wider font-bold text-forest-mid">Institutional Plans</span>
          <h1 className="landing-display max-w-3xl">Clear prices for a ward, a hospital, or a regional directorate</h1>
          <p className="text-sm text-slate-body max-w-2xl">
            Community wards stay free. Hospital directorates pay in Ghana cedis or US dollars. Teaching hospitals and regional directorates use a master procurement contract.
          </p>
          <div className="inline-flex p-1 rounded-lg bg-surface-container-low">
            {[
              ['ghs', 'GHS'],
              ['usd', 'USD'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCurrency(id)}
                className={`px-4 py-1.5 rounded-md text-[13px] font-semibold cursor-pointer ${
                  currency === id ? 'bg-emerald-deep text-on-primary' : 'text-slate-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <article className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-slate-canvas text-slate-muted text-[11px] font-semibold uppercase">Community Ward</span>
              <MsIcon name="medical_services" className="text-slate-muted text-[22px]" />
            </div>
            <h2 className="landing-title mt-4">Individual Ward</h2>
            <p className="text-xs text-slate-muted mt-1">Single Ward In-Charge / Nurse-in-Charge / Sister-in-Charge</p>
            <div className="my-5 py-3 px-4 bg-slate-canvas rounded-lg">
              <div className="flex items-baseline gap-1">
                <span className="text-[36px] leading-[44px] font-bold text-slate-black">{money.free}</span>
                <span className="text-xs text-slate-muted">/ month</span>
              </div>
              <span className="text-[11px] font-bold text-teal-brand">Free Forever • No Credit Card Required</span>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-slate-body flex-1 mb-5">
              {['Up to 25 Clinicians per ward', '1 Live Active Ward Duty Matrix', 'GHS Rank Hierarchy rule presets (NO, SSN, SN, EN)', 'Ghana Labour Act 651 shift compliance audits', '1-Click Noticeboard PDF standard printout', 'Full Guest Simulator & Sandbox access'].map((item) => (
                <li key={item} className="flex items-start gap-2"><MsIcon name="check_circle" className="text-forest-mid text-[18px] shrink-0" />{item}</li>
              ))}
            </ul>
            <Link href="/guest" className="w-full text-center py-2.5 rounded-lg bg-mint-surface text-emerald-deep text-[13px] font-semibold hover:bg-secondary-container">
              Start Free in Guest Mode
            </Link>
          </article>

          <article className="flex flex-col bg-surface-container-lowest rounded-xl shadow-md p-6 lg:-mt-3 ring-2 ring-emerald-deep/20">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-mint-surface text-emerald-deep text-[11px] font-bold uppercase">Most Popular</span>
              <MsIcon name="apartment" className="text-emerald-deep text-[22px]" />
            </div>
            <h2 className="landing-title mt-4">Hospital Directorate</h2>
            <p className="text-xs text-slate-muted mt-1">District, Municipal & Regional Hospitals (Up to 15 Wards / 350 Staff)</p>
            <div className="my-5 py-3 px-4 bg-mint-surface/50 rounded-lg">
              <div className="flex items-baseline gap-1">
                <span className="text-[36px] leading-[44px] font-bold text-forest-mid">{money.month}</span>
                <span className="text-xs text-slate-muted">{money.unit}</span>
              </div>
              <div className="text-[11px] text-emerald-deep">
                {money.yearNote} <span className="bg-primary-fixed text-stitch-primary px-1.5 py-0.5 rounded text-[10px] font-bold">SAVE 17%</span>
              </div>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-slate-body flex-1 mb-5">
              {['Everything in Community Free, plus:', 'Multi-Ward Cross-Cover & Float Pool routing', 'Matron & Medical Superintendent digital approval flow', 'Live N&MC PIN/AIN auto-validation registry', 'Statutory annual leave tracking & roll-over balancing', 'Dedicated Ghana WhatsApp Priority Matron Support'].map((item, index) => (
                <li key={item} className={`flex items-start gap-2 ${index === 0 ? 'font-bold text-slate-black' : ''}`}>
                  <MsIcon name={index === 0 ? 'verified' : 'check_circle'} className={`${index === 0 ? 'text-teal-brand' : 'text-forest-mid'} text-[18px] shrink-0`} />
                  {item}
                </li>
              ))}
            </ul>
            <Link href={paidHref} className="w-full text-center py-2.5 rounded-lg bg-emerald-deep text-on-primary text-[13px] font-semibold hover:bg-forest-mid">
              Deploy for Your Hospital
            </Link>
          </article>

          <article className="flex flex-col bg-surface-container-lowest rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-slate-canvas text-slate-muted text-[11px] font-semibold uppercase">Enterprise Tertiary</span>
              <MsIcon name="account_balance" className="text-slate-muted text-[22px]" />
            </div>
            <h2 className="landing-title mt-4">Teaching Hospital & Directorate</h2>
            <p className="text-xs text-slate-muted mt-1">Teaching Hospitals (Korle Bu, KATH, Ridge, TTH) & Regional Directorates</p>
            <div className="my-5 py-3 px-4 bg-slate-canvas rounded-lg">
              <div className="text-2xl font-bold text-slate-black">Custom Institutional</div>
              <span className="text-[11px] text-slate-muted">Tailored Master Procurement Contract via MoH / GHS</span>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-slate-body flex-1 mb-5">
              {['Everything in Hospital Directorate, plus:', 'Unlimited Wards, Units, Clinics & 1,000+ Clinicians', 'EHR/HMIS Lightwave & Hospital E-Record Integration', 'Single Sign-On (SSO) with GHS Official Staff Portals', 'On-site Matron & Ward Sister CPD Accredited Workshops', 'Guaranteed 99.9% Uptime SLA with 24/7 Rapid Incident Call'].map((item, index) => (
                <li key={item} className={`flex items-start gap-2 ${index === 0 ? 'font-bold text-slate-black' : ''}`}>
                  <MsIcon name={index === 0 ? 'verified' : 'check_circle'} className={`${index === 0 ? 'text-teal-brand' : 'text-forest-mid'} text-[18px] shrink-0`} />
                  {item}
                </li>
              ))}
            </ul>
            <Link href={paidHref} className="w-full text-center py-2.5 rounded-lg bg-surface-container-high text-on-surface text-[13px] font-semibold hover:bg-surface-container">
              Contact Institutional Solutions
            </Link>
          </article>
        </div>
      </section>

      <section className="w-full py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 bg-mint-surface/40 rounded-xl p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 flex flex-col gap-3">
            <span className="text-[11px] uppercase tracking-wider font-bold text-forest-mid">Public Health Return on Investment</span>
            <h2 className="landing-headline">Why MedRoster pays for itself within 14 days of ward deployment.</h2>
            <p className="text-sm text-slate-body">
              Rostering inefficiencies cost an average 180-bed Ghanaian district hospital over <strong>{money.leakage} monthly</strong> in unaccounted clinician overtime, roster-gap locum spend, and administrative nurse hours spent reconciling paper books.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-lg bg-surface-container-lowest shadow-sm">
                <div className="text-[32px] leading-10 font-bold text-forest-mid">84 hrs</div>
                <p className="text-xs text-slate-muted">Saved monthly per Ward In-Charge in paper reconciliation</p>
              </div>
              <div className="p-4 rounded-lg bg-surface-container-lowest shadow-sm">
                <div className="text-[32px] leading-10 font-bold text-teal-brand">100%</div>
                <p className="text-xs text-slate-muted">Ghana Labour Act 651 continuous duty violation elimination</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 bg-surface-container-lowest p-5 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-3 bg-slate-canvas p-2 rounded text-[11px]">
              <span className="text-slate-muted">GHS 250-Bed Hospital Overtime & Audit Leakage</span>
              <span className="text-emerald-deep font-bold">Monthly Assessment</span>
            </div>
            <svg className="w-full h-auto" viewBox="0 0 460 210" role="img" aria-label="Monthly leakage comparison">
              <line stroke="#E2E8F0" strokeDasharray="3 3" x1="60" x2="440" y1="30" y2="30" />
              <line stroke="#E2E8F0" strokeDasharray="3 3" x1="60" x2="440" y1="80" y2="80" />
              <line stroke="#E2E8F0" strokeDasharray="3 3" x1="60" x2="440" y1="130" y2="130" />
              <line stroke="#E2E8F0" x1="60" x2="440" y1="180" y2="180" />
              {money.axis.map((label, index) => (
                <text key={label} fill="#64748B" fontSize="10" x="8" y={34 + index * 50}>{label}</text>
              ))}
              <rect fill="#CBD5E1" height="138" rx="4" width="60" x="90" y="42" />
              <text fill="#0F172A" fontSize="11" fontWeight="700" x="90" y="32">{money.bars[0]}</text>
              <text fill="#64748B" fontSize="11" x="78" y="200">Paper / Ledger</text>
              <rect fill="#96D3BC" height="95" rx="4" width="60" x="210" y="85" />
              <text fill="#0F5A44" fontSize="11" fontWeight="700" x="214" y="75">{money.bars[1]}</text>
              <text fill="#64748B" fontSize="11" x="205" y="200">Raw Excel</text>
              <rect fill="#0A4D3C" height="15" rx="4" width="60" x="330" y="165" />
              <text fill="#0A4D3C" fontSize="11" fontWeight="700" x="328" y="155">{money.bars[2]}</text>
              <text fill="#0A4D3C" fontSize="11" fontWeight="700" x="325" y="200">MedRoster</text>
            </svg>
            <p className="text-xs text-slate-muted text-center mt-3">
              Calculated using MoH Grade 18 Ward Sister hourly benchmarks and roster dispute audits across Eastern and Greater Accra health directorates.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full py-12">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-[11px] uppercase tracking-wider font-bold text-forest-mid">In-Depth Comparison</span>
            <h2 className="landing-headline">Transparent Feature Matrix</h2>
            <p className="text-sm text-slate-body">Examine every administrative capability, statutory guardrail, and export format across all three operational tiers.</p>
          </div>
          <div className="overflow-x-auto rounded-xl shadow-sm bg-surface-container-lowest">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-surface-container-high/60 text-sm">
                  <th className="p-3 text-slate-black w-2/5">Capability Area</th>
                  <th className="p-3 text-center text-slate-black">Community Free</th>
                  <th className="p-3 text-center text-forest-mid bg-mint-surface/70">Hospital Directorate</th>
                  <th className="p-3 text-center text-slate-black">Teaching / Regional</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  row.kind === 'head' ? (
                    <tr key={row.label} className="bg-slate-canvas">
                      <td colSpan={4} className="py-2.5 px-3 text-[13px] font-bold uppercase tracking-wider text-slate-black">{row.label}</td>
                    </tr>
                  ) : (
                    <tr key={row.label} className="border-t border-surface-container-high text-slate-body">
                      <td className="p-3 text-sm">{row.label}</td>
                      <Cell value={row.cells[0]} />
                      <Cell value={row.cells[1]} featured />
                      <Cell value={row.cells[2]} />
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="w-full py-12">
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          <div className="text-center mb-6">
            <span className="text-[11px] uppercase tracking-wider font-bold text-forest-mid">Ghana Public Procurement Guidance</span>
            <h2 className="landing-headline">Frequently Asked Procurement Questions</h2>
            <p className="text-sm text-slate-body">Standard administrative procedures, payment authorizations, and IT requirements for public institutions.</p>
          </div>
          <div className="flex flex-col gap-3">
            {FAQS.map((item, index) => {
              const open = openFaq === index;
              return (
                <div key={item.q} className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                  <button
                    type="button"
                    className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer"
                    aria-expanded={open}
                    onClick={() => setOpenFaq(open ? null : index)}
                  >
                    <span className="text-base font-bold text-slate-black">{item.q}</span>
                    <MsIcon name="expand_more" className={`text-forest-mid shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <p className="px-5 pb-5 text-sm text-slate-body">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="w-full pb-16">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="bg-stitch-primary rounded-xl text-on-primary p-6 lg:p-10 relative overflow-hidden shadow-xl">
            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-forest-mid/50 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex flex-col gap-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-forest-mid text-primary-fixed text-[11px] font-semibold w-fit">
                  <MsIcon name="account_balance" className="text-[16px]" />
                  Ghana Health Service Directorate Procurement Desk
                </div>
                <h2 className="landing-headline landing-headline-inverse">Ready to deploy institutional rostering across your regional health directorate?</h2>
                <p className="text-sm text-primary-fixed-dim">Speak directly with our Public Health Technology Advisory Group. We prepare custom cabinet memos, PPA documentation, and multi-facility implementation roadmaps.</p>
                <div className="flex flex-wrap gap-4 text-[11px] text-primary-fixed">
                  <span className="flex items-center gap-1.5"><MsIcon name="call" className="text-[16px]" />Accra HQ: +233 (0) 302 789 450</span>
                  <span className="flex items-center gap-1.5"><MsIcon name="mail" className="text-[16px]" />directorate@medroster.gh</span>
                  <span className="flex items-center gap-1.5"><MsIcon name="location_on" className="text-[16px]" />Ridge Medical Enclave, Accra</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto shrink-0">
                <Link href="/demo" className="px-6 py-3 rounded-lg bg-mint-surface text-emerald-deep font-bold text-[13px] text-center">Launch Instant Sandbox Demo</Link>
                <Link href="/hospitals" className="px-6 py-3 rounded-lg bg-forest-mid text-on-primary text-[13px] text-center">Request Official Procurement Pack</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingFrame>
  );
}
