'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthUser } from '@/types';
import { AUTH_CONSTANTS } from '@repo/auth-config';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface LoginResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Invalid credentials',
      };
    }

    const setCookieHeaders = response.headers.getSetCookie();
    const cookieStore = cookies();

    for (const cookieHeader of setCookieHeaders) {
      const parts = cookieHeader.split(';');
      const [nameValue] = parts;
      const [name, ...valueParts] = nameValue.split('=');
      const value = valueParts.join('=');

      if (name && value) {
        const isRefresh = name.trim().includes('refresh');
        cookieStore.set(name.trim(), value.trim(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site cookies in production
          path: '/',
          maxAge: isRefresh ? AUTH_CONSTANTS.TOKEN_TTL.REFRESH_TOKEN_SECONDS : AUTH_CONSTANTS.TOKEN_TTL.ACCESS_TOKEN_SECONDS,
        });
      }
    }

    const user = data.data?.user || data.user;
    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
}

export async function logout(): Promise<void> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token');

  try {
    if (accessToken) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${accessToken.value}`,
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  }

  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  redirect('/auth/login');
}

export async function refreshAccessToken(): Promise<boolean> {
  const cookieStore = cookies();
  const refreshToken = cookieStore.get('refresh_token');

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refresh_token=${refreshToken.value}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const setCookieHeaders = response.headers.getSetCookie();

    for (const cookieHeader of setCookieHeaders) {
      const parts = cookieHeader.split(';');
      const [nameValue] = parts;
      const [name, ...valueParts] = nameValue.split('=');
      const value = valueParts.join('=');

      if (name && value) {
        const isRefresh = name.trim().includes('refresh');
        cookieStore.set(name.trim(), value.trim(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Allow cross-site cookies in production
          path: '/',
          maxAge: isRefresh ? AUTH_CONSTANTS.TOKEN_TTL.REFRESH_TOKEN_SECONDS : AUTH_CONSTANTS.TOKEN_TTL.ACCESS_TOKEN_SECONDS,
        });
      }
    }

    return true;
  } catch {
    return false;
  }
}

