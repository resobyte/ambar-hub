import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const url = `${apiUrl}/stock-sync/queue-status`;

    try {
        const authHeader = request.headers.get('authorization') || request.cookies.get('auth_token')?.value;

        const res = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { Authorization: authHeader.startsWith('Bearer') ? authHeader : `Bearer ${authHeader}` } : {}),
            },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Stock sync queue status fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
    }
}
