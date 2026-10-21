'use client';

import { useTour } from './TourProvider';

export default function TourHelpButton() {
    const { activeTourId, replayTour, driving } = useTour();

    if (!activeTourId) return null;

    return (
        <button
            type="button"
            onClick={() => replayTour()}
            disabled={driving}
            className="fixed bottom-5 right-5 z-[100] h-11 px-4 rounded-full bg-ghs-teal text-white text-xs font-extrabold shadow-lg shadow-ghs-teal/25 hover:bg-ghs-teal-hover disabled:opacity-60 transition-colors cursor-pointer"
            aria-label="Replay page tour"
        >
            Tour
        </button>
    );
}
