import Link from 'next/link';
import MsIcon from './MsIcon';

export default function LandingCta({ isLoggedIn, guestOnly, hospitalId }) {
  const dashboardHref = hospitalId ? `/hospital/${hospitalId}` : '/individual';

  return (
    <section className="w-full bg-surface py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="p-8 lg:p-16 rounded-2xl bg-emerald-deep text-on-primary shadow-xl relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-forest-mid/50 blur-2xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-forest-mid/40 blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mint-surface/20 text-primary-fixed text-[11px] leading-[14px] font-semibold mb-6">
              <MsIcon name="verified" className="text-[16px]" />
              <span>Free for Individual Hospital Wards</span>
            </div>
            <h2 className="landing-display landing-display-inverse landing-display-cta">
              Ready to modernize duty rostering in your hospital?
            </h2>
            <p className="mt-4 text-[15px] leading-6 text-primary-fixed-dim max-w-2xl">
              Join hundreds of ward in-charges across Ghana who have replaced manual pencil rosters with intelligent, compliant, and zero-conflict clinical schedules.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              {isLoggedIn ? (
                <Link
                  href={dashboardHref}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-surface text-emerald-deep text-[13px] leading-4 font-semibold hover:bg-surface-container transition-all shadow-md"
                >
                  <MsIcon name="play_circle" className="text-[20px]" />
                  <span>Go to Dashboard</span>
                </Link>
              ) : (
                <Link
                  href="/guest"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-surface text-emerald-deep text-[13px] leading-4 font-semibold hover:bg-surface-container transition-all shadow-md"
                >
                  <MsIcon name="play_circle" className="text-[20px]" />
                  <span>Launch Guest Mode Demo</span>
                </Link>
              )}
              {!guestOnly && !isLoggedIn && (
                <Link
                  href="/auth/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-forest-mid text-on-primary text-[13px] leading-4 font-semibold hover:bg-teal-brand transition-all shadow-sm"
                >
                  <MsIcon name="corporate_fare" className="text-[20px]" />
                  <span>Request Hospital Training & Deployment</span>
                </Link>
              )}
              {!guestOnly && isLoggedIn && (
                <Link
                  href="/guest"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-forest-mid text-on-primary text-[13px] leading-4 font-semibold hover:bg-teal-brand transition-all shadow-sm"
                >
                  <MsIcon name="science" className="text-[20px]" />
                  <span>Open Guest Sandbox</span>
                </Link>
              )}
            </div>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-primary-fixed-dim text-xs leading-[18px]">
              {['No credit card required', 'Instant browser sandbox', 'GHS & MoH ready'].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <MsIcon name="check_circle" className="text-[16px]" />
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
