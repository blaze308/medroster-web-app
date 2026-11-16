'use client';

import Link from 'next/link';
import MsIcon from '../landing/MsIcon';

const TABS = [
  ['signin', 'Sign In', '/auth/signin'],
  ['join', 'Join Hospital', '/auth/join'],
  ['register', 'Register Facility', '/auth/register'],
];

const CENTERS = [
  ['Korle Bu Teaching', 'KBTH Acc. Core Units'],
  ['Greater Accra Regional', 'Ridge Emergency Wing'],
  ['Komfo Anokye Teaching', 'KATH ICU / Pediatrics'],
  ['Tamale Teaching', 'TTH Northern Regional'],
];

export default function AuthGateway({ tab, children }) {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5 min-w-0 bg-emerald-deep text-on-primary p-8 flex flex-col justify-between gap-8 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-forest-mid/30 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="" className="w-10 h-10 bg-surface-container-lowest/15 rounded-lg p-1" />
              <span>
                <span className="block font-semibold">MedRoster <span className="text-[11px] uppercase tracking-wider">Ghana</span></span>
                <span className="block text-[11px] text-primary-fixed-dim">Clinical Workforce & Ward Governance</span>
              </span>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-forest-mid/60 text-primary-fixed text-[11px] font-semibold w-fit">
              <MsIcon name="verified" className="text-[14px]" /> Ghana Health Service Directorate Endorsed
            </span>
            <h2 className="landing-headline landing-headline-inverse">National Clinical Duty & Handover Architecture</h2>
            <p className="text-sm text-primary-fixed-dim">Strictly harmonized with Ghana Labour Act, 2003 (Act 651) for clinical shift rest, on-call safety, and nursing rosters.</p>
          </div>
          <div className="relative">
            <p className="text-[11px] uppercase tracking-widest text-primary-fixed-dim mb-2">Deployed across tertiary centres</p>
            <div className="grid grid-cols-2 gap-2">
              {CENTERS.map(([name, detail]) => (
                <div key={name} className="p-3 rounded-lg bg-surface-container-lowest/10">
                  <p className="text-[13px] font-semibold">{name}</p>
                  <p className="text-xs text-primary-fixed-dim">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-7 min-w-0 p-6 lg:p-8 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-muted">MedRoster Single Sign-On</span>
              <h1 className="landing-title">Clinical Gateway Access</h1>
            </div>
            <Link href="/guest" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mint-surface text-emerald-deep text-[13px] font-semibold w-fit">
              <MsIcon name="speed" className="text-[16px]" /> Guest Sandbox Mode
            </Link>
          </div>
          <div className="flex gap-1 bg-slate-canvas p-1 rounded-lg">
            {TABS.map(([id, label, href]) => (
              <Link
                key={id}
                href={href}
                className={`flex-1 py-2 rounded-md text-center text-[13px] font-semibold ${
                  tab === id ? 'bg-surface-container-lowest text-emerald-deep shadow-sm' : 'text-slate-muted hover:text-slate-black'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <div>{children}</div>
        </div>
      </div>
    </main>
  );
}
