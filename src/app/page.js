'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { useFirebaseAuth } from '../components/FirebaseAuthProvider';
import { auth } from '../lib/firebase';
import { apiFetch } from '../lib/api';
import RulesModal from '../components/modals/RulesModal';
import { isGuestOnlyTesting } from '../lib/guest-only-testing';

export default function LandingPage() {
  const { user, hospitalId, status } = useFirebaseAuth();
  const isLoggedIn = status === 'authenticated';
  const guestOnly = isGuestOnlyTesting();

  const [hospitals, setHospitals] = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchHospitals();
    } else if (status !== 'loading') {
      setLoading(false);
    }
  }, [isLoggedIn, status]);

  const fetchHospitals = async () => {
    try {
      const data = await apiFetch('/api/hospitals');
      setHospitals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/hospitals/${deleteTarget._id}`, { method: 'DELETE' });
      setHospitals((prev) => prev.filter((h) => h._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete hospital:', error);
      alert(error.message || 'Failed to delete hospital');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ghs-surface text-ghs-deep">
      {/* Nav */}
      <nav className="flex items-center justify-between gap-3 px-4 sm:px-6 md:px-8 py-4 md:py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img src="/logo.svg" alt="MedRoster" className="w-9 h-9 rounded-xl shadow-sm shrink-0" />
          <span className="text-base sm:text-lg font-extrabold text-ghs-deep tracking-tight truncate">MedRoster</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isLoggedIn ? (
            <>
              <Link href={`/hospital/${hospitalId}`}
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-ghs-teal text-white text-xs sm:text-sm font-bold hover:bg-ghs-teal-hover transition-all shadow-sm cursor-pointer">
                Dashboard
              </Link>
              <button onClick={handleSignOut}
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white border border-slate-200 text-ghs-muted text-xs sm:text-sm font-bold hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
                Sign Out
              </button>
            </>
          ) : guestOnly ? (
            <Link href="/guest"
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-ghs-teal text-white text-xs sm:text-sm font-bold hover:bg-ghs-teal-hover transition-all shadow-sm shadow-ghs-teal/20 cursor-pointer">
              Try guest mode
            </Link>
          ) : (
            <>
              <Link href="/auth/signin"
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-white border border-slate-200 text-ghs-muted text-xs sm:text-sm font-bold hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
                Sign In
              </Link>
              <Link href="/auth/register"
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-ghs-teal text-white text-xs sm:text-sm font-bold hover:bg-ghs-teal-hover transition-all shadow-sm shadow-ghs-teal/20 cursor-pointer">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden pt-10 sm:pt-16 pb-24 sm:pb-48 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col items-center">
        <div className="absolute top-20 -left-20 w-[600px] h-[600px] bg-ghs-teal/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute top-40 -right-20 w-[500px] h-[500px] bg-ghs-gold/5 rounded-full blur-[100px] -z-10" />

        <div className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2 rounded-full bg-white border border-slate-100 text-ghs-teal text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest mb-8 sm:mb-10 shadow-sm mr-enter text-center">
          <span className="w-1.5 h-1.5 rounded-full bg-ghs-teal animate-pulse shrink-0" />
          Ghana Health Service · Duty Rostering
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-8xl font-extrabold tracking-tight mb-6 sm:mb-8 leading-[1.05] text-center max-w-4xl mr-enter mr-delay-1 px-2 sm:px-4">
          Built for the way <br />
          <span className="text-ghs-teal italic">Ghana hospitals</span> work.
        </h1>

        <p className="text-ghs-muted text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 sm:mb-16 text-center font-medium leading-relaxed mr-enter mr-delay-2 px-1">
          MedRoster handles GHS departments, nursing ranks, PIN/AIN licensing, Labour Act leave, and monthly duty rosters — ready for every ward.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-6 w-full sm:w-auto mr-enter mr-delay-3">
          {isLoggedIn ? (
            <Link href={hospitalId ? `/hospital/${hospitalId}` : '/individual'}
              className="btn px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg bg-ghs-teal text-white hover:bg-ghs-teal-hover shadow-lg shadow-ghs-teal/20 hover:-translate-y-0.5 transition-all rounded-2xl font-bold">
              Go to Dashboard
            </Link>
          ) : guestOnly ? (
            <Link href="/guest"
              data-tour="try-guest"
              className="btn px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg bg-ghs-teal text-white hover:bg-ghs-teal-hover shadow-lg shadow-ghs-teal/20 hover:-translate-y-0.5 transition-all rounded-2xl font-bold">
              Try guest mode
            </Link>
          ) : (
            <>
              <Link href="/auth/register"
                data-tour="get-started"
                className="btn px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg bg-ghs-teal text-white hover:bg-ghs-teal-hover shadow-lg shadow-ghs-teal/20 hover:-translate-y-0.5 transition-all rounded-2xl font-bold">
                Get started
              </Link>
              <Link href="/guest"
                data-tour="try-guest"
                className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white border border-slate-100 text-sm font-extrabold text-ghs-muted hover:text-ghs-teal hover:-translate-y-0.5 shadow-sm text-center transition-all cursor-pointer">
                Try guest mode
              </Link>
            </>
          )}
          <button
            onClick={() => setShowRules(true)}
            className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-white border border-slate-100 text-sm font-extrabold text-ghs-muted hover:text-ghs-teal hover:-translate-y-0.5 shadow-sm transition-all cursor-pointer"
          >
            View roster rules
          </button>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-12 mr-enter mr-delay-4">
          {['GHS Rank Hierarchy', 'PIN / AIN Licensing', 'Ghana Labour Act Leave', 'Maternity & Study Leave', 'Auto-generate Rosters', 'PDF Export'].map((f) => (
            <span key={f} className="px-4 py-2 rounded-full bg-white border border-slate-100 text-xs font-bold text-ghs-muted shadow-sm">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Hospitals list — only shown when logged in */}
      {isLoggedIn && (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-12 sm:-mt-24 pb-24 sm:pb-48 relative z-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Your Hospital</h2>
            <p className="text-ghs-muted font-medium text-sm sm:text-base">Manage staff, wards, and monthly duty rosters from one dashboard.</p>
          </div>
          <div className="bg-white border border-slate-100 px-6 py-3 rounded-2xl text-xs font-bold text-ghs-muted shadow-sm flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-ghs-teal" />
            {hospitals.length} {hospitals.length === 1 ? 'Hospital' : 'Hospitals'}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-white border-t-ghs-teal rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
            {hospitals.map((h) => (
              <div key={h._id} className="relative group">
                <Link
                  href={`/hospital/${h._id}`}
                  className="block glass-panel rounded-2xl md:rounded-[32px] p-5 sm:p-8 transition-all hover:-translate-y-1 hover:shadow-synclly-lg cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-10">
                    <div className="w-14 h-14 bg-ghs-surface text-ghs-muted rounded-[20px] flex items-center justify-center text-xl font-extrabold transition-all group-hover:bg-ghs-teal group-hover:text-white border border-slate-50 group-hover:border-transparent group-hover:shadow-lg group-hover:shadow-ghs-teal/20">
                      {h.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Active</span>
                    </div>
                  </div>

                  <h3 className="text-2xl font-extrabold text-ghs-deep mb-2 truncate transition-colors group-hover:text-ghs-teal">{h.name}</h3>
                  <p className="text-xs font-bold text-ghs-muted uppercase tracking-widest mb-8">
                    {h.type} · {h.region}
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-ghs-surface p-4 rounded-2xl flex flex-col items-start gap-1">
                      <span className="text-2xl font-extrabold text-ghs-deep">{h.counts?.departments || 0}</span>
                      <span className="text-[10px] font-bold text-ghs-muted uppercase tracking-wider">Depts</span>
                    </div>
                    <div className="bg-ghs-surface p-4 rounded-2xl flex flex-col items-start gap-1">
                      <span className="text-2xl font-extrabold text-ghs-deep">{h.counts?.staff || 0}</span>
                      <span className="text-[10px] font-bold text-ghs-muted uppercase tracking-wider">Staff</span>
                    </div>
                    <div className="bg-ghs-surface p-4 rounded-2xl flex flex-col items-start gap-1">
                      <span className="text-2xl font-extrabold text-ghs-deep">{h.counts?.schedules || 0}</span>
                      <span className="text-[10px] font-bold text-ghs-muted uppercase tracking-wider">Cycles</span>
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(h); }}
                  aria-label={`Delete ${h.name}`}
                  title="Delete hospital"
                  className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 shadow-sm opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-10 cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="mr-fade fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-xl">
          <div className="mr-pop-in w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-synclly-lg border border-slate-50">
            <div className="p-6 sm:p-10">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-6">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-ghs-deep tracking-tight mb-3">Delete Hospital?</h2>
              <p className="text-ghs-muted font-medium mb-6 leading-relaxed">
                You are about to permanently delete <span className="font-extrabold text-ghs-deep">{deleteTarget.name}</span>. This will remove all departments, staff, leave records, and schedule history.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[['Depts', deleteTarget.counts?.departments], ['Staff', deleteTarget.counts?.staff], ['Cycles', deleteTarget.counts?.schedules]].map(([label, count]) => (
                  <div key={label} className="bg-ghs-surface p-3 rounded-2xl flex flex-col items-start gap-1">
                    <span className="text-lg font-extrabold text-ghs-deep">{count || 0}</span>
                    <span className="text-[10px] font-bold text-ghs-muted uppercase tracking-wider">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}
                  className="flex-1 h-14 rounded-2xl bg-white border border-slate-200 text-ghs-muted font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  Cancel
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting}
                  className="flex-[2] h-14 rounded-2xl bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 shadow-xl shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
