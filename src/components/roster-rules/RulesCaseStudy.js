import MsIcon from '../landing/MsIcon';

function PlacePanel({ icon, label, className = '' }) {
  return (
    <div className={`rounded-xl overflow-hidden shadow-sm h-52 relative flex items-end p-3 ${className}`}>
      <MsIcon name={icon} className="absolute top-4 left-4 text-[36px] text-emerald-deep/40" />
      <span className="px-2 py-0.5 rounded bg-slate-black/80 text-on-primary text-[11px] leading-[14px] font-semibold">{label}</span>
    </div>
  );
}

export default function RulesCaseStudy() {
  return (
    <section className="w-full px-4 lg:px-8 py-16 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 flex flex-col gap-6">
          <span className="text-[11px] leading-[14px] text-teal-brand tracking-widest uppercase font-bold">Field Deployment & Accreditation</span>
          <h2 className="landing-headline">Empowering Ward In-Charges Across Ghana&apos;s Regional Health Directorates</h2>
          <p className="text-sm leading-5 text-slate-body">
            From the Greater Accra Regional Hospital (Ridge) to Tamale Teaching Hospital and Effia Nkwanta Regional Hospital in Sekondi, MedRoster replaces stressful paper registers and manual spreadsheet disputes with statutory legal tranquility.
          </p>
          <div className="p-5 rounded-xl bg-surface-container flex flex-col gap-3">
            <p className="text-sm leading-5 text-slate-black italic">
              &ldquo;Before MedRoster, verifying N&MC PIN dates and ensuring our younger staff nurses were never left unchaperoned on acute night duty took three days of manual checking each month. Now, the system refuses to generate a roster if a statutory guideline is breached.&rdquo;
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="w-9 h-9 rounded-full bg-emerald-deep text-on-primary flex items-center justify-center text-[11px] font-bold shrink-0">EA</div>
              <div>
                <span className="text-[13px] leading-4 text-slate-black font-bold block">Eunice Appiah-Danquah, PNO</span>
                <span className="text-xs text-slate-muted">Deputy Director of Nursing Services (DDNS) • Eastern Regional Hospital</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <PlacePanel icon="clinical_notes" label="Nursing Admin Office" className="bg-surface-container" />
            <div className="p-4 rounded-xl bg-mint-surface flex flex-col gap-1">
              <span className="text-[36px] leading-[44px] font-bold text-emerald-deep">14 Reg</span>
              <span className="text-[11px] font-semibold text-forest-mid uppercase">Directorates Standardized</span>
              <span className="text-xs text-forest-mid/80">Ghana Health Service aligned protocols</span>
            </div>
          </div>
          <div className="flex flex-col gap-4 mt-6">
            <div className="p-4 rounded-xl bg-surface-container flex flex-col gap-1">
              <span className="text-[36px] leading-[44px] font-bold text-slate-black">0%</span>
              <span className="text-[11px] font-semibold text-slate-muted uppercase">Labour Court Injunctions</span>
              <span className="text-xs text-slate-body">Zero Act 651 overtime citations</span>
            </div>
            <PlacePanel icon="local_hospital" label="Inpatient Wards" className="bg-mint-surface" />
          </div>
        </div>
      </div>
    </section>
  );
}
