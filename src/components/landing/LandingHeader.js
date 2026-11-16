'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MsIcon from './MsIcon';

const NAV = [
  { id: 'features', label: 'Features', href: '/#features' },
  { id: 'rules', label: 'Roster Rules & Compliance', href: '/roster-rules' },
  { id: 'demo', label: 'Interactive Demo', href: '/demo' },
  { id: 'hospitals', label: 'Hospitals', href: '/hospitals' },
  { id: 'pricing', label: 'Pricing', href: '/pricing' },
];

function isActive(id, pathname) {
  if (id === 'rules') return pathname.startsWith('/roster-rules');
  if (id === 'demo') return pathname.startsWith('/demo');
  if (id === 'hospitals') return pathname.startsWith('/hospitals');
  if (id === 'pricing') return pathname.startsWith('/pricing');
  if (id === 'features') return pathname === '/';
  return false;
}

export default function LandingHeader({
  isLoggedIn,
  guestOnly,
  hospitalId,
  onSignOut,
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dashboardHref = hospitalId ? `/hospital/${hospitalId}` : '/individual';
  const close = () => setOpen(false);

  const linkClass = (id, mobile) => {
    const active = isActive(id, pathname);
    if (mobile) {
      return `px-3 py-2.5 rounded-lg text-[14px] font-semibold ${
        active ? 'bg-mint-surface text-emerald-deep' : 'text-on-surface hover:bg-mint-surface'
      }`;
    }
    return `text-[13px] leading-4 font-semibold transition-colors ${
      active
        ? 'bg-mint-surface text-emerald-deep font-bold rounded-lg px-2.5 py-1'
        : 'text-on-surface-variant hover:text-on-surface'
    }`;
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-20 max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <img src="/logo.svg" alt="MedRoster" className="h-8 w-8 object-contain shrink-0" />
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-xl leading-7 font-bold text-stitch-primary tracking-tight">MedRoster</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mint-surface text-emerald-deep text-[11px] leading-[14px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-brand animate-pulse" />
              Ghana Health Service Ready
            </span>
          </span>
        </Link>

        <nav className="hidden xl:flex items-center gap-5">
          {NAV.map((item) => (
            <Link key={item.id} href={item.href} className={linkClass(item.id, false)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {isLoggedIn ? (
            <>
              <Link
                href={dashboardHref}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-forest-mid text-[13px] leading-4 font-semibold transition-colors"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={onSignOut}
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-mint-surface text-emerald-deep hover:bg-secondary-container text-[13px] leading-4 font-semibold transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/guest"
                className="hidden md:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-mint-surface text-emerald-deep hover:bg-secondary-container hover:text-on-secondary-container text-[13px] leading-4 font-semibold transition-colors"
              >
                Try Guest Mode
              </Link>
              {!guestOnly && (
                <>
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-forest-mid text-[13px] leading-4 font-semibold transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-deep text-on-primary hover:bg-forest-mid text-[13px] leading-4 font-semibold transition-colors"
                  >
                    Get started
                  </Link>
                </>
              )}
              {guestOnly && (
                <Link
                  href="/guest"
                  className="md:hidden inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-deep text-on-primary hover:bg-forest-mid text-[13px] leading-4 font-semibold transition-colors"
                >
                  Try Guest Mode
                </Link>
              )}
            </>
          )}
          <button
            type="button"
            className="xl:hidden w-10 h-10 rounded-lg bg-surface-container-low text-on-surface flex items-center justify-center cursor-pointer"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            <MsIcon name={open ? 'close' : 'menu'} className="text-[22px]" />
          </button>
        </div>
      </div>

      {open && (
        <div className="xl:hidden border-t border-mint-border bg-surface px-4 py-4 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link key={item.id} href={item.href} onClick={close} className={linkClass(item.id, true)}>
              {item.label}
            </Link>
          ))}
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => { close(); onSignOut(); }}
              className="sm:hidden text-left px-3 py-2.5 rounded-lg text-on-surface text-[14px] font-semibold hover:bg-mint-surface cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
