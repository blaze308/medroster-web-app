'use client';

import { useState } from 'react';
import MsIcon from '../landing/MsIcon';

export default function RulesClose() {
  const [downloaded, setDownloaded] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [briefed, setBriefed] = useState(false);

  const download = () => {
    if (preparing || downloaded) return;
    setPreparing(true);
    window.setTimeout(() => {
      setPreparing(false);
      setDownloaded(true);
    }, 1200);
  };

  let downloadLabel = 'Download Compliance Whitepaper';
  let downloadIcon = 'download';
  if (preparing) {
    downloadLabel = 'Generating Official Document...';
    downloadIcon = 'hourglass_empty';
  } else if (downloaded) {
    downloadLabel = 'Ready: GHS-Compliance-2025.pdf';
    downloadIcon = 'check_circle';
  }

  return (
    <section className="w-full px-4 lg:px-8 pb-20 max-w-7xl mx-auto">
      <div className="bg-gradient-to-br from-emerald-deep via-forest-mid to-stitch-primary rounded-xl p-8 lg:p-12 text-on-primary shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 opacity-10 pointer-events-none" aria-hidden="true">
          <svg fill="currentColor" viewBox="0 0 200 200">
            <path d="M100,20 L120,70 L170,70 L130,105 L145,155 L100,125 L55,155 L70,105 L30,70 L80,70 Z" />
          </svg>
        </div>
        <div className="flex flex-col gap-4 max-w-2xl relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-mint-surface/20 text-mint-surface text-[11px] leading-[14px] font-semibold uppercase tracking-wider">
              Official Publication 2025/2026
            </span>
            <span className="flex items-center gap-1 text-mint-surface text-xs font-medium">
              <MsIcon name="verified" className="text-[16px]" /> MoH Approved Format
            </span>
          </div>
          <h2 className="landing-headline landing-headline-inverse">
            Download Official GHS Nursing Protocol & Act 651 Compliance Whitepaper
          </h2>
          <p className="text-sm leading-5 text-on-primary/80">
            The definitive guide for Medical Superintendents, Ward In-Charges, and Regional Health Administrators detailing mandatory shift thresholds, legal rest definitions, and automated dispute resolution workflows under Ghanaian statutory law.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-on-primary/70 text-xs pt-2">
            <span className="flex items-center gap-1"><MsIcon name="description" className="text-[16px]" /> PDF format (4.2 MB)</span>
            <span>•</span>
            <span className="flex items-center gap-1"><MsIcon name="history_edu" className="text-[16px]" /> Includes Act 651 Legal Appendix</span>
            <span>•</span>
            <span className="flex items-center gap-1"><MsIcon name="draw" className="text-[16px]" /> Sign-off Ready Template</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full sm:w-auto relative z-10 shrink-0">
          <button
            type="button"
            onClick={download}
            className={`px-6 py-3.5 rounded-lg text-emerald-deep text-[13px] leading-4 font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              downloaded ? 'bg-mint-surface' : 'bg-surface-container-lowest hover:bg-mint-surface'
            }`}
          >
            <MsIcon name={downloadIcon} className="text-[20px]" />
            <span>{downloadLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => setBriefed(true)}
            className="px-6 py-3.5 rounded-lg bg-emerald-deep/40 hover:bg-emerald-deep/60 text-on-primary text-[13px] leading-4 font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MsIcon name="calendar_today" className="text-[20px]" />
            Request Directorate Briefing
          </button>
          {briefed && (
            <p className="text-xs text-mint-surface max-w-xs">
              Directorate consultation noted. A GHS implementation specialist will contact the administration office within 24 hours.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
