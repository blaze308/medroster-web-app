'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { useFirebaseAuth } from '../components/FirebaseAuthProvider';
import { auth } from '../lib/firebase';
import { apiFetch } from '../lib/api';
import { isGuestOnlyTesting } from '../lib/guest-only-testing';
import LandingHeader from '../components/landing/LandingHeader';
import LandingHero from '../components/landing/LandingHero';
import HospitalList from '../components/landing/HospitalList';
import LandingPillars from '../components/landing/LandingPillars';
import LandingComparison from '../components/landing/LandingComparison';
import LandingTestimonial from '../components/landing/LandingTestimonial';
import LandingCta from '../components/landing/LandingCta';
import LandingFooter from '../components/landing/LandingFooter';

export default function LandingPage() {
  const { hospitalId, status } = useFirebaseAuth();
  const isLoggedIn = status === 'authenticated';
  const guestOnly = isGuestOnlyTesting();

  const [hospitals, setHospitals] = useState([]);
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
    <div className="min-h-screen bg-surface text-on-surface">
      <LandingHeader
        isLoggedIn={isLoggedIn}
        guestOnly={guestOnly}
        hospitalId={hospitalId}
        onSignOut={handleSignOut}
      />

      <main className="w-full pt-20 bg-surface">
        <LandingHero
          isLoggedIn={isLoggedIn}
          guestOnly={guestOnly}
          hospitalId={hospitalId}
        />

        {isLoggedIn && (
          <HospitalList
            hospitals={hospitals}
            loading={loading}
            onDelete={setDeleteTarget}
          />
        )}

        <LandingPillars />
        <LandingComparison />
        <LandingTestimonial />
        <LandingCta
          isLoggedIn={isLoggedIn}
          guestOnly={guestOnly}
          hospitalId={hospitalId}
        />
      </main>

      <LandingFooter guestOnly={guestOnly} />

      {deleteTarget && (
        <div className="mr-fade fixed inset-0 z-[80] flex items-center justify-center p-4 bg-on-surface/20 backdrop-blur-xl">
          <div className="mr-pop-in w-full max-w-md bg-white rounded-xl overflow-hidden shadow-xl border border-slate-100">
            <div className="p-6 sm:p-8">
              <div className="w-12 h-12 rounded-lg bg-crimson-surface flex items-center justify-center text-crimson-alert mb-5">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 className="landing-headline mb-3">Delete Hospital?</h2>
              <p className="text-sm leading-6 text-on-surface-variant mb-6">
                You are about to permanently delete <span className="font-bold text-on-surface">{deleteTarget.name}</span>. This will remove all departments, staff, leave records, and schedule history.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[['Depts', deleteTarget.counts?.departments], ['Staff', deleteTarget.counts?.staff], ['Cycles', deleteTarget.counts?.schedules]].map(([label, count]) => (
                  <div key={label} className="bg-surface p-3 rounded-lg flex flex-col items-start gap-1">
                    <span className="text-lg font-bold text-on-surface tabular-nums">{count || 0}</span>
                    <span className="text-[10px] font-bold text-slate-muted uppercase tracking-wider">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="flex-1 h-12 rounded-lg bg-white border border-slate-200 text-slate-body font-semibold text-sm hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-[2] h-12 rounded-lg bg-crimson-alert text-white font-semibold text-sm hover:bg-rose-800 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
