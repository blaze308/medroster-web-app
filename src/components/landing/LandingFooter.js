import Link from 'next/link';
import MsIcon from './MsIcon';

function TextLink({ href, children }) {
  const className = 'text-xs leading-[18px] text-on-surface-variant hover:text-on-surface transition-colors text-left';
  if (href.startsWith('/')) {
    return <Link href={href} className={className}>{children}</Link>;
  }
  return <a href={href} className={className}>{children}</a>;
}

export default function LandingFooter({ guestOnly }) {
  return (
    <footer className="w-full bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="" className="h-7 w-7 object-contain" />
              <span className="text-base leading-6 text-stitch-primary font-bold">MedRoster</span>
            </div>
            <p className="text-xs leading-[18px] text-on-surface-variant">
              Intelligent clinical duty scheduling built for Ghanaian regional hospitals, polyclinics, and directorates.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-surface-container text-stitch-secondary text-[11px] leading-[14px] font-semibold w-fit">
              <MsIcon name="verified" className="text-[16px]" />
              GHS Rostering Protocol Certified
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] leading-4 text-on-surface font-bold">Solutions</span>
            <TextLink href="/#features">Ward & OPD Rostering</TextLink>
            <TextLink href="/guest">Live Roster Simulator</TextLink>
            <TextLink href="/hospitals">Regional Hospitals Directory</TextLink>
            {!guestOnly && <TextLink href="/auth/register">Directorate Subscriptions</TextLink>}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] leading-4 text-on-surface font-bold">Statutory Compliance</span>
            {['Act 651 Labour Standards', 'Mandatory Rest Intervals', 'Continuous Duty Safeguards', 'Statutory Leave Allocations'].map((label) => (
              <TextLink key={label} href="/roster-rules">{label}</TextLink>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] leading-4 text-on-surface font-bold">Ghana Health Service</span>
            <p className="text-xs leading-[18px] text-on-surface-variant">
              Designed strictly in accordance with Ghana Labour Act 2003 (Act 651) Section 40-44 guidelines for public emergency and medical services duty rosters.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <MsIcon name="local_hospital" className="text-stitch-secondary text-[20px]" />
              <span className="text-[11px] leading-[14px] font-semibold text-slate-body">MoH & GHS Standard Format</span>
            </div>
          </div>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-container/50 px-3 py-2 rounded-lg">
          <span className="text-xs leading-[18px] text-on-surface-variant text-center sm:text-left">
            © 2026 MedRoster Systems Ltd. Designed for Ghana Health Service institutions.
          </span>
          <div className="flex items-center gap-5">
            <Link href="/roster-rules" className="text-[11px] leading-[14px] font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
              Legal Compliance
            </Link>
            {!guestOnly && (
              <Link href="/auth/signin" className="text-[11px] leading-[14px] font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
                Staff Portal Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
