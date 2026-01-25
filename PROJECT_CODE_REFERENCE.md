# AmbarHub - Proje Kod Referansı

> **Son Güncelleme**: 2026-01-25  
> **Versiyon**: 1.0.0

---

## 📁 Proje Yapısı

```
ambar-hub/
├── apps/
│   ├── api/                    # NestJS Backend (Port: 3001)
│   └── web/                    # Next.js Frontend (Port: 3000)
├── packages/
│   ├── types/                  # Paylaşılan TypeScript tipleri (@repo/types)
│   └── auth-config/            # Auth konfigürasyonu (@repo/auth-config)
├── docs/                       # Dokümantasyon
├── docker-compose.yml          # Docker yapılandırması
├── package.json                # Root workspace
├── pnpm-workspace.yaml         # pnpm workspace tanımları
└── turbo.json                  # Turborepo konfigürasyonu
```

---

## 🔧 Teknoloji Stack

### Backend (`apps/api`)
| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| NestJS | ^10.x | Ana framework |
| TypeORM | ^0.3.x | ORM (MySQL) |
| MySQL | 8.0 | Veritabanı |
| JWT | - | Authentication |
| bcrypt | - | Password hashing |
| class-validator | - | DTO validation |

### Frontend (`apps/web`)
| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| Next.js | 14.x | App Router |
| React | 18.x | UI Library |
| TypeScript | ^5.x | Type safety |
| Tailwind CSS | ^3.x | Styling |
| shadcn/ui | - | UI Components |

---

## 🏗️ API Modülleri

### `apps/api/src/` Dizin Yapısı

```
src/
├── main.ts                     # Uygulama başlatıcı
├── app.module.ts               # Ana modül
├── auth/                       # Authentication
├── users/                      # Kullanıcı yönetimi
├── warehouses/                 # Depo yönetimi
├── stores/                     # Mağaza yönetimi
├── products/                   # Ürün yönetimi
├── product-stores/             # Ürün-Mağaza ilişkileri
├── orders/                     # Sipariş yönetimi
├── customers/                  # Müşteri yönetimi
├── invoices/                   # Fatura yönetimi
├── shelves/                    # Raf yönetimi
├── picking/                    # Toplama işlemleri
├── packing/                    # Paketleme işlemleri
├── routes/                     # Rota yönetimi
├── returns/                    # İade yönetimi
├── purchases/                  # Satınalma yönetimi
├── suppliers/                  # Tedarikçi yönetimi
├── shipping-providers/         # Kargo sağlayıcıları
├── consumables/                # Sarf malzemeleri
├── waybills/                   # İrsaliye yönetimi
├── dashboard/                  # Dashboard verileri
├── common/                     # Paylaşılan utilities
└── database/                   # DB konfigürasyonu ve migrations
```

---

## 📊 Modül Detayları

### 1. Auth Module (`auth/`)

**Dosyalar:**
- `auth.controller.ts` - Login, logout, refresh, me endpoints
- `auth.service.ts` - JWT token yönetimi
- `auth.module.ts` - Modül tanımı
- `guards/jwt-auth.guard.ts` - JWT authentication guard
- `guards/jwt-refresh.guard.ts` - Refresh token guard
- `strategies/jwt.strategy.ts` - JWT strategy
- `strategies/jwt-refresh.strategy.ts` - Refresh JWT strategy
- `dto/login.dto.ts` - Login DTO
- `entities/token-blacklist.entity.ts` - Blacklisted tokens

**Endpoints:**
```
POST /api/auth/login          # Login
POST /api/auth/logout         # Logout (protected)
POST /api/auth/refresh        # Token refresh
GET  /api/auth/me             # Current user (protected)
```

---

### 2. Users Module (`users/`)

**Entity:** `User`
```typescript
{
  id: string (UUID)
  email: string (unique)
  password: string (hashed)
  firstName: string
  lastName: string
  role: 'PLATFORM_OWNER' | 'OPERATION'
  isActive: boolean
  refreshToken: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}
```

**Endpoints:**
```
GET    /api/users            # Liste (paginated)
GET    /api/users/:id        # Detay
POST   /api/users            # Oluştur
PATCH  /api/users/:id        # Güncelle
DELETE /api/users/:id        # Soft delete
```

---

### 3. Warehouses Module (`warehouses/`)

**Entity:** `Warehouse`
```typescript
{
  id: string (UUID)
  name: string
  address: string | null
  isActive: boolean
  stores: Store[]            # One-to-Many
  createdAt: Date
  updatedAt: Date
}
```

**Endpoints:**
```
GET    /api/warehouses       # Liste
GET    /api/warehouses/:id   # Detay
POST   /api/warehouses       # Oluştur
PATCH  /api/warehouses/:id   # Güncelle
DELETE /api/warehouses/:id   # Sil (restrict if stores exist)
```

---

### 4. Stores Module (`stores/`)

**Entity:** `Store`
```typescript
{
  id: string (UUID)
  name: string
  brandName: string
  type: 'TRENDYOL' | 'HEPSIBURADA' | 'IKAS' | 'MANUAL'
  warehouseId: string         # FK to Warehouse
  
  // API Credentials
  apiUrl: string | null
  sellerId: string | null
  apiKey: string | null       # encrypted
  apiSecret: string | null    # encrypted
  
  // Shipping
  shippingProviderId: string | null
  
  // Sync Settings
  crawlIntervalMinutes: number
  sendStock: boolean
  sendPrice: boolean
  sendOrderStatus: boolean
  
  // Company Config
  brandCode: string | null
  companyCode: string | null
  branchCode: string | null
  coCode: string | null
  
  // Invoice Settings
  invoiceEnabled: boolean
  invoiceTransactionCode: string | null
  hasMicroExport: boolean
  
  // E-Archive & E-Invoice settings...
  
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

**Endpoints:**
```
GET    /api/stores           # Liste (filterable by type)
GET    /api/stores/:id       # Detay
POST   /api/stores           # Oluştur
PATCH  /api/stores/:id       # Güncelle
DELETE /api/stores/:id       # Sil
POST   /api/stores/:id/sync-orders    # Sipariş senkronizasyonu
POST   /api/stores/:id/sync-products  # Ürün senkronizasyonu
```

---

### 5. Products Module (`products/`)

**Entity:** `Product`
```typescript
{
  id: string (UUID)
  name: string
  brandId: string | null      # FK to Brand
  categoryId: string | null   # FK to Category
  barcode: string | null (unique)
  sku: string | null
  vatRate: number (default: 20)
  desi: number | null
  purchasePrice: decimal
  salePrice: decimal
  lastSalePrice: decimal | null
  isActive: boolean
  type: 'SINGLE' | 'SET'
  productStores: ProductStore[]
  setItems: ProductSetItem[]  # For SET products
}
```

**Alt Entities:**
- `Brand` - Marka tanımları
- `Category` - Kategori tanımları
- `ProductSetItem` - Set ürün içerikleri

**Endpoints:**
```
GET    /api/products         # Liste (paginated, filterable)
GET    /api/products/:id     # Detay
POST   /api/products         # Oluştur
PATCH  /api/products/:id     # Güncelle
DELETE /api/products/:id     # Soft delete

# Brands
GET    /api/brands           # Marka listesi
POST   /api/brands           # Marka oluştur
PATCH  /api/brands/:id       # Marka güncelle
DELETE /api/brands/:id       # Marka sil

# Categories
GET    /api/categories       # Kategori listesi
POST   /api/categories       # Kategori oluştur
PATCH  /api/categories/:id   # Kategori güncelle
DELETE /api/categories/:id   # Kategori sil
```

---

### 6. Product-Stores Module (`product-stores/`)

**Entity:** `ProductStore`
```typescript
{
  id: string (UUID)
  productId: string           # FK to Product
  storeId: string             # FK to Store
  storeSku: string | null     # Store-specific SKU
  storeSalePrice: decimal | null
  stockQuantity: number
  sellableQuantity: number    # Computed
  reservableQuantity: number  # Computed
  committedQuantity: number   # Reserved for orders
  isActive: boolean
  
  @Unique(['productId', 'storeId'])
}
```

**Endpoints:**
```
GET    /api/product-stores          # Liste
GET    /api/product-stores/:id      # Detay
POST   /api/product-stores          # Oluştur
PATCH  /api/product-stores/:id      # Güncelle
DELETE /api/product-stores/:id      # Sil
```

---

### 7. Orders Module (`orders/`)

**Entity:** `Order`
```typescript
{
  id: string (UUID)
  orderNumber: string (unique)
  storeId: string             # FK to Store
  customerId: string          # FK to Customer
  
  // Status
  status: OrderStatus         # Enum
  type: 'SALE' | 'RETURN'
  
  // Payment
  paymentMethod: string | null
  isEInvoiceUser: boolean
  
  // Amounts
  subTotal: decimal
  shippingTotal: decimal
  discountTotal: decimal
  grandTotal: decimal
  
  // Shipping
  cargoTrackingNumber: string | null
  cargoLabelHtml: string | null (TEXT)
  
  // Dates
  orderDate: Date
  shippedAt: Date | null
  deliveredAt: Date | null
  
  // Relations
  items: OrderItem[]
  consumables: OrderConsumable[]
  histories: OrderHistory[]
  
  createdAt: Date
  updatedAt: Date
}
```

**OrderStatus Enum:**
```typescript
enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PICKING = 'PICKING',
  PICKED = 'PICKED',
  PACKING = 'PACKING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED'
}
```

**Alt Entities:**
- `OrderItem` - Sipariş kalemleri
- `OrderConsumable` - Sipariş sarf malzemeleri
- `OrderHistory` - Sipariş geçmişi
- `FaultyOrder` - Hatalı siparişler

**Endpoints:**
```
GET    /api/orders           # Liste (paginated, filterable)
GET    /api/orders/:id       # Detay
POST   /api/orders           # Manuel oluştur
PATCH  /api/orders/:id       # Güncelle
DELETE /api/orders/:id       # Sil

POST   /api/orders/:id/cancel         # İptal
POST   /api/orders/:id/ship           # Kargoya ver
POST   /api/orders/:id/deliver        # Teslim edildi
GET    /api/orders/:id/history        # Sipariş geçmişi
```

---

### 8. Customers Module (`customers/`)

**Entity:** `Customer`
```typescript
{
  id: string (UUID)
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  
  // Company Info
  companyName: string | null
  taxNumber: string | null
  taxOffice: string | null
  
  // Address
  address: string
  city: string
  district: string | null
  postalCode: string | null
  country: string
  
  orders: Order[]
  
  createdAt: Date
  updatedAt: Date
}
```

---

### 9. Shelves Module (`shelves/`)

**Entity:** `Shelf`
```typescript
{
  id: string (UUID)
  warehouseId: string         # FK to Warehouse
  code: string (unique)       # Raf kodu (örn: A-01-01)
  type: 'STORAGE' | 'PICKING' | 'PACKING' | 'SHIPPING'
  isActive: boolean
  
  stocks: ShelfStock[]
  movements: ShelfStockMovement[]
}
```

**Alt Entities:**

`ShelfStock`:
```typescript
{
  id: string (UUID)
  shelfId: string
  productId: string
  quantity: number
  reservedQuantity: number
}
```

`ShelfStockMovement`:
```typescript
{
  id: string (UUID)
  shelfId: string
  productId: string
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  direction: 'IN' | 'OUT'
  quantity: number
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  createdAt: Date
  createdBy: string | null
}
```

**Endpoints:**
```
GET    /api/shelves                    # Liste
GET    /api/shelves/:id                # Detay
POST   /api/shelves                    # Oluştur
PATCH  /api/shelves/:id                # Güncelle
DELETE /api/shelves/:id                # Sil

# Stock Operations
POST   /api/shelves/:id/add-stock      # Stok ekle
POST   /api/shelves/:id/remove-stock   # Stok çıkar
POST   /api/shelves/transfer           # Raflar arası transfer
GET    /api/shelves/:id/movements      # Hareket geçmişi
```

---

### 10. Picking Module (`picking/`)

**Endpoints:**
```
GET    /api/picking/orders        # Toplanacak siparişler
POST   /api/picking/start         # Toplama başlat
POST   /api/picking/confirm       # Toplama onayla
POST   /api/picking/complete      # Toplama tamamla
```

---

### 11. Packing Module (`packing/`)

**Entity:** `PackingSession`
```typescript
{
  id: string (UUID)
  orderId: string
  userId: string
  status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  items: PackingOrderItem[]
  startedAt: Date
  completedAt: Date | null
}
```

**Alt Entities:**
- `PackingMaterial` - Paketleme malzemeleri
- `PackingOrderItem` - Paketlenmiş ürünler

**Endpoints:**
```
GET    /api/packing/sessions        # Oturumlar
POST   /api/packing/start           # Paketleme başlat
POST   /api/packing/scan            # Ürün tara
POST   /api/packing/complete        # Paketleme tamamla

# Materials
GET    /api/packing/materials       # Malzeme listesi
POST   /api/packing/materials       # Malzeme oluştur
```

---

### 12. Routes Module (`routes/`)

**Entity:** `Route`
```typescript
{
  id: string (UUID)
  name: string
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  createdById: string
  
  routeOrders: RouteOrder[]
  consumables: RouteConsumable[]
  
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
```

**Endpoints:**
```
GET    /api/routes               # Liste
GET    /api/routes/:id           # Detay
POST   /api/routes               # Oluştur
PATCH  /api/routes/:id           # Güncelle
DELETE /api/routes/:id           # Sil

POST   /api/routes/:id/start     # Başlat
POST   /api/routes/:id/complete  # Tamamla
POST   /api/routes/:id/add-order # Sipariş ekle
```

---

### 13. Returns Module (`returns/`)

**Entity:** `Return`
```typescript
{
  id: string (UUID)
  orderId: string
  status: 'PENDING' | 'RECEIVED' | 'INSPECTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED'
  reason: string
  notes: string | null
  
  items: ReturnItem[]
  
  createdAt: Date
  updatedAt: Date
}
```

**Endpoints:**
```
GET    /api/returns              # Liste
GET    /api/returns/:id          # Detay
POST   /api/returns              # Oluştur
PATCH  /api/returns/:id          # Güncelle

POST   /api/returns/:id/receive  # Teslim al
POST   /api/returns/:id/inspect  # İncele
POST   /api/returns/:id/approve  # Onayla
POST   /api/returns/:id/reject   # Reddet
POST   /api/returns/:id/refund   # İade et
```

---

### 14. Purchases Module (`purchases/`)

**Entity:** `PurchaseOrder`
```typescript
{
  id: string (UUID)
  orderNumber: string (unique)
  supplierId: string
  warehouseId: string
  type: 'STANDARD' | 'RETURN'
  status: 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'
  
  items: PurchaseOrderItem[]
  receipts: GoodsReceipt[]
  
  orderDate: Date
  expectedDate: Date | null
  totalAmount: decimal
}
```

**Alt Entities:**
- `PurchaseOrderItem` - Satınalma kalemleri
- `GoodsReceipt` - Mal kabul
- `GoodsReceiptItem` - Mal kabul kalemleri

**Endpoints:**
```
GET    /api/purchases            # Liste
GET    /api/purchases/:id        # Detay
POST   /api/purchases            # Oluştur
PATCH  /api/purchases/:id        # Güncelle
DELETE /api/purchases/:id        # Sil

POST   /api/purchases/:id/receive   # Mal kabul
```

---

### 15. Invoices Module (`invoices/`)

**Entity:** `Invoice`
```typescript
{
  id: string (UUID)
  invoiceNumber: string (unique)
  orderId: string
  type: 'E_ARCHIVE' | 'E_INVOICE'
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  
  // Amounts
  subTotal: decimal
  vatTotal: decimal
  grandTotal: decimal
  
  // GIB Integration
  gibDocumentId: string | null
  gibResponse: JSON | null
  
  createdAt: Date
  sentAt: Date | null
}
```

**Endpoints:**
```
GET    /api/invoices             # Liste
GET    /api/invoices/:id         # Detay
POST   /api/invoices             # Oluştur
POST   /api/invoices/:id/send    # GIB'e gönder
POST   /api/invoices/:id/cancel  # İptal
```

---

### 16. Suppliers Module (`suppliers/`)

**Entity:** `Supplier`
```typescript
{
  id: string (UUID)
  name: string
  code: string (unique)
  email: string | null
  phone: string | null
  address: string | null
  taxNumber: string | null
  isActive: boolean
}
```

---

### 17. Shipping Providers Module (`shipping-providers/`)

**Entity:** `ShippingProvider`
```typescript
{
  id: string (UUID)
  name: string
  type: 'ARAS' | 'MNG' | 'YURTICI' | 'OTHER'
  
  // API Credentials
  apiUrl: string | null
  apiKey: string | null
  apiSecret: string | null
  
  isActive: boolean
}
```

**Aras Kargo Integration:**
- `stores/providers/aras-kargo.service.ts` - Aras Kargo API entegrasyonu

---

### 18. Consumables Module (`consumables/`)

**Entity:** `Consumable`
```typescript
{
  id: string (UUID)
  name: string
  code: string (unique)
  unit: string              # Birim (adet, kg, metre vb.)
  currentStock: number
  minStockLevel: number
  isActive: boolean
}
```

---

### 19. Waybills Module (`waybills/`)

**Entity:** `Waybill`
```typescript
{
  id: string (UUID)
  waybillNumber: string (unique)
  orderId: string
  type: 'SHIPPING' | 'RETURN'
  status: 'CREATED' | 'PRINTED' | 'DELIVERED'
  createdAt: Date
}
```

---

### 20. Dashboard Module (`dashboard/`)

**Endpoints:**
```
GET    /api/dashboard/stats      # Özet istatistikler
GET    /api/dashboard/charts     # Grafik verileri
GET    /api/dashboard/recent     # Son aktiviteler
```

---

## 🗄️ Database Migrations

Migration dosyaları `apps/api/src/database/migrations/` altında:

| Migration | Açıklama |
|-----------|----------|
| `1736634600000-ExpandOrderSchema.ts` | Sipariş şeması genişletme |
| `1736635200000-CreateInvoicesTable.ts` | Fatura tablosu |
| `1736686000000-AddSetProductsFeature.ts` | Set ürün özelliği |
| `1736693000000-CreateFaultyOrdersTable.ts` | Hatalı siparişler |
| `1736693100000-CreateShelvesTable.ts` | Raf tablosu |
| `1736693200000-CreatePurchaseTables.ts` | Satınalma tabloları |
| `1768246909852-ManualAddStockQuantities.ts` | Stok miktarları |
| `1768246909853-AddCommittedQuantityToProductStores.ts` | Committed quantity |
| `1768610400000-AddInvoiceSettingsToIntegrationStores.ts` | Fatura ayarları |
| `1768610500000-AddPaymentMethodToOrders.ts` | Ödeme yöntemi |
| `1768610600000-AddEArchiveHavaleCardCodeToIntegrationStores.ts` | E-Arşiv havale kodu |
| `1768610700000-AddHavaleAccountCodesToIntegrationStores.ts` | Havale hesap kodları |
| `1768653161720-AddCompanyAndTaxOfficeToCustomers.ts` | Şirket ve vergi dairesi |
| `1768656000000-AddIsEInvoiceUserToOrders.ts` | E-Fatura kullanıcısı |
| `1768658000000-AddTaxNumberToCustomers.ts` | Vergi numarası |
| `1768660000000-AddCompanyConfigToIntegrationStores.ts` | Şirket konfigürasyonu |
| `1768670000000-AddRouteCreatedByAndDates.ts` | Rota oluşturan ve tarihler |
| `1768680000000-AddInvoiceEnabledToIntegrationStores.ts` | Fatura aktifliği |
| `1768690000000-CreateWaybillsTable.ts` | İrsaliye tablosu |
| `1768690100000-AddCargoLabelHtmlToOrders.ts` | Kargo etiketi HTML |
| `1768690200000-CreateShelfStockMovements.ts` | Raf stok hareketleri |
| `1768690300000-CreateOrderHistories.ts` | Sipariş geçmişi |

---

## 🌐 Frontend Yapısı

### `apps/web/src/` Dizin Yapısı

```
src/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home (redirect)
│   ├── auth/
│   │   └── login/              # Login sayfası
│   ├── dashboard/              # Dashboard
│   ├── orders/                 # Siparişler
│   │   ├── page.tsx
│   │   ├── [id]/               # Sipariş detay
│   │   └── create/             # Yeni sipariş
│   ├── products/               # Ürünler
│   │   ├── page.tsx
│   │   └── [id]/               # Ürün detay
│   ├── stores/                 # Mağazalar
│   │   ├── page.tsx
│   │   ├── [id]/               # Mağaza detay
│   │   └── create/             # Yeni mağaza
│   ├── warehouses/             # Depolar
│   ├── shelves/                # Raflar
│   ├── picking/                # Toplama
│   ├── packing/                # Paketleme
│   ├── routes/                 # Rotalar
│   ├── returns/                # İadeler
│   ├── invoices/               # Faturalar
│   ├── customers/              # Müşteriler
│   ├── suppliers/              # Tedarikçiler
│   ├── purchases/              # Satınalma
│   ├── users/                  # Kullanıcılar
│   ├── definitions/            # Tanımlar (brand, category, consumables)
│   ├── stock-movements/        # Stok hareketleri
│   ├── product-stores/         # Ürün-Mağaza
│   ├── shippings/              # Kargo
│   ├── faulty-orders/          # Hatalı siparişler
│   ├── account/                # Hesap ayarları
│   ├── 401/                    # Unauthorized
│   ├── 403/                    # Forbidden
│   └── api/                    # API routes (proxy)
│
├── components/
│   ├── common/                 # Ortak bileşenler
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Table.tsx
│   │   ├── Badge.tsx
│   │   ├── Toast.tsx
│   │   ├── Skeleton.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ConfirmModal.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── SidebarProvider.tsx
│   │   └── LogoutButton.tsx
│   ├── layouts/
│   │   ├── AppLayout.tsx       # Ana layout (sidebar + topbar)
│   │   ├── AuthLayout.tsx      # Auth layout
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── ui/                     # shadcn/ui components
│   ├── orders/
│   │   ├── OrdersTable.tsx
│   │   ├── FetchOrderDialog.tsx
│   │   └── SyncOrdersDialog.tsx
│   ├── products/
│   │   └── ProductStoreList.tsx
│   └── returns/
│       └── ReturnsTable.tsx
│
├── lib/
│   ├── api.ts                  # API client functions
│   ├── auth.ts                 # Auth utilities
│   └── utils.ts                # Helper functions
│
├── hooks/
│   └── use-table-query.ts      # Table query hook
│
├── config/
│   └── routes.ts               # Route definitions
│
├── types/
│   └── index.ts                # Type exports
│
└── middleware.ts               # Next.js middleware (auth)
```

---

## 🔐 Authentication Flow

### Login Flow
```
1. User enters credentials
2. POST /api/auth/login
3. Backend validates credentials
4. Backend generates access + refresh tokens
5. Tokens set as HttpOnly cookies
6. Frontend redirects to dashboard
```

### Token Refresh Flow
```
1. Access token expires
2. Middleware detects 401
3. POST /api/auth/refresh (with refresh token cookie)
4. Backend validates refresh token
5. New tokens generated and set
6. Original request retried
```

### Middleware (`middleware.ts`)
- Protects all routes except `/auth/*`
- Validates access token
- Handles token refresh automatically
- Redirects unauthorized users to login

---

## 📦 Shared Packages

### `@repo/types`
```typescript
// Role enum
export enum Role {
  PLATFORM_OWNER = 'PLATFORM_OWNER',
  OPERATION = 'OPERATION'
}

// JWT Payload
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginationResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### `@repo/auth-config`
```typescript
// Cookie names
export const AUTH_CONSTANTS = {
  COOKIE_NAMES: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token'
  },
  TOKEN_TTL: {
    ACCESS_TOKEN_SECONDS: 900,      // 15 minutes
    REFRESH_TOKEN_SECONDS: 604800   // 7 days
  }
};

// Cookie config helpers
export function getAccessTokenCookieConfig(env);
export function getRefreshTokenCookieConfig(env);

// Route permissions
export function isPublicRoute(pathname: string): boolean;
export function isRouteAllowed(pathname: string, role: Role): boolean;
export function getDefaultRouteByRole(role: Role): string;
```

---

## 🚀 Komutlar

```bash
# Development
pnpm dev                 # Tüm uygulamaları başlat
pnpm dev:api             # Sadece API
pnpm dev:web             # Sadece Web

# Build
pnpm build               # Tüm uygulamaları build et
pnpm build:api           # Sadece API
pnpm build:web           # Sadece Web

# Database
pnpm seed                # Seed database

# Docker
docker-compose up -d     # Container'ları başlat
docker-compose logs -f   # Logları izle
docker-compose down      # Container'ları durdur
```

---

## 🔧 Environment Variables

### Backend (`apps/api/.env`)
```env
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=ambarhub

# JWT
JWT_ACCESS_SECRET=your-32-char-secret
JWT_REFRESH_SECRET=your-32-char-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS
CORS_ORIGINS=http://localhost:3000

# Optional
COOKIE_DOMAIN=
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
API_URL=http://localhost:3001/api  # For SSR
```

---

## 👥 Rol Tabanlı Erişim

| Sayfa | PLATFORM_OWNER | OPERATION |
|-------|----------------|-----------|
| Dashboard | ✅ | ❌ |
| Orders | ✅ | ✅ |
| Products | ✅ | ❌ |
| Stores | ✅ | ❌ |
| Warehouses | ✅ | ❌ |
| Users | ✅ | ❌ |
| Picking | ✅ | ✅ |
| Packing | ✅ | ✅ |
| Routes | ✅ | ✅ |
| Account | ✅ | ✅ |

---

## 📝 Son Güncelleme Notu

### `shelves.service.ts` - transferStock Metodu Değişikliği

**Değişiklik:** Stok transfer işlemi optimize edildi.

**Önceki Durum:**
```typescript
const from = await this.removeStock(fromShelfId, productId, quantity);
const to = await this.addStock(toShelfId, productId, quantity);
```

**Yeni Durum:**
```typescript
// Manuel stok güncelleme (sync olmadan)
fromStock.quantity = Math.max(0, fromStock.quantity - quantity);
if (fromStock.quantity === 0 && fromStock.reservedQuantity === 0) {
    await this.shelfStockRepository.remove(fromStock);
} else {
    await this.shelfStockRepository.save(fromStock);
}

// Hedef rafa ekleme
if (toStock) {
    toStock.quantity += quantity;
} else {
    toStock = this.shelfStockRepository.create({...});
}
await this.shelfStockRepository.save(toStock);

// Tek seferde sync
await this.syncProductStock(productId, toShelfId);
```

**Neden?**
1. `removeStock` ve `addStock` metodları her biri ayrı ayrı `syncProductStock` çağırıyordu
2. Transfer işleminde 2 kez sync yerine 1 kez sync yapılması performansı artırır
3. Atomik olmayan işlem riski azaltıldı

**Dikkat Edilmesi Gerekenler:**
- `syncProductStock` sadece bir kez çağrılıyor ve `toShelfId` ile çağrılıyor
- `fromShelfId` için ayrı sync yok - bu mantıklı çünkü transfer işlemi aynı ürün için
- Ancak farklı warehouse'lar arasında transfer varsa dikkatli olunmalı

---

*Bu dokümantasyon otomatik olarak oluşturulmuştur.*
