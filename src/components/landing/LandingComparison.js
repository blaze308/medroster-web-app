import Link from 'next/link';
import MsIcon from './MsIcon';

const BEFORE = [
  '14+ hours per month spent erasing paper grids, manually recounting shift quotas per staff member.',
  'Frequent WhatsApp disputes over perceived favoritism on night shift rotation and weekend coverage.',
  'Accidental Act 651 breaches like scheduling back-to-back nights without the required 48-hour recovery interval.',
  'Unverified license numbers leading to compliance audit failures when expired PINs appear on duty sheets.',
];

const AFTER = [
  'Generated in under 3 minutes with equitable night, afternoon, and weekend distributions computed instantly.',
  'Transparent fairness logs that show team members why each shift was assigned, ending favoritism claims.',
  'Automatic Labour Act safeguards preventing burnout and verifying statutory leave entitlements ahead of time.',
  'N&MC PIN/AIN validation ensuring every clinician scheduled is legally certified and active in good standing.',
];

export default function LandingComparison() {
  return (
    <section className="w-full bg-surface py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[11px] leading-[14px] uppercase tracking-wider text-teal-brand font-bold">
            The Practical Shift
          </span>
          <h2 className="mt-2 landing-display">
            Why Ward In-Charges are Retiring Paper Rosters
          </h2>
          <p className="mt-2 text-[15px] leading-6 text-on-surface-variant">
            Roster preparation used to steal full weekends from nursing leadership. Here is what shifts when your ward moves to MedRoster.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="p-8 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6 bg-crimson-surface/40 p-3 rounded-lg">
              <MsIcon name="cancel" className="text-crimson-alert text-[24px]" />
              <span className="landing-subtitle landing-subtitle-alert">The Manual Way (Pencil & WhatsApp)</span>
            </div>
            <ul className="flex flex-col gap-4 text-sm leading-5 text-slate-body flex-1">
              {BEFORE.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <MsIcon name="close" className="text-crimson-alert text-[20px] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 bg-surface-container-low p-4 rounded-lg text-slate-muted text-xs leading-[18px] flex items-center gap-2">
              <MsIcon name="sentiment_dissatisfied" className="text-[18px]" />
              <span>Result: Fatigued charge nurses, frequent shift gaps, and audit stress.</span>
            </div>
          </div>

          <div className="p-8 rounded-xl bg-surface-container-lowest shadow-md flex flex-col">
            <div className="flex items-center gap-3 mb-6 bg-mint-surface p-3 rounded-lg">
              <MsIcon name="check_circle" className="text-emerald-deep text-[24px]" />
              <span className="landing-subtitle landing-subtitle-ok">The MedRoster Way (Algorithmic & Fair)</span>
            </div>
            <ul className="flex flex-col gap-4 text-sm leading-5 text-on-surface flex-1">
              {AFTER.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <MsIcon name="check" className="text-emerald-deep text-[20px] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 bg-mint-surface p-4 rounded-lg text-forest-mid text-xs leading-[18px] flex items-center gap-2">
              <MsIcon name="verified" className="text-[18px]" />
              <span>Result: Rested staff, 100% compliant audits, and 12+ hours saved every month.</span>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 rounded-xl bg-surface-container flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-deep text-on-primary flex items-center justify-center shrink-0">
              <MsIcon name="science" className="text-[24px]" />
            </div>
            <div className="text-left">
              <h3 className="landing-subtitle">Test your ward in 30 seconds. No login required.</h3>
              <p className="text-xs leading-[18px] text-on-surface-variant">
                Experience how an actual GHS ward auto-balances shifts in our full interactive sandbox.
              </p>
            </div>
          </div>
          <Link
            href="/guest"
            className="whitespace-nowrap px-6 py-3 rounded-lg bg-emerald-deep text-on-primary text-[13px] leading-4 font-semibold hover:bg-forest-mid transition-all shadow-sm inline-flex items-center gap-2"
          >
            <span>Launch Guest Mode Sandbox</span>
            <MsIcon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>
      </div>
    </section>
  );
}
