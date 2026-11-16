import Link from 'next/link';
import MsIcon from './MsIcon';

const DAYS = ['Mon 01', 'Tue 02', 'Wed 03', 'Thu 04', 'Fri 05', 'Sat 06', 'Sun 07'];

const STAFF = [
  {
    initials: 'FM',
    avatar: 'bg-mint-surface text-emerald-deep',
    name: 'Nurse Faustina Mensah',
    rank: 'PNO · In-Charge',
    rankClass: 'text-emerald-deep',
    pin: 'GHS-N-48201',
    shifts: ['M', 'M', 'A', 'M', 'M', 'OFF', 'OFF'],
    status: 'Optimal',
    statusClass: 'bg-mint-surface text-emerald-deep',
  },
  {
    initials: 'ED',
    avatar: 'bg-surface-container text-slate-body',
    name: 'Nurse Emmanuel Darko',
    rank: 'SNO',
    rankClass: 'text-forest-mid',
    pin: 'GHS-N-88412',
    shifts: ['A', 'A', 'N', 'OFF', 'OFF', 'M', 'M'],
    status: 'Optimal',
    statusClass: 'bg-mint-surface text-emerald-deep',
  },
  {
    initials: 'AO',
    avatar: 'bg-secondary-container/30 text-teal-brand',
    name: 'Nurse Abena Osei',
    rank: 'NO',
    rankClass: 'text-teal-brand',
    pin: 'GHS-N-90231',
    shifts: ['N', 'N', 'OFF', 'OFF', 'M', 'A', 'A'],
    status: 'Rest Valid',
    statusClass: 'bg-mint-surface text-emerald-deep',
  },
  {
    initials: 'GA',
    avatar: 'bg-surface-container-low text-slate-body',
    name: 'Nurse Grace Addo',
    rank: 'SN',
    rankClass: 'text-slate-body',
    pin: 'GHS-N-66120',
    shifts: ['M', 'M', 'M', 'A', 'OFF', 'N', 'N'],
    status: 'Optimal',
    statusClass: 'bg-mint-surface text-emerald-deep',
  },
  {
    initials: 'KB',
    avatar: 'bg-amber-surface text-amber-shift',
    name: 'Nurse Kojo Boateng',
    rank: 'SSN',
    rankClass: 'text-slate-body',
    pin: 'GHS-N-55319',
    shifts: ['AL', 'AL', 'AL', 'AL', 'AL', 'AL', 'AL'],
    status: 'Act 651 Leave',
    statusClass: 'bg-amber-surface text-amber-shift',
  },
];

const SHIFT_CLASS = {
  M: 'px-2.5 py-1 rounded bg-mint-surface text-emerald-deep font-bold',
  A: 'px-2.5 py-1 rounded bg-secondary-container/50 text-on-secondary-container font-bold',
  N: 'px-2.5 py-1 rounded bg-surface-container text-slate-body font-bold',
  OFF: 'px-2.5 py-1 rounded bg-surface-container text-slate-muted',
  AL: 'px-2 py-1 rounded bg-amber-surface text-amber-shift font-bold text-[11px]',
};

function ShiftCell({ code, weekend }) {
  return (
    <td className={`py-3 px-3 text-center ${weekend ? 'bg-mint-surface/20' : ''}`}>
      <span className={`${SHIFT_CLASS[code]} font-medium tabular-nums text-xs`}>{code}</span>
    </td>
  );
}

export default function LandingHero({ isLoggedIn, guestOnly, hospitalId }) {
  const dashboardHref = hospitalId ? `/hospital/${hospitalId}` : '/individual';

  return (
    <section id="top" className="relative w-full overflow-hidden bg-surface py-8 lg:py-24">
      <div className="absolute -top-24 right-1/4 w-96 h-96 bg-mint-surface/60 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 -left-20 w-80 h-80 bg-secondary-container/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low shadow-sm mb-5 max-w-full">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-brand opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-deep" />
            </span>
            <span className="text-[10px] sm:text-[11px] leading-tight font-semibold text-forest-mid uppercase tracking-wider text-left">
              Ghana Health Service · Compliant Duty Rostering
            </span>
          </div>

          <h1 className="landing-display landing-display-hero max-w-3xl">
            Built for the way <br className="hidden sm:inline" />
            <span className="text-emerald-deep">Ghana hospitals work.</span>
          </h1>

          <p className="mt-3 text-[15px] leading-6 text-on-surface-variant max-w-2xl text-balance">
            MedRoster automatically handles GHS department hierarchies, nursing ranks, PIN/AIN licensing checks, Labour Act leave entitlements, and ward rotations — in seconds, not sleepless nights.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {isLoggedIn ? (
              <Link
                href={dashboardHref}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-deep text-on-primary text-[13px] leading-4 font-semibold hover:bg-forest-mid shadow-md transition-all"
              >
                <span>Go to Dashboard</span>
                <MsIcon name="arrow_forward" className="text-[18px]" />
              </Link>
            ) : (
              <Link
                href="/guest"
                data-tour="try-guest"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-emerald-deep text-on-primary text-[13px] leading-4 font-semibold hover:bg-forest-mid shadow-md transition-all"
              >
                <span>Try Guest Mode (Instant Sandbox)</span>
                <MsIcon name="arrow_forward" className="text-[18px]" />
              </Link>
            )}
            {!isLoggedIn && !guestOnly && (
              <Link
                href="/auth/register"
                data-tour="get-started"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-primary-container text-on-primary text-[13px] leading-4 font-semibold hover:bg-forest-mid shadow-sm transition-all"
              >
                Get started
              </Link>
            )}
            <Link
              href="/roster-rules"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-surface-container-lowest text-slate-body text-[13px] leading-4 font-semibold shadow-sm hover:bg-surface-container-low transition-all"
            >
              <MsIcon name="menu_book" className="text-[18px] text-teal-brand" />
              <span>View Roster Rules & Legal Specs</span>
            </Link>
          </div>

          <div className="mt-8 pt-5 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
            {[
              ['gavel', 'Act 651 Compliant', 'Ghana Labour Standards'],
              ['badge', 'All GHS Ranks', 'NO, SNO, PNO, DDNS'],
              ['picture_as_pdf', '1-Click PDF Export', 'Ward Noticeboard Ready'],
              ['bolt', 'Zero Setup Needed', 'Instant Hospital Sandbox'],
            ].map(([icon, title, detail]) => (
              <div key={title} className="p-3 rounded-lg bg-surface-container-lowest shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-mint-surface flex items-center justify-center text-emerald-deep shrink-0">
                  <MsIcon name={icon} className="text-[18px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] leading-4 font-semibold text-on-surface">{title}</span>
                  <span className="text-xs leading-[18px] text-slate-muted">{detail}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 relative max-w-6xl mx-auto">
          <div className="absolute -top-4 right-4 z-20 hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-deep text-on-primary text-[11px] leading-[14px] font-semibold shadow-lg">
            <MsIcon name="verified_user" className="text-[16px] text-primary-fixed" />
            <span>PIN/AIN Validated with Nursing & Midwifery Council (N&MC)</span>
          </div>

          <div className="rounded-xl bg-surface-container-lowest shadow-xl overflow-hidden">
            <div className="p-3 lg:p-5 bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-10 bg-emerald-deep rounded-full shrink-0" />
                <div className="text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="landing-subtitle">Greater Accra Regional Hospital (Ridge)</span>
                    <span className="px-2 py-0.5 rounded bg-mint-surface text-emerald-deep text-[11px] leading-[14px] font-semibold">Ward 4B Female Medical</span>
                  </div>
                  <p className="text-xs leading-[18px] text-on-surface-variant flex items-center gap-2 mt-0.5 flex-wrap">
                    <MsIcon name="calendar_month" className="text-[16px] text-teal-brand" />
                    <span>October 2024 · 31 Days Cycle</span>
                    <span className="text-slate-muted">·</span>
                    <span className="text-forest-mid font-medium">Shift Ratio: 4M / 2A / 2N Nominal</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-deep text-on-primary text-[11px] leading-[14px] font-semibold shadow-sm">
                  <MsIcon name="auto_awesome" className="text-[16px]" />
                  Generate Balanced Roster
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-lowest text-slate-body text-[11px] leading-[14px] font-semibold shadow-sm">
                  <MsIcon name="download" className="text-[16px]" />
                  Noticeboard PDF
                </span>
              </div>
            </div>

            <div className="px-3 lg:px-5 py-2.5 bg-surface-container-lowest flex items-center justify-between flex-wrap gap-2 text-on-surface">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] leading-[14px] font-semibold text-slate-muted mr-1">Shift Legend:</span>
                <span className="px-2 py-1 rounded bg-mint-surface text-emerald-deep text-xs tabular-nums"><strong>M</strong> Morning 07:00–14:00</span>
                <span className="px-2 py-1 rounded bg-secondary-container/40 text-on-secondary-container text-xs tabular-nums"><strong>A</strong> Afternoon 14:00–20:00</span>
                <span className="px-2 py-1 rounded bg-surface-container text-slate-body text-xs tabular-nums"><strong>N</strong> Night 20:00–08:00</span>
                <span className="px-2 py-1 rounded bg-surface-container-low text-slate-muted text-xs tabular-nums"><strong>OFF</strong> Rest</span>
                <span className="px-2 py-1 rounded bg-amber-surface text-amber-shift text-xs tabular-nums"><strong>AL</strong> Statutory Leave</span>
              </div>
              <div className="flex items-center gap-1.5 text-forest-mid text-[11px] leading-[14px] font-semibold">
                <MsIcon name="check_circle" className="text-[16px]" />
                <span>All 5 Shifts Supervised by Senior Officer</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs leading-[18px]">
                <thead className="bg-surface-container-low text-slate-muted text-[11px] leading-[14px] font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4 min-w-[260px] font-semibold">Clinician & Rank</th>
                    {DAYS.map((day, index) => (
                      <th
                        key={day}
                        className={`py-3 px-3 text-center min-w-[70px] font-semibold ${index >= 5 ? 'bg-mint-surface/40 text-emerald-deep' : ''}`}
                      >
                        {day}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center min-w-[80px] font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low bg-surface-container-lowest">
                  {STAFF.map((person) => (
                    <tr key={person.pin} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${person.avatar}`}>
                            {person.initials}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-sm leading-5 font-semibold text-on-surface whitespace-nowrap">{person.name}</span>
                            <span className="text-xs leading-[18px] text-slate-muted flex items-center gap-1.5 whitespace-nowrap">
                              <strong className={`font-semibold ${person.rankClass}`}>{person.rank}</strong>
                              <span>PIN: {person.pin}</span>
                            </span>
                          </div>
                        </div>
                      </td>
                      {person.shifts.map((code, index) => (
                        <ShiftCell key={`${person.pin}-${index}`} code={code} weekend={index >= 5} />
                      ))}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] leading-[14px] font-semibold whitespace-nowrap ${person.statusClass}`}>
                          {person.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-[11px] leading-[14px] font-semibold text-slate-muted">Weekly Validation:</span>
                <span className="text-xs leading-[18px] flex items-center gap-1 text-emerald-deep">
                  <MsIcon name="verified" className="text-[16px]" />
                  Zero Labour Act 651 Violations
                </span>
                <span className="text-xs leading-[18px] flex items-center gap-1 text-emerald-deep">
                  <MsIcon name="shield" className="text-[16px]" />
                  Senior Officer Covered All Shifts
                </span>
              </div>
              <div className="text-[11px] leading-[14px] font-semibold text-slate-muted text-center sm:text-right">
                Auto-balanced by MedRoster Clinical Engine · 100% GHS Conforming
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
