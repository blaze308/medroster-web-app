'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useFirebaseAuth } from '../FirebaseAuthProvider';
import { tourIdForPath } from '../../lib/tours/matchRoute';
import { clearTourDone } from '../../lib/tours/storage';
import { startTour, waitForTourAnchors } from '../../lib/tours/runTour';

const TourContext = createContext(null);

export function TourProvider({ children }) {
    const pathname = usePathname();
    const { status, role } = useFirebaseAuth();
    const isLoggedOut = status === 'unauthenticated';
    const canWrite = role !== 'staff';
    const [driving, setDriving] = useState(false);

    const activeTourId = useMemo(
        () => tourIdForPath(pathname, { isLoggedOut }),
        [pathname, isLoggedOut]
    );

    const replayTour = useCallback(
        async (tourIdOverride) => {
            const tourId = tourIdOverride || activeTourId;
            if (!tourId || driving) return;
            setDriving(true);
            clearTourDone(tourId);
            await waitForTourAnchors(tourId, { canWrite });
            startTour(tourId, {
                markComplete: true,
                canWrite,
                onComplete: () => setDriving(false),
            });
        },
        [activeTourId, driving, canWrite]
    );

    const value = useMemo(
        () => ({ activeTourId, replayTour, driving, canWrite }),
        [activeTourId, replayTour, driving, canWrite]
    );

    return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
    const ctx = useContext(TourContext);
    if (!ctx) throw new Error('useTour must be used within TourProvider');
    return ctx;
}
