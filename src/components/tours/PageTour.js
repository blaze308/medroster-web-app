'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useFirebaseAuth } from '../FirebaseAuthProvider';
import { tourIdForPath } from '../../lib/tours/matchRoute';
import { isTourDone } from '../../lib/tours/storage';
import { startTour, waitForTourAnchors } from '../../lib/tours/runTour';
import { useTour } from './TourProvider';

const AUTO_START_DELAY_MS = 750;

export default function PageTour() {
    const pathname = usePathname();
    const { status } = useFirebaseAuth();
    const { driving, canWrite } = useTour();
    const startedRef = useRef(null);

    useEffect(() => {
        if (status === 'loading') return;

        const isLoggedOut = status === 'unauthenticated';
        const tourId = tourIdForPath(pathname, { isLoggedOut });
        if (!tourId || driving) return;

        const sessionKey = `${tourId}:${pathname}`;
        if (startedRef.current === sessionKey) return;
        if (isTourDone(tourId)) return;

        let cancelled = false;
        const timer = setTimeout(async () => {
            if (cancelled || isTourDone(tourId)) return;
            await waitForTourAnchors(tourId, { canWrite });
            if (cancelled || isTourDone(tourId)) return;
            startedRef.current = sessionKey;
            startTour(tourId, { canWrite });
        }, /^\/hospital\//.test(pathname) ? 1400 : AUTO_START_DELAY_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [pathname, status, driving, canWrite]);

    return null;
}
