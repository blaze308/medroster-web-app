/**
 * App toggles (safe to commit — not secrets).
 *
 * Firebase / API URLs stay in Vercel env + local .env (see README).
 */

/** When true: hide sign-up/sign-in, redirect /auth/* → /guest. Set false before public launch. */
export const GUEST_ONLY_TESTING = true;

/** Poll for new deployments and show “New version available” toast. */
export const ENABLE_VERSION_UPDATE_TOAST = true;

export const VERSION_UPDATE_POLL_MS = 5 * 60 * 1000;
