export const AUTH_CONSTANTS = {
  COOKIE_NAMES: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
  },
  TOKEN_TTL: {
    ACCESS_TOKEN_MS: 24 * 60 * 60 * 1000, // 1 day
    ACCESS_TOKEN_SECONDS: 24 * 60 * 60, // 1 day
    REFRESH_TOKEN_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
    REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60, // 7 days
    ACCESS_TOKEN_EXPIRATION: '1d',
    REFRESH_TOKEN_EXPIRATION: '7d',
  },
  PATHS: {
    REFRESH_ENDPOINT: '/api/auth/refresh',
  },
} as const;
