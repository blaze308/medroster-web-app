'use client';

import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { useFirebaseAuth } from '../FirebaseAuthProvider';
import { auth } from '../../lib/firebase';
import { isGuestOnlyTesting } from '../../lib/guest-only-testing';
import LandingHeader from '../landing/LandingHeader';
import LandingFooter from '../landing/LandingFooter';
import RulesBanner from './RulesBanner';
import RuleCards from './RuleCards';
import RuleSimulator from './RuleSimulator';
import RulesCaseStudy from './RulesCaseStudy';
import RulesClose from './RulesClose';

export default function RulesScreen() {
  const { hospitalId, status } = useFirebaseAuth();
  const isLoggedIn = status === 'authenticated';
  const guestOnly = isGuestOnlyTesting();
  const [filter, setFilter] = useState('all');
  const [scenario, setScenario] = useState('night');

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
      <main className="w-full pt-20 bg-surface">
        <RulesBanner filter={filter} onFilter={setFilter} />
        <RuleCards filter={filter} />
        <RuleSimulator scenario={scenario} onScenario={setScenario} />
        <RulesCaseStudy />
        <RulesClose />
      </main>
      <LandingFooter guestOnly={guestOnly} />
    </div>
  );
}
