# AmbarHub

A production-ready Admin Panel with Next.js frontend and NestJS backend, structured as a pnpm + Turborepo monorepo.

## Technology Stack

### Frontend (`apps/web`)
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Server Components by default

### Backend (`apps/api`)
- NestJS
- TypeScript
- MySQL
- TypeORM
- JWT Authentication

### Shared Packages
- `@repo/types` - Shared TypeScript types and enums
- `@repo/auth-config` - Cookie configuration, permissions, and auth constants

## Features

- JWT Authentication with HttpOnly cookies
- Refresh token support with revocation and rotation
- Role-based access control (PLATFORM_OWNER, OPERATION)
- Server-side authorization
- CSRF protection for state-changing routes
- Multi-origin CORS support
- Environment-driven cookie configuration
- Responsive layout (Desktop / Tablet / Mobile)
- Theming with CSS variables
- Soft delete support
- Request/Response logging
- Token blacklist support

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 8+
- MySQL 8.0 (local installation)

### Local Development Setup (Without Docker)

1. Clone the repository

2. Install dependencies:
```bash
pnpm install
```

3. Build shared packages:
```bash
pnpm build --filter=@repo/types --filter=@repo/auth-config
```

4. Create local MySQL database:
```bash
mysql -u root -p
CREATE DATABASE ambarhub;
EXIT;
```

5. Setup environment files:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

6. Update `apps/api/.env` with your local MySQL credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
DB_NAME=ambarhub
```

7. Run database seed:
```bash
pnpm seed
```

8. Start development servers:
```bash
# Start all apps
pnpm dev

# Or start individually
pnpm dev:api
pnpm dev:web
```

### Docker Setup (Optional - for containerized deployment)

```bash
# Start all services (MySQL, API, Web)
docker-compose up -d

# View logs
docker-compose logs -f

# Note: When using Docker, update DB_PORT to 3307 in .env
```

### Environment Variables

#### Backend (`apps/api/.env`)

**For Local MySQL:**
```
NODE_ENV=development
PORT=3001

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
DB_NAME=ambarhub
```

**For Docker MySQL:**
```
DB_HOST=localhost
DB_PORT=3307
DB_USERNAME=root
DB_PASSWORD=password
DB_NAME=ambarhub
```

JWT_ACCESS_SECRET=your-access-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Comma-separated for multiple origins
CORS_ORIGINS=http://localhost:3000

# Optional: for subdomain deployments
# COOKIE_DOMAIN=.example.com
```

#### Frontend (`apps/web/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Default Admin User

After running the seed, use these credentials:
- Email: admin@example.com
- Password: Admin123!

## Project Structure

```
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/           # Authentication module
│   │   │   ├── users/          # Users module
│   │   │   ├── common/         # Shared utilities
│   │   │   └── database/       # Database configuration
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/            # Next.js App Router pages
│       │   ├── components/     # React components
│       │   ├── lib/            # Utilities and helpers
│       │   ├── types/          # Re-exports from @repo/types
│       │   └── config/         # Re-exports from @repo/auth-config
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── types/                  # Shared TypeScript types
│   │   └── src/
│   │       ├── role.ts         # Role enum
│   │       ├── user.ts         # User, AuthUser interfaces
│   │       ├── auth.ts         # JwtPayload, TokenPair
│   │       ├── api.ts          # ApiResponse, Pagination types
│   │       └── routes.ts       # RouteConfig interface
│   │
│   └── auth-config/            # Shared auth configuration
│       └── src/
│           ├── constants.ts    # Cookie names, TTLs
│           ├── cookies.ts      # Cookie config helpers
│           └── permissions.ts  # Role-based permissions
│
├── package.json                # Root workspace config
├── pnpm-workspace.yaml         # pnpm workspaces
├── turbo.json                  # Turborepo config
├── docker-compose.yml
└── README.md
```

## Roles

| Role | Dashboard | Users | Account |
|------|-----------|-------|---------|
| PLATFORM_OWNER | ✓ | ✓ | ✓ |
| OPERATION | ✗ | ✗ | ✓ |

## API Endpoints

### Authentication
- POST `/api/auth/login` - Login
- POST `/api/auth/logout` - Logout (protected)
- POST `/api/auth/refresh` - Refresh tokens
- GET `/api/auth/me` - Get current user (protected)

### Users (PLATFORM_OWNER only)
- GET `/api/users` - List users with pagination
- GET `/api/users/:id` - Get user by ID
- POST `/api/users` - Create user
- PATCH `/api/users/:id` - Update user
- DELETE `/api/users/:id` - Soft delete user

## Theming

Customize colors via CSS variables in `frontend/src/app/globals.css`:

```css
:root {
  --color-primary: #800020;
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  /* ... */
}
```

## Security Features

- Tokens stored in HttpOnly cookies
- CSRF protection via SameSite cookies
- Refresh token revocation
- Token blacklist for logout
- Role-based route protection
- Server-side authorization checks
- Password hashing with bcrypt
- Input validation with class-validator

## License

MIT
