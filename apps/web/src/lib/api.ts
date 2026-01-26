const isServer = typeof window === 'undefined';
const API_URL = isServer
  ? (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
  : '/api';
const BASE_URL = isServer ? undefined : window.location.origin;

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

// Generic API functions
export async function apiGetPaginated<T>(endpoint: string, options?: { params?: Record<string, any> }): Promise<PaginationResponse<T>> {
  const url = new URL(`${API_URL}${endpoint}`, BASE_URL);
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function apiPost<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function apiPatch<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function apiDelete(endpoint: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  storeCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StoreType = 'TRENDYOL' | 'HEPSIBURADA' | 'IKAS' | 'MANUAL';

export interface Store {
  id: string;
  name: string;
  brandName: string;
  type: StoreType;
  warehouseId: string;
  warehouseName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // API Credentials
  apiUrl?: string;
  sellerId?: string;
  hasApiKey?: boolean;
  hasApiSecret?: boolean;

  // Kargo Ayarları
  shippingProviderId?: string | null;
  shippingProviderName?: string;

  // Senkronizasyon Ayarları
  crawlIntervalMinutes?: number;
  sendStock?: boolean;
  sendPrice?: boolean;
  sendOrderStatus?: boolean;

  // Şirket Konfigürasyonu
  brandCode?: string;
  companyCode?: string;
  branchCode?: string;
  coCode?: string;

  // Fatura Ayarları
  invoiceEnabled?: boolean;
  invoiceTransactionCode?: string;
  hasMicroExport?: boolean;

  // E-Arşiv
  eArchiveBulkCustomer?: boolean;
  eArchiveCardCode?: string;
  eArchiveAccountCode?: string;
  eArchiveSerialNo?: string;
  eArchiveSequenceNo?: string;
  eArchiveHavaleCardCode?: string;
  eArchiveHavaleAccountCode?: string;

  // E-Fatura
  eInvoiceBulkCustomer?: boolean;
  eInvoiceCardCode?: string;
  eInvoiceAccountCode?: string;
  eInvoiceSerialNo?: string;
  eInvoiceSequenceNo?: string;
  eInvoiceHavaleCardCode?: string;
  eInvoiceHavaleAccountCode?: string;

  // Toplu Faturalama
  bulkEArchiveSerialNo?: string;
  bulkEArchiveSequenceNo?: string;
  bulkEInvoiceSerialNo?: string;
  bulkEInvoiceSequenceNo?: string;

  // İade Gider Pusulası
  refundExpenseVoucherEArchiveSerialNo?: string;
  refundExpenseVoucherEArchiveSequenceNo?: string;
  refundExpenseVoucherEInvoiceSerialNo?: string;
  refundExpenseVoucherEInvoiceSequenceNo?: string;

  // Mikro İhracat
  microExportTransactionCode?: string;
  microExportAccountCode?: string;
  microExportAzAccountCode?: string;
  microExportEArchiveSerialNo?: string;
  microExportEArchiveSequenceNo?: string;
  microExportBulkSerialNo?: string;
  microExportBulkSequenceNo?: string;
  microExportRefundSerialNo?: string;
  microExportRefundSequenceNo?: string;

  // Fatura Gönderen Bilgileri
  senderCompanyName?: string;
  senderAddress?: string;
  senderTaxOffice?: string;
  senderTaxNumber?: string;
  senderPhone?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: Brand | null;
  category: Category | null;
  barcode: string | null;
  sku: string | null;
  vatRate: number;
  desi: number | null;
  purchasePrice: number | null;
  salePrice: number | null;
  lastSalePrice: number | null;
  isActive: boolean;
  storeCount: number;
  totalStockQuantity: number;
  totalSellableQuantity: number;
  totalReservableQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductStore {
  id: string;
  productId: string;
  storeId: string;
  store: Store;
  storeSku: string | null;
  storeSalePrice: number | null;
  stockQuantity: number;
  sellableQuantity: number;
  reservableQuantity: number;
  committedQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingProvider {
  id: string;
  name: string;
  type: 'ARAS';
  isActive: boolean;
  integrationCount: number;
  storeCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Warehouse API
export async function getWarehouses(page = 1, limit = 10): Promise<PaginationResponse<Warehouse>> {
  const res = await fetch(`${API_URL}/warehouses?page=${page}&limit=${limit}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return res.json();
}

export async function getWarehouse(id: string): Promise<ApiResponse<Warehouse>> {
  const res = await fetch(`${API_URL}/warehouses/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return res.json();
}

export async function createWarehouse(data: { name: string; address?: string; isActive?: boolean }): Promise<ApiResponse<Warehouse>> {
  const res = await fetch(`${API_URL}/warehouses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateWarehouse(id: string, data: { name?: string; address?: string; isActive?: boolean }): Promise<ApiResponse<Warehouse>> {
  const res = await fetch(`${API_URL}/warehouses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteWarehouse(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/warehouses/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// Store API
export async function getStores(page = 1, limit = 10, type?: string): Promise<PaginationResponse<Store>> {
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (type) params.append('type', type);

  const res = await fetch(`${API_URL}/stores?${params}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return res.json();
}

export async function getStore(id: string): Promise<ApiResponse<Store>> {
  const res = await fetch(`${API_URL}/stores/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return res.json();
}

export async function createStore(data: Partial<Store>): Promise<ApiResponse<Store>> {
  const res = await fetch(`${API_URL}/stores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(Array.isArray(json.message) ? json.message.join(', ') : json.message || 'Mağaza oluşturulamadı');
  }
  return json;
}

export async function updateStore(id: string, data: Partial<Store>): Promise<ApiResponse<Store>> {
  const res = await fetch(`${API_URL}/stores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(Array.isArray(json.message) ? json.message.join(', ') : json.message || 'Mağaza güncellenemedi');
  }
  return json;
}

export async function deleteStore(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/stores/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// Integration API - Removed (module deleted)

// Trendyol Price & Inventory API
export interface TrendyolPriceInventoryResponse {
  success: boolean;
  message: string;
  batchRequestId?: string;
  sentItems?: number;
  skippedItems?: number;
}

export interface TrendyolBatchStatusResponse {
  success: boolean;
  message: string;
  status?: string;
  failedItems?: Array<{ barcode: string; reason: string }>;
}

export async function updateTrendyolPriceAndInventory(
  integrationStoreId: string,
  productIds?: string[]
): Promise<TrendyolPriceInventoryResponse> {
  const res = await fetch(`${API_URL}/integrations/stores/${integrationStoreId}/trendyol/price-inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productIds }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function getTrendyolBatchStatus(
  integrationStoreId: string,
  batchRequestId: string
): Promise<TrendyolBatchStatusResponse> {
  const res = await fetch(
    `${API_URL}/integrations/stores/${integrationStoreId}/trendyol/batch-status/${batchRequestId}`,
    {
      credentials: 'include',
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

// Hepsiburada Price & Inventory API
export interface HepsiburadaPriceInventoryResponse {
  success: boolean;
  message: string;
  priceUploadId?: string;
  stockUploadId?: string;
  sentItems?: number;
  skippedItems?: number;
}

export interface HepsiburadaUploadStatusResponse {
  success: boolean;
  message: string;
  status?: string;
  errors?: Array<{ sku: string; reason: string }>;
}

export interface HepsiburadaPackResponse {
  success: boolean;
  message: string;
  packageNumber?: string;
}

export interface HepsiburadaLabelResponse {
  success: boolean;
  message: string;
  labelUrl?: string;
  labelData?: string;
}

export async function updateHepsiburadaPriceAndInventory(
  integrationStoreId: string,
  productIds?: string[]
): Promise<HepsiburadaPriceInventoryResponse> {
  const res = await fetch(`${API_URL}/integrations/stores/${integrationStoreId}/hepsiburada/price-inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productIds }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function getHepsiburadaUploadStatus(
  integrationStoreId: string,
  type: 'price' | 'stock',
  uploadId: string
): Promise<HepsiburadaUploadStatusResponse> {
  const res = await fetch(
    `${API_URL}/integrations/stores/${integrationStoreId}/hepsiburada/upload-status/${type}/${uploadId}`,
    {
      credentials: 'include',
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function packHepsiburadaOrder(
  integrationStoreId: string,
  lineItems: Array<{ lineItemId: string; quantity: number }>
): Promise<HepsiburadaPackResponse> {
  const res = await fetch(`${API_URL}/integrations/stores/${integrationStoreId}/hepsiburada/pack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ lineItems }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function unpackHepsiburadaOrder(
  integrationStoreId: string,
  packageNumber: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(
    `${API_URL}/integrations/stores/${integrationStoreId}/hepsiburada/unpack/${packageNumber}`,
    {
      method: 'POST',
      credentials: 'include',
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function getHepsiburadaPackageLabel(
  integrationStoreId: string,
  packageNumber: string
): Promise<HepsiburadaLabelResponse> {
  const res = await fetch(
    `${API_URL}/integrations/stores/${integrationStoreId}/hepsiburada/label/${packageNumber}`,
    {
      credentials: 'include',
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

// ikas Price, Inventory & Order API
export interface IkasPriceInventoryResponse {
  success: boolean;
  message: string;
  updatedItems?: number;
  skippedItems?: number;
}

export interface IkasFulfillResponse {
  success: boolean;
  message: string;
  orderPackageId?: string;
}

export async function updateIkasPriceAndInventory(
  integrationStoreId: string,
  productIds?: string[]
): Promise<IkasPriceInventoryResponse> {
  const res = await fetch(`${API_URL}/integrations/stores/${integrationStoreId}/ikas/price-inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productIds }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function fulfillIkasOrder(
  integrationStoreId: string,
  orderId: string,
  orderLineItems: Array<{ orderLineItemId: string; quantity: number }>,
  trackingInfo?: {
    barcode?: string;
    cargoCompany?: string;
    trackingNumber?: string;
    trackingLink?: string;
  }
): Promise<IkasFulfillResponse> {
  const res = await fetch(`${API_URL}/integrations/stores/${integrationStoreId}/ikas/fulfill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ orderId, orderLineItems, trackingInfo }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function updateIkasOrderPackageStatus(
  integrationStoreId: string,
  orderId: string,
  packages: Array<{
    packageId: string;
    status: 'READY_FOR_SHIPMENT' | 'SHIPPED' | 'DELIVERED';
    trackingInfo?: {
      barcode?: string;
      cargoCompany?: string;
      trackingNumber?: string;
      trackingLink?: string;
    };
  }>
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/integrations/stores/${integrationStoreId}/ikas/package-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ orderId, packages }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function addIkasOrderInvoice(
  integrationStoreId: string,
  orderId: string,
  invoiceNumber: string,
  invoicePdfBase64?: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/integrations/stores/${integrationStoreId}/ikas/invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ orderId, invoiceNumber, invoicePdfBase64 }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

// Product API
export interface ProductFilters {
  name?: string;
  isActive?: string;
  brandId?: string;
  categoryId?: string;
  storeId?: string;
}

export async function getProducts(page = 1, limit = 10, filters?: ProductFilters): Promise<PaginationResponse<Product>> {
  const url = new URL(`${API_URL}/products`, BASE_URL);
  url.searchParams.append('page', String(page));
  url.searchParams.append('limit', String(limit));

  if (filters?.name) url.searchParams.append('name', filters.name);
  if (filters?.isActive) url.searchParams.append('isActive', filters.isActive);
  if (filters?.brandId) url.searchParams.append('brandId', filters.brandId);
  if (filters?.categoryId) url.searchParams.append('categoryId', filters.categoryId);
  if (filters?.storeId) url.searchParams.append('storeId', filters.storeId);

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    credentials: 'include',
  });
  return res.json();
}

export async function getProduct(id: string): Promise<ApiResponse<Product>> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return res.json();
}

export async function createProduct(data: {
  name: string;
  brandId?: string;
  categoryId?: string;
  barcode?: string;
  sku?: string;
  vatRate: number;
  desi?: number;
  purchasePrice?: number;
  salePrice?: number;
  lastSalePrice?: number;
  isActive?: boolean;
  productType?: 'SIMPLE' | 'SET';
  setPrice?: number;
}): Promise<ApiResponse<Product>> {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function importProducts(file: File): Promise<{ success: number; errors: string[] }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/products/import`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Import failed');
  }
  return res.json();
}

export async function downloadImportTemplate(): Promise<Blob> {
  const res = await fetch(`${API_URL}/products/import/template`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Şablon indirilemedi');
  }
  return res.blob();
}

export async function updateProduct(id: string, data: {
  name?: string;
  brandId?: string;
  categoryId?: string;
  barcode?: string;
  sku?: string;
  vatRate?: number;
  desi?: number;
  purchasePrice?: number;
  salePrice?: number;
  lastSalePrice?: number;
  isActive?: boolean;
  productType?: 'SIMPLE' | 'SET';
  setPrice?: number;
}): Promise<ApiResponse<Product>> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteProduct(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// ProductSetItem API
export interface ProductSetItem {
  id: string;
  setProductId: string;
  componentProductId: string;
  componentProduct?: Product;
  quantity: number;
  priceShare: number;
  sortOrder: number;
}

export async function getProductSetItems(productId: string): Promise<ProductSetItem[]> {
  const res = await fetch(`${API_URL}/products/${productId}/set-items`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  return res.json();
}

export async function updateProductSetItems(productId: string, items: {
  componentProductId: string;
  quantity: number;
  priceShare: number;
  sortOrder: number;
}[]): Promise<ProductSetItem[]> {
  const res = await fetch(`${API_URL}/products/${productId}/set-items`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(items),
  });
  return res.json();
}

// ProductStore API
export async function getProductStores(productId?: string): Promise<ProductStore[]> {
  const url = new URL(`${API_URL}/product-stores`, BASE_URL);
  if (productId) {
    url.searchParams.append('productId', productId);
  }
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  const json = await res.json();
  // API returns { success: true, data: { data: [...], meta: {...} } } or { success: true, data: [...] }
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.data?.data)) return json.data.data;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

export async function createProductStore(data: {
  productId: string;
  storeId: string;
  storeSku?: string;
  storeSalePrice?: number;
  stockQuantity: number;
  isActive?: boolean;
}): Promise<ApiResponse<ProductStore>> {
  const res = await fetch(`${API_URL}/product-stores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function updateProductStore(id: string, data: {
  storeSku?: string;
  storeSalePrice?: number;
  stockQuantity?: number;
  isActive?: boolean;
}): Promise<ApiResponse<ProductStore>> {
  const res = await fetch(`${API_URL}/product-stores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function deleteProductStore(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/product-stores/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

// IntegrationStore and ProductIntegration API - Removed (modules deleted)

// ShippingProvider API
export async function getShippingProviders(): Promise<ShippingProvider[]> {
  const res = await fetch(`${API_URL}/shipping-providers`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.data || []);
}

export async function getActiveShippingProviders(): Promise<ShippingProvider[]> {
  const res = await fetch(`${API_URL}/shipping-providers/active`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.data || []);
}

export async function createShippingProvider(data: {
  name: string;
  type: 'ARAS';
  isActive?: boolean;
}): Promise<ApiResponse<ShippingProvider>> {
  const res = await fetch(`${API_URL}/shipping-providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function updateShippingProvider(id: string, data: {
  name?: string;
  isActive?: boolean;
}): Promise<ApiResponse<ShippingProvider>> {
  const res = await fetch(`${API_URL}/shipping-providers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function deleteShippingProvider(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/shipping-providers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}


// Order API

export interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  district?: string | null;
  address?: string | null;
  invoiceCity?: string;
  invoiceDistrict?: string;
  invoiceAddress?: string;
  tcIdentityNumber?: string | null;
  trendyolCustomerId: string | null;
  company: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  type?: 'INDIVIDUAL' | 'COMMERCIAL';
}

export async function getCustomers(page = 1, limit = 10, search?: string): Promise<PaginationResponse<Customer>> {
  const url = new URL(`${API_URL}/customers`, BASE_URL);
  url.searchParams.append('page', String(page));
  url.searchParams.append('limit', String(limit));
  if (search) {
    url.searchParams.append('search', search);
  }

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export interface OrderItem {
  id: string;
  productName: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
}

export enum OrderStatus {
  CREATED = 'CREATED',
  WAITING_STOCK = 'WAITING_STOCK',       // Stok Bekliyor
  WAITING_PICKING = 'WAITING_PICKING',   // Toplama Bekliyor
  PICKING = 'PICKING',                   // Rotada Toplanıyor
  PICKED = 'PICKED',                     // Rotada Toplandı
  PACKING = 'PACKING',                   // Paketleniyor
  PACKED = 'PACKED',                     // Paketlendi
  INVOICED = 'INVOICED',                 // Faturalandı
  SHIPPED = 'SHIPPED',                   // Kargoya Verildi
  CANCELLED = 'CANCELLED',               // İptal Edildi
  DELIVERED = 'DELIVERED',               // Teslim Edildi
  UNDELIVERED = 'UNDELIVERED',           // Teslim Edilemedi
  RETURNED = 'RETURNED',                 // İade Edildi
  REPACK = 'REPACK',                     // Yeniden Paketle
  UNSUPPLIED = 'UNSUPPLIED',             // Temin Edilemedi (legacy)
  UNKNOWN = 'UNKNOWN',
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: Customer;
  storeId: string;
  store?: Store;
  status: OrderStatus;
  integrationStatus: string | null;
  totalPrice: number;
  orderDate: string;
  items?: OrderItem[];
  cargoTrackingNumber?: string;
  cargoLabelZpl?: string;
  agreedDeliveryDate?: string;
}

export async function getOrders(page = 1, limit = 10): Promise<PaginationResponse<Order>> {
  const res = await fetch(`${API_URL}/orders?page=${page}&limit=${limit}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    // If the endpoint doesn't exist yet, return empty for now to prevent crash
    return { success: true, data: [], meta: { page, limit, total: 0, totalPages: 0 } };
  }
  return res.json();
}

export async function getOrder(id: string): Promise<ApiResponse<Order>> {
  const res = await fetch(`${API_URL}/orders/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Order not found');
  }
  return res.json();
}

export interface OrderHistoryEvent {
  id: string;
  orderId: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  userId: string | null;
  userName: string | null;
  routeId: string | null;
  routeName: string | null;
  sessionId: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export async function getOrderTimeline(orderId: string): Promise<ApiResponse<OrderHistoryEvent[]>> {
  const res = await fetch(`${API_URL}/orders/${orderId}/timeline`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Timeline not found');
  }
  return res.json();
}

export interface StockMovement {
  id: string;
  shelfId: string;
  shelf?: {
    id: string;
    name: string;
    barcode: string;
  };
  productId: string;
  product?: {
    id: string;
    name: string;
    barcode: string;
    sku: string;
  };
  type: string;
  direction: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  orderId?: string;
  routeId?: string;
  sourceShelfId?: string;
  sourceShelf?: {
    id: string;
    name: string;
  };
  targetShelfId?: string;
  targetShelf?: {
    id: string;
    name: string;
  };
  referenceNumber?: string;
  notes?: string;
  userId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export async function getOrderStockMovements(orderId: string): Promise<{ success: boolean; data: StockMovement[] }> {
  const res = await fetch(`${API_URL}/shelves/movements/history?orderId=${orderId}&limit=100`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    return { success: false, data: [] };
  }
  return res.json();
}

export interface CargoLabelResponse {
  success: boolean;
  hasZpl: boolean;
  hasHtml: boolean;
  zpl?: string;
  html?: string;
  labelType: 'aras' | 'dummy' | 'none';
}

export async function getOrderCargoLabel(orderId: string): Promise<CargoLabelResponse> {
  const res = await fetch(`${API_URL}/orders/${orderId}/cargo-label`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Etiket alınamadı');
  }
  return res.json();
}

export async function syncOrders(integrationId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/orders/sync/${integrationId}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Sync failed');
  }
  return res.json();
}

// Faulty Orders API
export interface FaultyOrder {
  id: string;
  integrationId: string;
  storeId: string | null;
  packageId: string;
  orderNumber: string;
  rawData: object;
  missingBarcodes: string[];
  errorReason: string;
  retryCount: number;
  customerName: string;
  totalPrice: number;
  currencyCode: string;
  createdAt: string;
  integration?: { name: string };
  store?: { name: string };
}

export async function getFaultyOrders(
  page = 1,
  limit = 10,
  filters?: {
    barcode?: string;
    startDate?: string;
    endDate?: string;
    customerName?: string;
    orderNumber?: string;
  }
): Promise<PaginationResponse<FaultyOrder>> {
  const url = new URL(`${API_URL}/orders/faulty`, BASE_URL);
  url.searchParams.append('page', String(page));
  url.searchParams.append('limit', String(limit));

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value) url.searchParams.append(key, String(value));
    });
  }

  const res = await fetch(url.toString(), {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function deleteFaultyOrder(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/orders/faulty/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// Invoice API

export type DocumentType = 'INVOICE' | 'WAYBILL' | 'EXPENSE_VOUCHER' | 'REFUND_INVOICE';

export interface Invoice {
  id: string;
  documentType: DocumentType;
  orderId?: string;
  order?: Order;
  returnId?: string;
  storeId?: string;
  invoiceNumber: string;
  invoiceSerial?: string;
  edocNo?: string;
  ettn?: string;
  status: 'PENDING' | 'SENT' | 'SUCCESS' | 'ERROR' | 'CANCELLED';
  errorMessage?: string;
  cardCode?: string;
  branchCode?: string;
  totalAmount: number;
  currencyCode: string;
  invoiceDate: string;
  createdAt: string;
  customerFirstName?: string;
  customerLastName?: string;
  requestPayload?: any;
  responsePayload?: any;
}

export async function createInvoiceFromOrder(orderId: string, options?: {
  branchCode?: string;
  docTraCode?: string;
  costCenterCode?: string;
  whouseCode?: string;
  cardCode?: string;
}): Promise<Invoice> {
  const res = await fetch(`${API_URL}/invoices/create-from-order/${orderId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(options || {}),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Invoice creation failed');
  }
  return res.json();
}

export async function getInvoicePdf(invoiceId: string): Promise<{ html: string; pdfUrl?: string }> {
  const res = await fetch(`${API_URL}/invoices/${invoiceId}/pdf`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to get invoice PDF');
  }
  return res.json();
}

export async function getInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
  const res = await fetch(`${API_URL}/invoices/by-order/${orderId}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}


// Routes API

export enum RouteStatus {
  COLLECTING = 'COLLECTING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Route {
  id: string;
  name: string;
  description: string | null;
  status: RouteStatus;
  labelPrintedAt: string | null;
  totalOrderCount: number;
  totalItemCount: number;
  pickedItemCount: number;
  packedOrderCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  orders?: Order[];
}

export interface RouteSuggestion {
  id: string;
  type: 'single_product' | 'single_product_multi' | 'mixed';
  name: string;
  description: string;
  storeName?: string;
  storeId?: string;
  orderCount: number;
  totalQuantity: number;
  products: {
    barcode: string;
    name: string;
    orderCount: number;
    totalQuantity: number;
  }[];
  orders: any[];
  priority: number;
}

export async function getRoutes(status?: RouteStatus[]): Promise<{ data: Route[]; meta: { total: number } }> {
  const params = new URLSearchParams();
  if (status && status.length > 0) {
    params.append('status', status.join(','));
  }
  const res = await fetch(`${API_URL}/routes?${params}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    return { data: [], meta: { total: 0 } };
  }
  return res.json();
}

export async function getRoute(id: string): Promise<ApiResponse<Route>> {
  const res = await fetch(`${API_URL}/routes/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return res.json();
}

export interface RouteConsumableInput {
  consumableId: string;
  quantity: number;
}

export async function createRoute(data: {
  name?: string;
  description?: string;
  orderIds: string[];
  consumables?: RouteConsumableInput[];
}): Promise<ApiResponse<Route>> {
  const res = await fetch(`${API_URL}/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Route creation failed');
  }
  return res.json();
}

export async function deleteRoute(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/routes/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

export async function getFilteredOrders(filter: {
  storeId?: string;
  integrationId?: string;
  type?: string;
  productBarcodes?: string[];
  overdue?: boolean;
  search?: string;
  minTotalQuantity?: number;
  maxTotalQuantity?: number;
  micro?: boolean;
  brand?: string;
  orderDateStart?: string;
  orderDateEnd?: string;
  agreedDeliveryDateStart?: string;
  agreedDeliveryDateEnd?: string;
}): Promise<{ data: any[]; meta: { total: number } }> {
  const params = new URLSearchParams();
  if (filter.storeId) params.append('storeId', filter.storeId);
  if (filter.integrationId) params.append('integrationId', filter.integrationId);
  if (filter.type) params.append('type', filter.type);
  if (filter.productBarcodes?.length) params.append('productBarcodes', filter.productBarcodes.join(','));
  if (filter.overdue) params.append('overdue', 'true');
  if (filter.search) params.append('search', filter.search);
  if (filter.minTotalQuantity !== undefined) params.append('minTotalQuantity', filter.minTotalQuantity.toString());
  if (filter.maxTotalQuantity !== undefined) params.append('maxTotalQuantity', filter.maxTotalQuantity.toString());
  if (filter.micro !== undefined) params.append('micro', filter.micro.toString());
  if (filter.brand) params.append('brand', filter.brand);
  if (filter.orderDateStart) params.append('orderDateStart', filter.orderDateStart);
  if (filter.orderDateEnd) params.append('orderDateEnd', filter.orderDateEnd);
  if (filter.agreedDeliveryDateStart) params.append('agreedDeliveryDateStart', filter.agreedDeliveryDateStart);
  if (filter.agreedDeliveryDateEnd) params.append('agreedDeliveryDateEnd', filter.agreedDeliveryDateEnd);

  const res = await fetch(`${API_URL}/routes/filter-orders?${params}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    return { data: [], meta: { total: 0 } };
  }
  return res.json();
}

export async function getRouteSuggestions(options?: {
  storeId?: string;
  type?: string;
  productBarcodes?: string[];
  limit?: number;
}): Promise<{ data: RouteSuggestion[]; meta: { total: number } }> {
  const params = new URLSearchParams();
  if (options?.storeId && options.storeId !== 'all') params.append('storeId', options.storeId);
  if (options?.type && options.type !== 'all') params.append('type', options.type);
  if (options?.productBarcodes?.length) params.append('productBarcodes', options.productBarcodes.join(','));
  if (options?.limit) params.append('limit', String(options.limit));

  const res = await fetch(`${API_URL}/routes/suggestions?${params}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    return { data: [], meta: { total: 0 } };
  }
  return res.json();
}


export async function printRouteLabel(routeId: string): Promise<string> {
  const res = await fetch(`${API_URL}/routes/${routeId}/print-label`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to print label');
  }
  return res.text();
}

// Bulk Process API - Toplu Faturalama ve Etiketleme

export interface BulkProcessResult {
  processed: number;
  total: number;
  errors: string[];
  results: Array<{
    orderId: string;
    orderNumber: string;
    invoiceCreated: boolean;
    invoiceNumber?: string;
    labelFetched: boolean;
    labelType?: 'aras' | 'dummy';
    error?: string;
  }>;
}

export async function bulkProcessRoute(routeId: string): Promise<ApiResponse<BulkProcessResult>> {
  const res = await fetch(`${API_URL}/routes/${routeId}/bulk-process`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Toplu işlem başarısız');
  }
  return res.json();
}

export interface RouteLabelsResult {
  zplContent: string;
  htmlContent?: string;
  orderCount: number;
}

export async function getRouteLabelsZpl(routeId: string): Promise<ApiResponse<RouteLabelsResult>> {
  const res = await fetch(`${API_URL}/routes/${routeId}/labels/print`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Etiketler alınamadı');
  }
  return res.json();
}

export async function markRouteOrdersAsPacked(routeId: string): Promise<ApiResponse<{ updated: number; errors: string[] }>> {
  const res = await fetch(`${API_URL}/routes/${routeId}/mark-packed`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Siparişler paketlendi olarak işaretlenemedi');
  }
  return res.json();
}

// Packing API

export interface PackingSession {
  id: string;
  routeId: string;
  route?: Route;
  userId: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  currentOrderId: string | null;
  stationId: string | null;
  startedAt: string;
  completedAt: string | null;
  totalOrders: number;
  packedOrders: number;
  items?: PackingOrderItem[];
}

export interface PackingOrderItem {
  id: string;
  sessionId: string;
  orderId: string;
  order?: Order;
  barcode: string;
  requiredQuantity: number;
  scannedQuantity: number;
  isComplete: boolean;
  scannedAt: string | null;
  sequence: number;
}

export async function startPackingSession(routeId: string, stationId?: string): Promise<ApiResponse<PackingSession>> {
  const res = await fetch(`${API_URL}/packing/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ routeId, stationId }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to start packing session');
  }
  return res.json();
}

export async function getPackingSession(id: string): Promise<ApiResponse<PackingSession>> {
  const res = await fetch(`${API_URL}/packing/session/${id}`, {
    credentials: 'include',
  });
  return res.json();
}

export async function getCurrentPackingOrder(sessionId: string): Promise<ApiResponse<any>> {
  const res = await fetch(`${API_URL}/packing/session/${sessionId}/current-order`, {
    credentials: 'include',
  });
  return res.json();
}

export async function scanPackingBarcode(sessionId: string, barcode: string): Promise<{
  success: boolean;
  message: string;
  data: { item?: PackingOrderItem; orderComplete?: boolean; nextOrderId?: string };
}> {
  const res = await fetch(`${API_URL}/packing/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ sessionId, barcode }),
  });
  return res.json();
}

export interface OrderConsumableInput {
  consumableId: string;
  quantity: number;
}

export async function completePackingOrder(
  sessionId: string,
  orderId: string,
  consumables?: OrderConsumableInput[]
): Promise<{
  success: boolean;
  message: string;
  data: { sessionComplete?: boolean; nextOrderId?: string };
}> {
  const res = await fetch(`${API_URL}/packing/complete-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ sessionId, orderId, consumables }),
  });
  return res.json();
}

export async function cancelPackingSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_URL}/packing/session/${sessionId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// Picking API

export interface PickingItem {
  barcode: string;
  productName: string;
  shelfLocation?: string;
  totalQuantity: number;
  pickedQuantity: number;
  isComplete: boolean;
  orders: {
    orderId: string;
    orderNumber: string;
    quantity: number;
  }[];
}

export interface PickingProgress {
  routeId: string;
  routeName: string;
  status: RouteStatus;
  totalItems: number;
  pickedItems: number;
  totalOrders: number;
  items: PickingItem[];
  isComplete: boolean;
}

export async function getPickingProgress(routeId: string): Promise<ApiResponse<PickingProgress>> {
  const res = await fetch(`${API_URL}/picking/progress/${routeId}`, {
    credentials: 'include',
  });
  return res.json();
}

export async function scanPickingBarcode(routeId: string, barcode: string, quantity: number = 1): Promise<{
  success: boolean;
  message: string;
  data: { item?: PickingItem; progress?: PickingProgress };
}> {
  const res = await fetch(`${API_URL}/picking/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ routeId, barcode, quantity }),
  });
  return res.json();
}

export async function bulkScanPicking(routeId: string, barcodes: string[]): Promise<{
  success: boolean;
  message: string;
  data: { scanned: number; failed: string[]; progress: PickingProgress };
}> {
  const res = await fetch(`${API_URL}/picking/bulk-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ routeId, barcodes }),
  });
  return res.json();
}

export async function completePickingManually(routeId: string): Promise<ApiResponse<PickingProgress>> {
  const res = await fetch(`${API_URL}/picking/complete/${routeId}`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

export async function resetPicking(routeId: string): Promise<ApiResponse<PickingProgress>> {
  const res = await fetch(`${API_URL}/picking/reset/${routeId}`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}
// Definitions API

// Brands
export interface Brand {
  id: string;
  name: string;
  isActive: boolean;
}

export async function getBrands(): Promise<ApiResponse<Brand[]>> {
  const res = await fetch(`${API_URL}/brands`, { credentials: 'include' });
  return res.json();
}

export async function createBrand(data: { name: string; isActive?: boolean }): Promise<ApiResponse<Brand>> {
  const res = await fetch(`${API_URL}/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateBrand(id: string, data: { name?: string; isActive?: boolean }): Promise<ApiResponse<Brand>> {
  const res = await fetch(`${API_URL}/brands/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteBrand(id: string): Promise<ApiResponse<void>> {
  const res = await fetch(`${API_URL}/brands/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// Categories
export interface Category {
  id: string;
  name: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  isActive: boolean;
}

export async function getCategories(): Promise<ApiResponse<Category[]>> {
  const res = await fetch(`${API_URL}/categories`, { credentials: 'include' });
  return res.json();
}

export async function createCategory(data: { name: string; parentId?: string | null; isActive?: boolean }): Promise<ApiResponse<Category>> {
  const res = await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateCategory(id: string, data: { name?: string; parentId?: string | null; isActive?: boolean }): Promise<ApiResponse<Category>> {
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteCategory(id: string): Promise<ApiResponse<void>> {
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// Packing Materials
export enum PackingMaterialType {
  BOX = 'BOX',
  ENVELOPE = 'ENVELOPE',
  TAPE = 'TAPE',
  BUBBLE_WRAP = 'BUBBLE_WRAP',
  OTHER = 'OTHER'
}

export interface PackingMaterial {
  id: string;
  name: string;
  type: PackingMaterialType;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export async function getPackingMaterials(): Promise<ApiResponse<PackingMaterial[]>> {
  const res = await fetch(`${API_URL}/packing-materials`, { credentials: 'include' });
  return res.json();
}

export async function createPackingMaterial(data: { name: string; type: PackingMaterialType; stockQuantity: number; lowStockThreshold?: number; isActive?: boolean }): Promise<ApiResponse<PackingMaterial>> {
  const res = await fetch(`${API_URL}/packing-materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updatePackingMaterial(id: string, data: { name?: string; type?: PackingMaterialType; stockQuantity?: number; lowStockThreshold?: number; isActive?: boolean }): Promise<ApiResponse<PackingMaterial>> {
  const res = await fetch(`${API_URL}/packing-materials/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deletePackingMaterial(id: string): Promise<ApiResponse<void>> {
  const res = await fetch(`${API_URL}/packing-materials/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// Consumables API
export enum ConsumableType {
  BOX = 'BOX',
  BAG = 'BAG',
  TAPE = 'TAPE',
  LABEL = 'LABEL',
  OTHER = 'OTHER',
}

export enum ConsumableUnit {
  COUNT = 'COUNT',
  METER = 'METER',
  KILOGRAM = 'KILOGRAM',
}

export interface Consumable {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  type: ConsumableType;
  unit: ConsumableUnit;
  stockQuantity: number;
  averageCost: number;
  minStockLevel: number;
  isActive: boolean;
  parentId: string | null;
  parent?: Consumable | null;
  variants?: Consumable[];
  conversionQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export async function getConsumables(): Promise<ApiResponse<Consumable[]>> {
  const res = await fetch(`${API_URL}/consumables`, { credentials: 'include' });
  return res.json();
}

export async function createConsumable(data: {
  name: string;
  sku?: string;
  barcode?: string;
  type: ConsumableType;
  unit: ConsumableUnit;
  minStockLevel?: number;
  parentId?: string;
  conversionQuantity?: number;
}): Promise<ApiResponse<Consumable>> {
  const res = await fetch(`${API_URL}/consumables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function updateConsumable(id: string, data: {
  name?: string;
  sku?: string;
  barcode?: string;
  type?: ConsumableType;
  unit?: ConsumableUnit;
  minStockLevel?: number;
  isActive?: boolean;
  parentId?: string | null;
  conversionQuantity?: number;
}): Promise<ApiResponse<Consumable>> {
  const res = await fetch(`${API_URL}/consumables/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

export async function deleteConsumable(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/consumables/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
}

export async function consumeFromParent(variantId: string, quantity: number): Promise<ApiResponse<Consumable>> {
  const res = await fetch(`${API_URL}/consumables/${variantId}/consume-from-parent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ quantity }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

// Dashboard API
export interface DashboardStats {
  todayOrders: number;
  failedInvoices: number;
  faultyOrders: number;
  unsuppliedOrders: number;
}

export async function getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  const res = await fetch(`${API_URL}/dashboard/stats`, { credentials: 'include' });
  return res.json();
}

// Returns API
export interface ReturnItem {
  id: string;
  claimItemId: string;
  productName: string;
  barcode: string;
  merchantSku: string;
  productColor: string;
  productSize: string;
  price: number;
  quantity: number;
  customerReasonName: string;
  customerNote: string;
  claimItemStatus: string;
  shelfType: 'NORMAL' | 'DAMAGED' | null;
  processedShelfId: string | null;
  processedQuantity: number;
  productId: string | null;
  product?: Product;
}

export interface Return {
  id: string;
  claimId: string;
  orderNumber: string;
  orderDate: string;
  claimDate: string;
  customerFirstName: string;
  customerLastName: string;
  cargoTrackingNumber: string;
  cargoTrackingLink: string;
  cargoProviderName: string;
  status: string;
  integrationStatus: string;
  shelfType: 'NORMAL' | 'DAMAGED' | null;
  processedAt: string | null;
  storeId: string;
  store?: Store;
  items: ReturnItem[];
  createdAt: string;
  updatedAt: string;
}

export async function getReturns(
  page = 1,
  limit = 10,
  filters?: { status?: string; storeId?: string; search?: string }
): Promise<PaginationResponse<Return>> {
  const url = new URL(`${API_URL}/returns`, BASE_URL);
  url.searchParams.append('page', String(page));
  url.searchParams.append('limit', String(limit));
  if (filters?.status) url.searchParams.append('status', filters.status);
  if (filters?.storeId) url.searchParams.append('storeId', filters.storeId);
  if (filters?.search) url.searchParams.append('search', filters.search);

  const res = await fetch(url.toString(), { cache: 'no-store', credentials: 'include' });
  return res.json();
}

export async function getReturn(id: string): Promise<ApiResponse<Return>> {
  const res = await fetch(`${API_URL}/returns/${id}`, { cache: 'no-store', credentials: 'include' });
  return res.json();
}

export async function syncReturns(storeId: string): Promise<ApiResponse<{ synced: number }>> {
  const res = await fetch(`${API_URL}/returns/sync/${storeId}`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

export async function approveReturn(id: string): Promise<ApiResponse<void>> {
  const res = await fetch(`${API_URL}/returns/${id}/approve`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

export async function rejectReturn(
  id: string,
  data: { reasonId: string; description: string }
): Promise<ApiResponse<void>> {
  const res = await fetch(`${API_URL}/returns/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function processReturn(
  id: string,
  data: {
    items: Array<{
      returnItemId: string;
      shelfId: string;
      shelfType: 'NORMAL' | 'DAMAGED';
      quantity: number;
      notes?: string;
    }>;
    userId?: string;
    notes?: string;
  }
): Promise<ApiResponse<Return>> {
  const res = await fetch(`${API_URL}/returns/${id}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getReturnRejectReasons(): Promise<ApiResponse<Array<{ id: string; name: string }>>> {
  const res = await fetch(`${API_URL}/returns/reject-reasons`, { credentials: 'include' });
  return res.json();
}

export interface Shelf {
  id: string;
  name: string;
  barcode: string;
  type: 'NORMAL' | 'DAMAGED' | 'PACKING' | 'PICKING' | 'RECEIVING' | 'RETURN' | 'RETURN_DAMAGED';
  warehouseId: string;
  parentId: string | null;
  isSellable: boolean;
  isPickable: boolean;
  isShelvable: boolean;
}

export async function getShelves(page?: number, limit?: number, type?: string): Promise<PaginationResponse<Shelf>> {
  const url = new URL(`${API_URL}/shelves`, BASE_URL);
  if (page) url.searchParams.append('page', String(page));
  if (limit) url.searchParams.append('limit', String(limit));
  if (type) url.searchParams.append('type', type);
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  const json = await res.json();
  // API returns { success: true, data: { data: [...], meta: {...} } } or { success: true, data: [...] }
  if (Array.isArray(json)) {
    return { success: true, data: json, meta: { page: 1, limit: json.length, total: json.length, totalPages: 1 } };
  }
  if (json?.data) {
    return { success: true, data: Array.isArray(json.data) ? json.data : json.data.data || [], meta: json.data.meta || json.meta || { page: 1, limit: 100, total: 0, totalPages: 1 } };
  }
  return { success: true, data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 1 } };
}

// Reshipment
export async function reshipOrder(
  orderId: string,
  data: {
    items: { itemId: string; quantity: number }[];
    cargoTrackingNumber: string;
    needsInvoice: boolean;
  }
): Promise<ApiResponse<Order>> {
  const res = await fetch(`${API_URL}/orders/${orderId}/reship`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Yeniden gönderim başarısız');
  }
  return res.json();
}
