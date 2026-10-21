const PREFIX = 'medroster_tour_v1_';

export function isTourDone(tourId) {
    if (typeof window === 'undefined' || !tourId) return true;
    try {
        return window.localStorage.getItem(`${PREFIX}${tourId}`) === '1';
    } catch {
        return false;
    }
}

export function markTourDone(tourId) {
    if (typeof window === 'undefined' || !tourId) return;
    try {
        window.localStorage.setItem(`${PREFIX}${tourId}`, '1');
    } catch {
        /* ignore */
    }
}

export function clearTourDone(tourId) {
    if (typeof window === 'undefined' || !tourId) return;
    try {
        window.localStorage.removeItem(`${PREFIX}${tourId}`);
    } catch {
        /* ignore */
    }
}
