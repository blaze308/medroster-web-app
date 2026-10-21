'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ENABLE_VERSION_UPDATE_TOAST, VERSION_UPDATE_POLL_MS } from '../lib/app-config';

async function fetchBuildId() {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.buildId ?? null;
}

export default function VersionUpdateToast() {
    const baselineRef = useRef(null);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const checkForUpdate = useCallback(async () => {
        if (!ENABLE_VERSION_UPDATE_TOAST) return;
        if (process.env.NODE_ENV === 'development') return;

        const buildId = await fetchBuildId();
        if (!buildId) return;

        if (baselineRef.current === null) {
            baselineRef.current = buildId;
            return;
        }

        if (buildId !== baselineRef.current) {
            setUpdateAvailable(true);
            setDismissed(false);
        }
    }, []);

    useEffect(() => {
        if (!ENABLE_VERSION_UPDATE_TOAST) return;
        if (process.env.NODE_ENV === 'development') return;

        checkForUpdate();

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                checkForUpdate();
            }
        };
        document.addEventListener('visibilitychange', onVisibility);

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                checkForUpdate();
            }
        }, VERSION_UPDATE_POLL_MS);

        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            clearInterval(interval);
        };
    }, [checkForUpdate]);

    if (!updateAvailable || dismissed) return null;

    return (
        <div
            className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:top-4 z-[110] sm:max-w-sm pointer-events-none"
            role="status"
            aria-live="polite"
        >
            <div className="mr-pop-in pointer-events-auto flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-synclly-lg backdrop-blur-md">
                <div className="min-w-0 text-left">
                    <p className="text-sm font-extrabold text-ghs-deep">New version available</p>
                    <p className="text-[11px] font-medium text-ghs-muted leading-snug mt-0.5">
                        Refresh to get the latest MedRoster fixes and features.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="h-9 px-4 rounded-xl bg-ghs-teal text-white text-xs font-bold hover:bg-ghs-teal-hover cursor-pointer"
                    >
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={() => setDismissed(true)}
                        className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-ghs-muted hover:bg-slate-50 cursor-pointer"
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
}
