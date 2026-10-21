import { NextResponse } from 'next/server';

export function GET() {
    const buildId =
        process.env.VERCEL_DEPLOYMENT_ID ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        'dev';

    return NextResponse.json(
        { buildId },
        {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        }
    );
}
