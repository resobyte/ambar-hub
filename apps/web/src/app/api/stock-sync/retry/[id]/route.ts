import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const url = `${apiUrl}/stock-sync/retry/${params.id}`;

    try {
        const authHeader = request.headers.get('authorization') || request.cookies.get('auth_token')?.value;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authHeader ? { Authorization: authHeader.startsWith('Bearer') ? authHeader : `Bearer ${authHeader}` } : {}),
            },
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error('Stock sync retry error:', error);
        return NextResponse.json({ error: 'Failed to retry sync' }, { status: 500 });
    }
}
