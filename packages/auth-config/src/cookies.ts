import { AUTH_CONSTANTS } from './constants';

export interface CookieConfig {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}

export interface CookieEnvironment {
  nodeEnv: string;
  cookieDomain?: string;
}

export function getAccessTokenCookieConfig(env: CookieEnvironment): CookieConfig {
  const isProduction = env.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: AUTH_CONSTANTS.TOKEN_TTL.ACCESS_TOKEN_MS,
    path: '/',
    ...(env.cookieDomain && { domain: env.cookieDomain }),
  };
}

export function getRefreshTokenCookieConfig(env: CookieEnvironment): CookieConfig {
  const isProduction = env.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: AUTH_CONSTANTS.TOKEN_TTL.REFRESH_TOKEN_MS,
    path: AUTH_CONSTANTS.PATHS.REFRESH_ENDPOINT,
    ...(env.cookieDomain && { domain: env.cookieDomain }),
  };
}

export function getClearCookieConfig(path: string = '/'): Pick<CookieConfig, 'path'> {
  return { path };
}
