import { cookies } from 'next/headers';
import { AuthUser, Role } from '@repo/types';
import { AUTH_CONSTANTS } from '@repo/auth-config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function getServerUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get(AUTH_CONSTANTS.COOKIE_NAMES.ACCESS_TOKEN);

    if (!accessToken) {
      return null;
    }

    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken.value}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data || data;
  } catch {
    return null;
  }
}

export async function checkServerAuth(): Promise<{
  isAuthenticated: boolean;
  user: AuthUser | null;
}> {
  const user = await getServerUser();
  return {
    isAuthenticated: !!user,
    user,
  };
}

export function hasRole(user: AuthUser | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
