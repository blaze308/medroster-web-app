/** When true, sign-in / register are hidden and /auth/* redirects to guest mode. */
export function isGuestOnlyTesting() {
    return process.env.NEXT_PUBLIC_GUEST_ONLY_TESTING === 'true';
}
