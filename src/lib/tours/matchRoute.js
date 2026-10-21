/**
 * @param {string} pathname
 * @param {{ isLoggedOut?: boolean }} options
 * @returns {string | null}
 */
export function tourIdForPath(pathname, { isLoggedOut = false } = {}) {
    if (!pathname) return null;
    if (pathname === '/' && isLoggedOut) return 'phase-a-entry';
    if (pathname === '/guest') return 'phase-a-sandbox-roster';
    if (/^\/individual\/[^/]+$/.test(pathname)) return 'phase-a-sandbox-roster';
    if (/^\/hospital\/[^/]+\/setup$/.test(pathname)) return 'phase-b-hospital-setup';
    if (/^\/hospital\/[^/]+\/schedule\/[^/]+$/.test(pathname)) return 'phase-b-hospital-schedule';
    if (/^\/hospital\/[^/]+$/.test(pathname)) return 'phase-b-hospital-ward';
    return null;
}
