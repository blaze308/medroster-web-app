'use client';

import { signOut } from 'firebase/auth';
import { useFirebaseAuth } from '../FirebaseAuthProvider';
import { auth } from '../../lib/firebase';
import { isGuestOnlyTesting } from '../../lib/guest-only-testing';
import LandingHeader from '../landing/LandingHeader';
import LandingFooter from '../landing/LandingFooter';

export default function MarketingFrame({ children }) {
  const { hospitalId, status } = useFirebaseAuth();
  const isLoggedIn = status === 'authenticated';
  const guestOnly = isGuestOnlyTesting();

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <LandingHeader
        isLoggedIn={isLoggedIn}
        guestOnly={guestOnly}
        hospitalId={hospitalId}
        onSignOut={handleSignOut}
      />
      <main className="w-full pt-20 bg-surface">{children}</main>
      <LandingFooter guestOnly={guestOnly} />
    </div>
  );
}
