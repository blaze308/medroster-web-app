'use client';

import { TourProvider } from './tours/TourProvider';
import PageTour from './tours/PageTour';
import TourHelpButton from './tours/TourHelpButton';

export default function AppProviders({ children }) {
    return (
        <TourProvider>
            {children}
            <PageTour />
            <TourHelpButton />
        </TourProvider>
    );
}
