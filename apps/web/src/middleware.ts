import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Role } from '@repo/types';
import {
  AUTH_CONSTANTS,
  getAccessTokenCookieConfig,
  getRefreshTokenCookieConfig,
  isPublicRoute as checkPublicRoute,
  isRouteAllowed,
  getDefaultRouteByRole,
} from '@repo/auth-config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const COOKIE_ENV = { nodeEnv: process.env.NODE_ENV || 'development' } as const;

function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken?: string,
): void {
  const accessCookieConfig = getAccessTokenCookieConfig(COOKIE_ENV);
  response.cookies.set(AUTH_CONSTANTS.COOKIE_NAMES.ACCESS_TOKEN, accessToken, {
    httpOnly: accessCookieConfig.httpOnly,
    secure: accessCookieConfig.secure,
    sameSite: accessCookieConfig.sameSite,
    path: accessCookieConfig.path,
    maxAge: AUTH_CONSTANTS.TOKEN_TTL.ACCESS_TOKEN_SECONDS,
  });

  if (refreshToken) {
    const refreshCookieConfig = getRefreshTokenCookieConfig(COOKIE_ENV);
    response.cookies.set(AUTH_CONSTANTS.COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
      httpOnly: refreshCookieConfig.httpOnly,
      secure: refreshCookieConfig.secure,
      sameSite: refreshCookieConfig.sameSite,
      path: '/',
      maxAge: AUTH_CONSTANTS.TOKEN_TTL.REFRESH_TOKEN_SECONDS,
    });
  }
}

async function verifyToken(accessToken: string): Promise<{ role: Role } | null> {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const user = data.data || data;
    return { role: user.role as Role };
  } catch {
    return null;
  }
}

interface RefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
}

async function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refresh_token=${refreshToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { success: false };
    }

    const setCookieHeaders = response.headers.getSetCookie();
    let newAccessToken: string | undefined;
    let newRefreshToken: string | undefined;

    for (const cookieHeader of setCookieHeaders) {
      const parts = cookieHeader.split(';');
      const [nameValue] = parts;
      const [name, ...valueParts] = nameValue.split('=');
      const value = valueParts.join('=');

      if (name?.trim() === 'access_token') {
        newAccessToken = value.trim();
      } else if (name?.trim() === 'refresh_token') {
        newRefreshToken = value.trim();
      }
    }

    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch {
    return { success: false };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const isPublic = checkPublicRoute(pathname);
  let accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (isPublic) {
    if (accessToken) {
      const user = await verifyToken(accessToken);
      if (user) {
        const defaultRoute = getDefaultRouteByRole(user.role);
        return NextResponse.redirect(new URL(defaultRoute, request.url));
      }
    }
    return NextResponse.next();
  }

  let user = accessToken ? await verifyToken(accessToken) : null;

  if (!user && refreshToken) {
    const refreshResult = await refreshTokens(refreshToken);

    if (refreshResult.success && refreshResult.accessToken) {
      accessToken = refreshResult.accessToken;
      user = await verifyToken(accessToken);

      if (user) {
        if (pathname === '/') {
          const defaultRoute = getDefaultRouteByRole(user.role);
          const redirectResponse = NextResponse.redirect(new URL(defaultRoute, request.url));
          setAuthCookies(redirectResponse, refreshResult.accessToken, refreshResult.refreshToken);
          return redirectResponse;
        }

        const response = NextResponse.next();
        setAuthCookies(response, refreshResult.accessToken, refreshResult.refreshToken);

        if (!isRouteAllowed(pathname, user.role)) {
          return NextResponse.redirect(new URL('/403', request.url));
        }

        return response;
      }
    }
  }

  if (!user) {
    const response = NextResponse.redirect(new URL('/auth/login', request.url));
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  }

  if (pathname === '/') {
    const defaultRoute = getDefaultRouteByRole(user.role);
    return NextResponse.redirect(new URL(defaultRoute, request.url));
  }

  if (!isRouteAllowed(pathname, user.role)) {
    return NextResponse.redirect(new URL('/403', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
