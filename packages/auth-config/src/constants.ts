export const AUTH_CONSTANTS = {
  COOKIE_NAMES: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
  },
  TOKEN_TTL: {
    ACCESS_TOKEN_MS: 15 * 60 * 1000,
    ACCESS_TOKEN_SECONDS: 15 * 60,
    REFRESH_TOKEN_MS: 7 * 24 * 60 * 60 * 1000,
    REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60,
    ACCESS_TOKEN_EXPIRATION: '15m',
    REFRESH_TOKEN_EXPIRATION: '7d',
  },
  PATHS: {
    REFRESH_ENDPOINT: '/api/auth/refresh',
  },
} as const;
