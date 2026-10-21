import { NextResponse } from 'next/server';
import { GUEST_ONLY_TESTING } from './lib/app-config';

export function middleware(request) {
    if (!GUEST_ONLY_TESTING) {
        return NextResponse.next();
    }
    const { pathname } = request.nextUrl;
    if (pathname.startsWith('/auth')) {
        const url = request.nextUrl.clone();
        url.pathname = '/guest';
        url.search = '';
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/auth/:path*'],
};
