import Link from 'next/link';

export default function HospitalList({ hospitals, loading, onDelete }) {
  return (
    <section id="your-hospitals" className="w-full bg-surface-container-lowest py-16 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] leading-[14px] uppercase tracking-wider text-teal-brand font-bold">Your account</span>
            <h2 className="mt-2 landing-display">Your Hospital</h2>
            <p className="mt-2 text-[15px] leading-6 text-on-surface-variant">
              Manage staff, wards, and monthly duty rosters from one dashboard.
            </p>
          </div>
          <div className="bg-surface border border-mint-border px-4 py-2 rounded-lg text-xs font-semibold text-slate-muted shadow-sm flex items-center gap-2 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-deep" />
            {hospitals.length} {hospitals.length === 1 ? 'Hospital' : 'Hospitals'}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-mint-surface border-t-emerald-deep rounded-full animate-spin" />
          </div>
        ) : hospitals.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No hospitals yet. Create one from your dashboard after you finish setup.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitals.map((hospital) => (
              <div key={hospital._id} className="relative group">
                <Link
                  href={`/hospital/${hospital._id}`}
                  className="block rounded-xl bg-white border border-slate-200 p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-8 pr-10">
                    <div className="w-12 h-12 bg-mint-surface text-emerald-deep rounded-lg flex items-center justify-center text-lg font-bold">
                      {hospital.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2 bg-mint-surface px-3 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-deep" />
                      <span className="text-[10px] font-bold text-emerald-deep uppercase tracking-widest">Active</span>
                    </div>
                  </div>
                  <h3 className="landing-title truncate">{hospital.name}</h3>
                  <p className="text-[11px] font-semibold text-slate-muted uppercase tracking-widest mt-1 mb-6">
                    {hospital.type} · {hospital.region}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['Depts', hospital.counts?.departments || 0],
                      ['Staff', hospital.counts?.staff || 0],
                      ['Cycles', hospital.counts?.schedules || 0],
                    ].map(([label, count]) => (
                      <div key={label} className="bg-surface p-3 rounded-lg flex flex-col items-start gap-1">
                        <span className="text-xl font-bold text-on-surface tabular-nums">{count}</span>
                        <span className="text-[10px] font-bold text-slate-muted uppercase tracking-wider">{label}</span>
                      </div>
                    ))}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => onDelete(hospital)}
                  aria-label={`Delete ${hospital.name}`}
                  title="Delete hospital"
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-crimson-alert hover:border-crimson-surface hover:bg-crimson-surface shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
