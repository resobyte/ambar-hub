# Ambar-Hub Project Rules

## Project Overview
Ambar-Hub is a WMS (Warehouse Management System) monorepo for e-commerce order management.

## Tech Stack
- **Monorepo**: pnpm + Turborepo
- **Backend**: NestJS 10 + TypeORM + MySQL
- **Frontend**: Next.js 14 + React 18 + TailwindCSS
- **Shared**: `@repo/types` (types), `@repo/auth-config` (auth utilities)

## Project Structure
```
ambar-hub/
├── apps/
│   ├── api/          # NestJS backend (port 3001)
│   └── web/          # Next.js frontend (port 3000)
├── packages/
│   ├── types/        # Shared TypeScript types
│   └── auth-config/  # Auth configuration
└── integration-mist/ # Reference project (do not modify)
```

## Backend Patterns (NestJS)

### Module Structure
```
src/[module]/
├── entities/        # TypeORM entities
├── dto/            # DTOs with class-validator decorators
├── enums/          # Module-specific enums
├── [module].service.ts
├── [module].controller.ts
└── [module].module.ts
```

### Entity Conventions
- Extend `BaseEntity` from `common/entities/base.entity.ts`
- Use snake_case for column names: `@Column({ name: 'column_name' })`
- Use `uuid` for primary keys
- Include soft delete via `deletedAt`

### Service Patterns
- Inject repositories via `@InjectRepository(Entity)`
- Use `Repository<Entity>` for database operations
- Add `private readonly logger = new Logger(ServiceName.name)`
- Return DTOs, not raw entities

### Controller Conventions
- Use `@ParseUUIDPipe` for ID parameters
- Return `{ success: true, data: ... }` format
- Use pagination: `{ data: [], meta: { page, limit, total, totalPages } }`

## Frontend Patterns (Next.js)

### Page Structure
Each page uses server/client component pattern:
```tsx
// page.tsx (Server Component)
import { getServerUser } from '@/lib/auth';
import { AppLayout } from '@/components/layouts/AppLayout';
import { PageClient } from './PageClient';

export default async function Page() {
    const user = await getServerUser();
    if (!user) redirect('/403');
    
    return (
        <AppLayout user={user} currentPath="/path">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <PageClient />
            </Suspense>
        </AppLayout>
    );
}

// PageClient.tsx (Client Component)
'use client';
export function PageClient() { ... }
```

### API Functions
- All API functions are in `src/lib/api.ts`
- Use `fetch` with `credentials: 'include'`
- API base: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'`

### Component Conventions
- Functional components with TypeScript
- Use `useState`, `useEffect`, `useCallback` hooks
- Turkish UI labels (e.g., "Siparişler", "Kaydet", "İptal")

## Commands
```bash
pnpm dev          # Start all apps
pnpm dev:api      # Start backend only
pnpm dev:web      # Start frontend only
pnpm build        # Build all
```

## Important Notes
- DO NOT modify `integration-mist/` directory - it's reference only
- Always register new modules in `app.module.ts`
- Add new API functions to `apps/web/src/lib/api.ts`
- Use Turkish for UI text, English for code/comments
