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
│   │   │   ├── integrations/   # Integrations module
│   │   │   ├── integration-stores/  # Integration-Store relationships
│   │   │   ├── products/       # Products module
│   │   │   ├── product-integrations/  # Product-Integration relationships
│   │   │   ├── product-stores/  # Product-Store relationships
│   │   │   ├── stores/         # Stores module
│   │   │   ├── warehouses/     # Warehouses module
│   │   │   ├── shipping-providers/  # Shipping providers module
│   │   │   ├── common/         # Shared utilities
│   │   │   └── database/       # Database configuration
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/            # Next.js App Router pages
│       │   │   ├── auth/       # Authentication pages
│       │   │   ├── dashboard/  # Dashboard page
│       │   │   ├── integrations/  # Integrations management
│       │   │   ├── products/   # Products management
│       │   │   ├── shippings/  # Shipping providers management
│       │   │   ├── stores/     # Stores management
│       │   │   ├── users/      # Users management
│       │   │   ├── warehouses/ # Warehouses management
│       │   │   └── account/    # Account settings
│       │   ├── components/     # React components
│       │   │   ├── common/     # Common UI components
│       │   │   └── layouts/    # Layout components
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

## Data Model & Entity Relationships

### Entity Relationship Diagram

```
                            ┌──────────────────┐
                            │ ShippingProvider │
                            └────────┬─────────┘
                                     │
                                     │ n:1 (optional)
                                     │
┌─────────────┐           ┌──────────┴────────────┐           ┌──────────────┐
│  Warehouse  │ 1       n │  IntegrationStore     │ n       1 │ Integration  │
│             ├───────────┤   (Junction Table)    ├───────────┤              │
│             │           │                       │           │ - TRENDYOL   │
└─────────────┘           │ - sellerId            │           │ - HEPSIBURADA│
       │                  │ - apiKey/apiSecret    │           │ - IKAS       │
       │ 1                │ - crawlInterval       │           └──────────────┘
       │                  │ - send flags          │
       │ n                └───────────────────────┘
       │                            │
┌──────┴──────┐                    │
│    Store    │────────────────────┘
│             │ 1
└──────┬──────┘
       │
       │ n
       │
┌──────┴────────────┐           ┌──────────────────┐
│  ProductStore     │ n       1 │    Product       │
│ (Junction Table)  ├───────────┤                  │
│                   │           │ - name, sku      │
│ - storeSku        │           │ - prices         │
│ - storeSalePrice  │           │ - brand, barcode │
│ - stockQuantity   │           └──────────────────┘
└────────┬──────────┘
         │
         │ 1
         │
         │ n
┌────────┴──────────────┐
│ ProductIntegration    │
│ (Junction Table)      │
│                       │
│ - integrationSalePrice│
└───────────────────────┘
```

### Core Entity Relationships

#### 1. Warehouse → Store (One-to-Many, Mandatory)
- **Cardinality**: 1 Warehouse : n Stores
- **Foreign Key**: `Store.warehouseId` → `Warehouse.id` (NOT NULL)
- **Cascade**: RESTRICT (cannot delete warehouse with active stores)
- **Business Rule**: Every store MUST be connected to exactly one warehouse

#### 2. Store ↔ Integration (Many-to-Many via IntegrationStore)
- **Junction Table**: `integration_stores`
- **Unique Constraint**: (integrationId, storeId) - prevents duplicates
- **Cascade**: CASCADE on delete (removes junction records)
- **Business Rule**: Same integration (e.g., Trendyol) can be used by multiple stores, each with unique credentials
- **Store-Specific Data**:
  - API credentials (sellerId, apiKey, apiSecret)
  - Integration settings (crawlInterval, send flags)
  - Optional shipping provider link

#### 3. Store ↔ Product (Many-to-Many via ProductStore)
- **Junction Table**: `product_stores`
- **Unique Constraint**: (productId, storeId) - one product per store relationship
- **Cascade**: CASCADE on delete
- **Business Rule**: Products can be sold across multiple stores with store-specific configurations
- **Store-Specific Data**:
  - Store SKU (storeSku)
  - Store-specific price (storeSalePrice)
  - Stock quantity per store

#### 4. ProductStore ↔ Integration (Many-to-Many via ProductIntegration)
- **Junction Table**: `product_integrations`
- **Unique Constraint**: (productStoreId, integrationId)
- **Cascade**: CASCADE on delete
- **Business Rule**: Products assigned to stores can have integration-specific pricing
- **Integration-Specific Data**:
  - Integration sale price override (highest priority in pricing hierarchy)

### Pricing Hierarchy

The system implements a three-tier pricing strategy:

1. **ProductIntegration.integrationSalePrice** (Highest Priority)
   - Integration-specific price override
   - Example: Same product can have different prices on Trendyol vs Hepsiburada

2. **ProductStore.storeSalePrice** (Medium Priority)
   - Store-specific price
   - Fallback if integration price not set

3. **Product.salePrice** (Lowest Priority/Default)
   - Base product price
   - Used when no store or integration overrides exist

### Entity Schemas

#### Warehouse
```typescript
{
  id: uuid
  name: string (max 255)
  address: string | null (max 255)
  isActive: boolean (default: true)
  stores: Store[]  // One-to-Many
}
```

#### Store
```typescript
{
  id: uuid
  name: string (max 255)
  proxyUrl: string (max 255)
  warehouseId: uuid  // REQUIRED - Foreign key
  isActive: boolean (default: true)
  warehouse: Warehouse  // Many-to-One
  integrationStores: IntegrationStore[]  // One-to-Many
  productStores: ProductStore[]  // One-to-Many
}
```

#### Integration
```typescript
{
  id: uuid
  name: string (max 255)
  type: IntegrationType  // Enum: TRENDYOL | HEPSIBURADA | IKAS
  apiUrl: string (max 500)
  isActive: boolean (default: true)
  integrationStores: IntegrationStore[]  // One-to-Many
  productIntegrations: ProductIntegration[]  // One-to-Many
}
```

#### IntegrationStore (Junction)
```typescript
{
  id: uuid
  integrationId: uuid  // REQUIRED
  storeId: uuid  // REQUIRED
  shippingProviderId: uuid | null  // Optional
  sellerId: string (max 255)
  apiKey: string (max 500)
  apiSecret: string (max 500)
  crawlIntervalMinutes: number (default: 60)
  sendStock: boolean (default: true)
  sendPrice: boolean (default: true)
  sendOrderStatus: boolean (default: true)
  isActive: boolean (default: true)
  @Unique(['integrationId', 'storeId'])
}
```

#### Product
```typescript
{
  id: uuid
  name: string (max 255)
  brand: string | null (max 255)
  category: string (max 255)
  barcode: string | null (unique, max 255)
  sku: string (max 255)
  vatRate: number (default: 20)
  desi: number | null
  purchasePrice: decimal(10,2) (default: 0)
  salePrice: decimal(10,2) (default: 0)
  lastSalePrice: decimal(10,2) | null
  isActive: boolean (default: true)
  productStores: ProductStore[]  // One-to-Many
}
```

#### ProductStore (Junction)
```typescript
{
  id: uuid
  productId: uuid  // REQUIRED
  storeId: uuid  // REQUIRED
  storeSku: string | null (max 255)
  storeSalePrice: decimal(10,2) | null
  stockQuantity: number (default: 0)
  isActive: boolean (default: true)
  productIntegrations: ProductIntegration[]  // One-to-Many
  @Unique(['productId', 'storeId'])
}
```

#### ProductIntegration (Junction)
```typescript
{
  id: uuid
  productStoreId: uuid  // REQUIRED - Links to ProductStore
  integrationId: uuid  // REQUIRED
  integrationSalePrice: decimal(10,2) | null  // Highest priority in pricing
  isActive: boolean (default: true)
  @Unique(['productStoreId', 'integrationId'])
}
```

### Business Constraints & Validation Rules

#### Database Level
1. **Foreign Key Constraints**:
   - `stores.warehouse_id` → `warehouses.id` (NOT NULL, RESTRICT on delete)
   - `integration_stores.integration_id` → `integrations.id` (CASCADE on delete)
   - `integration_stores.store_id` → `stores.id` (CASCADE on delete)
   - `product_stores.product_id` → `products.id` (CASCADE on delete)
   - `product_stores.store_id` → `stores.id` (CASCADE on delete)
   - `product_integrations.product_store_id` → `product_stores.id` (CASCADE on delete)
   - `product_integrations.integration_id` → `integrations.id` (CASCADE on delete)

2. **Unique Constraints**:
   - `integration_stores`: (integrationId, storeId)
   - `product_stores`: (productId, storeId)
   - `product_integrations`: (productStoreId, integrationId)
   - `products.barcode`: unique when not null

3. **Indexes**: Automatically created on foreign key columns

#### Application Level
1. **Store Creation**: Must provide valid `warehouseId`
2. **Integration Assignment**: Must use IntegrationStore junction with credentials
3. **Product Assignment**: Must use ProductStore junction with store-specific data
4. **Warehouse Deletion**: Blocked if stores exist (RESTRICT cascade)
5. **Soft Deletes**: All entities support `isActive` flag for logical deletion

### Cascade Behavior

- **Warehouse Deletion**: RESTRICTED (cannot delete if stores exist)
- **Store Deletion**: Cascades to `integration_stores` and `product_stores`
- **Integration Deletion**: Cascades to `integration_stores` and `product_integrations`
- **Product Deletion**: Cascades to `product_stores` and `product_integrations`
- **ProductStore Deletion**: Cascades to `product_integrations`

## Roles

| Role | Dashboard | Users | Integrations | Products | Stores | Warehouses | Shippings | Account |
|------|-----------|-------|--------------|----------|--------|------------|-----------|---------|
| PLATFORM_OWNER | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OPERATION | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

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

### Integrations (PLATFORM_OWNER only)
- GET `/api/integrations` - List integrations with pagination
- GET `/api/integrations/:id` - Get integration by ID
- POST `/api/integrations` - Create integration
- PATCH `/api/integrations/:id` - Update integration
- DELETE `/api/integrations/:id` - Soft delete integration

### Integration Stores (PLATFORM_OWNER only)
- GET `/api/integration-stores` - List integration-store relationships with pagination
- GET `/api/integration-stores/:id` - Get integration-store by ID
- POST `/api/integration-stores` - Create integration-store relationship
- PATCH `/api/integration-stores/:id` - Update integration-store relationship
- DELETE `/api/integration-stores/:id` - Soft delete integration-store relationship

### Products (PLATFORM_OWNER only)
- GET `/api/products` - List products with pagination
- GET `/api/products/:id` - Get product by ID
- POST `/api/products` - Create product
- PATCH `/api/products/:id` - Update product
- DELETE `/api/products/:id` - Soft delete product

### Product Integrations (PLATFORM_OWNER only)
- GET `/api/product-integrations` - List product-integration relationships with pagination
- GET `/api/product-integrations/:id` - Get product-integration by ID
- POST `/api/product-integrations` - Create product-integration relationship
- PATCH `/api/product-integrations/:id` - Update product-integration relationship
- DELETE `/api/product-integrations/:id` - Soft delete product-integration relationship

### Product Stores (PLATFORM_OWNER only)
- GET `/api/product-stores` - List product-store relationships with pagination
- GET `/api/product-stores/:id` - Get product-store by ID
- POST `/api/product-stores` - Create product-store relationship
- PATCH `/api/product-stores/:id` - Update product-store relationship
- DELETE `/api/product-stores/:id` - Soft delete product-store relationship

### Stores (PLATFORM_OWNER only)
- GET `/api/stores` - List stores with pagination
- GET `/api/stores/:id` - Get store by ID
- POST `/api/stores` - Create store
- PATCH `/api/stores/:id` - Update store
- DELETE `/api/stores/:id` - Soft delete store

### Warehouses (PLATFORM_OWNER only)
- GET `/api/warehouses` - List warehouses with pagination
- GET `/api/warehouses/:id` - Get warehouse by ID
- POST `/api/warehouses` - Create warehouse
- PATCH `/api/warehouses/:id` - Update warehouse
- DELETE `/api/warehouses/:id` - Soft delete warehouse

### Shipping Providers (PLATFORM_OWNER only)
- GET `/api/shipping-providers` - List shipping providers with pagination
- GET `/api/shipping-providers/:id` - Get shipping provider by ID
- POST `/api/shipping-providers` - Create shipping provider
- PATCH `/api/shipping-providers/:id` - Update shipping provider
- DELETE `/api/shipping-providers/:id` - Soft delete shipping provider

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
