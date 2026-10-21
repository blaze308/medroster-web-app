const STORAGE_KEY = 'medroster_import_hint_shown';
const MAX_SHOWS = 2;

export function shouldShowImportHint() {
    if (typeof window === 'undefined') return false;
    try {
        const n = parseInt(window.localStorage.getItem(STORAGE_KEY) || '0', 10);
        return !Number.isFinite(n) || n < MAX_SHOWS;
    } catch {
        return true;
    }
}

export function markImportHintShown() {
    if (typeof window === 'undefined') return;
    try {
        const n = parseInt(window.localStorage.getItem(STORAGE_KEY) || '0', 10);
        window.localStorage.setItem(STORAGE_KEY, String(Number.isFinite(n) ? n + 1 : 1));
    } catch {
        /* ignore */
    }
}
