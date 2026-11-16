import MsIcon from './MsIcon';

const HOSPITALS = [
  'Korle Bu Teaching Hospital',
  'Ridge Hospital (GARH)',
  'Komfo Anokye Teaching Hospital',
  'Tamale Teaching Hospital',
  'Ho Teaching Hospital',
];

export default function LandingTestimonial() {
  return (
    <section className="w-full bg-surface-container-lowest py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto p-8 lg:p-12 rounded-xl bg-surface shadow-sm">
          <div className="flex items-center gap-1 text-amber-shift mb-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <MsIcon key={index} name="star" className="text-[20px]" fill />
            ))}
          </div>
          <blockquote className="landing-headline">
            “What used to take an entire weekend with pencil and eraser now takes 3 minutes. The staff love the fairness, and the PIN validation prevents scheduling errors before we submit to the Matron.”
          </blockquote>
          <div className="mt-8 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-mint-surface text-emerald-deep flex items-center justify-center text-base font-bold shadow-sm shrink-0">
              VQ
            </div>
            <div className="text-left">
              <div className="landing-subtitle">Matron Vida Quaye, SNO</div>
              <div className="text-xs leading-[18px] text-on-surface-variant">Ward In-Charge, Greater Accra Regional Hospital (Ridge)</div>
            </div>
          </div>
        </div>

        <div id="hospitals" className="mt-16 text-center scroll-mt-24">
          <span className="text-[11px] leading-[14px] text-slate-muted uppercase tracking-wider font-semibold">
            Architected for Ghana’s Leading Healthcare Institutions
          </span>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:gap-6 text-slate-body text-[13px] leading-4 font-semibold">
            {HOSPITALS.map((name) => (
              <div key={name} className="px-4 py-2 rounded-lg bg-surface shadow-sm flex items-center gap-2">
                <MsIcon name="local_hospital" className="text-[18px] text-teal-brand" />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
