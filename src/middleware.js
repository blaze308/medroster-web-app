import { NextResponse } from 'next/server';

export function middleware(request) {
    if (process.env.NEXT_PUBLIC_GUEST_ONLY_TESTING !== 'true') {
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
