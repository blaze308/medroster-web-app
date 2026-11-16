'use client';

import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useFirebaseAuth } from '../FirebaseAuthProvider';
import MsIcon from '../landing/MsIcon';
import HospitalSidebar from './HospitalSidebar';

export default function HospitalShell({
  hospital,
  active = 'overview',
  breadcrumb = [],
  scheduleHref,
  search,
  onSearch,
  onPublish,
  children,
  sidebarProps,
}) {
  const { user } = useFirebaseAuth();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const initials = (user?.displayName || user?.email || 'MR').slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-canvas text-on-surface">
      <HospitalSidebar
        hospital={hospital}
        active={active}
        scheduleHref={scheduleHref}
        isOpen={open}
        onClose={() => setOpen(false)}
        onSignOut={handleSignOut}
        initials={initials}
        userLabel={user?.displayName || user?.email || 'Signed in'}
        {...sidebarProps}
      />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex items-center justify-between gap-3 px-4 lg:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className="lg:hidden w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center cursor-pointer"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <MsIcon name="menu" />
            </button>
            <div className="flex items-center gap-1 text-xs text-slate-muted min-w-0 truncate">
              <span className="truncate">{hospital?.name || 'Hospital'}</span>
              {breadcrumb.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 min-w-0">
                  <MsIcon name="chevron_right" className="text-[14px]" />
                  <span className="font-semibold text-slate-black truncate">{item}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onSearch && (
              <label className="relative hidden md:block">
                <MsIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-muted text-[18px]" />
                <input
                  value={search || ''}
                  onChange={(event) => onSearch(event.target.value)}
                  placeholder="Search staff, ward or shift"
                  className="w-56 pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low text-xs focus:outline-none focus:bg-surface-container-lowest"
                />
              </label>
            )}
            <button
              type="button"
              onClick={() => setNote('Notifications stay on this page. Nothing was sent.')}
              className="relative p-2 rounded-lg text-slate-muted hover:bg-surface-container-high cursor-pointer"
              aria-label="Notifications"
            >
              <MsIcon name="notifications" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-crimson-alert" />
            </button>
            <button
              type="button"
              onClick={() => setNote('Emergency absence is recorded on the ward schedule, not from this bar.')}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crimson-surface text-crimson-alert text-[13px] font-semibold cursor-pointer"
            >
              <MsIcon name="warning" className="text-[18px]" />
              Emergency
            </button>
            <button
              type="button"
              onClick={() => (onPublish ? onPublish() : setNote('Open a ward schedule to publish shifts.'))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-[13px] font-semibold cursor-pointer"
            >
              <MsIcon name="publish" className="text-[18px]" />
              <span className="hidden sm:inline">Publish</span>
            </button>
          </div>
        </header>
        {note && (
          <p className="mx-4 lg:mx-6 mt-3 text-sm text-forest-mid bg-mint-surface rounded-lg px-3 py-2">{note}</p>
        )}
        <main className="px-4 lg:px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
