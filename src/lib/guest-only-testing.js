import { GUEST_ONLY_TESTING } from './app-config';

/** When true, sign-in / register are hidden and /auth/* redirects to guest mode. */
export function isGuestOnlyTesting() {
    return GUEST_ONLY_TESTING;
}
