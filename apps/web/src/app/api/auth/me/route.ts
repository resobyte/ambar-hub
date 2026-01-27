import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function GET(request: NextRequest) {
  try {
    const cookies = request.headers.get('cookie') || '';
    
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await response.json();

    // Backend returns { success: true, data: { ... } }
    // Return the user data directly
    if (data.success && data.data) {
      return NextResponse.json(data.data);
    }

    return NextResponse.json(
      { success: false, error: 'User data not found' },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
