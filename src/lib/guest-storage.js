/** Guest mode localStorage helpers + PDF export counter. */

const GUEST_KEY = 'medroster_guest_schedule';
const EXPORT_KEY = 'medroster_guest_exports';
const MAX_EXPORTS = 10;

export function getGuestSchedule() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(GUEST_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveGuestSchedule(data) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GUEST_KEY, JSON.stringify({
        ...data,
        updatedAt: new Date().toISOString(),
    }));
}

export function clearGuestSchedule() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(GUEST_KEY);
}

export function getGuestExportsRemaining() {
    if (typeof window === 'undefined') return MAX_EXPORTS;
    const used = parseInt(localStorage.getItem(EXPORT_KEY) || '0', 10) || 0;
    return Math.max(0, MAX_EXPORTS - used);
}

export function consumeGuestExport() {
    if (typeof window === 'undefined') return false;
    const used = parseInt(localStorage.getItem(EXPORT_KEY) || '0', 10) || 0;
    if (used >= MAX_EXPORTS) return false;
    localStorage.setItem(EXPORT_KEY, String(used + 1));
    return true;
}

export function getGuestExportLimit() {
    return MAX_EXPORTS;
}

/** Pull guest data for migration after register. */
export function takeGuestDataForMigration() {
    const data = getGuestSchedule();
    clearGuestSchedule();
    return data;
}
