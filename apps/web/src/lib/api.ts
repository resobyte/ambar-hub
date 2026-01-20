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

export interface Store {
  id: string;
  name: string;
  proxyUrl: string;
  warehouseId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Integration {
  id: string;
  name: string;
  type: 'TRENDYOL' | 'HEPSIBURADA' | 'IKAS';
  apiUrl: string;
  isActive: boolean;
  storeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationStore {
  id: string;
  integrationId: string;
  storeId: string;
  storeName?: string;
  shippingProviderId: string | null;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  crawlIntervalMinutes: number;
  sendStock: boolean;
  sendPrice: boolean;
  sendOrderStatus: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Şirket Konfigürasyonu
  brandCode?: string;
  companyCode?: string;
  branchCode?: string;
  coCode?: string;

  // Fatura Ayarları
  invoiceTransactionCode?: string;
  hasMicroExport?: boolean;
  eArchiveBulkCustomer?: boolean;
  eArchiveCardCode?: string;
  eArchiveHavaleCardCode?: string;
  eArchiveAccountCode?: string;
  eArchiveHavaleAccountCode?: string;
  eArchiveSerialNo?: string;
  eArchiveSequenceNo?: string;
  eInvoiceBulkCustomer?: boolean;
  eInvoiceCardCode?: string;
  eInvoiceAccountCode?: string;
  eInvoiceHavaleAccountCode?: string;
  eInvoiceSerialNo?: string;
  eInvoiceSequenceNo?: string;
  bulkEArchiveSerialNo?: string;
  bulkEArchiveSequenceNo?: string;
  bulkEInvoiceSerialNo?: string;
  bulkEInvoiceSequenceNo?: string;
  refundExpenseVoucherEArchiveSerialNo?: string;
  refundExpenseVoucherEArchiveSequenceNo?: string;
  refundExpenseVoucherEInvoiceSerialNo?: string;
  refundExpenseVoucherEInvoiceSequenceNo?: string;
  microExportTransactionCode?: string;
  microExportAccountCode?: string;
  microExportAzAccountCode?: string;
  microExportEArchiveSerialNo?: string;
  microExportEArchiveSequenceNo?: string;
  microExportBulkSerialNo?: string;
  microExportBulkSequenceNo?: string;
  microExportRefundSerialNo?: string;
  microExportRefundSequenceNo?: string;
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
  integrationId: string;
  integration: Integration;
  integrationStatus?: string;
  items: OrderItem[];
  storeSku: string | null;
  storeSalePrice: number | null;
  stockQuantity: number;
  sellableQuantity: number;
  reservableQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductIntegration {
  id: string;
  productStoreId: string;
  integrationId: string;
  integrationName?: string;
  integrationType?: string;
  integrationSalePrice: number | null;
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
export async function getStores(page = 1, limit = 10): Promise<PaginationResponse<Store>> {
  const res = await fetch(`${API_URL}/stores?page=${page}&limit=${limit}`, {
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

export async function createStore(data: { name: string; proxyUrl: string; warehouseId: string; isActive?: boolean }): Promise<ApiResponse<Store>> {
  const res = await fetch(`${API_URL}/stores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateStore(id: string, data: { name?: string; proxyUrl?: string; warehouseId?: string; isActive?: boolean }): Promise<ApiResponse<Store>> {
  const res = await fetch(`${API_URL}/stores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteStore(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/stores/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// Integration API
export async function getIntegrations(page = 1, limit = 10): Promise<PaginationResponse<Integration>> {
  const res = await fetch(`${API_URL}/integrations?page=${page}&limit=${limit}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return res.json();
}

export async function getIntegration(id: string): Promise<ApiResponse<Integration>> {
  const res = await fetch(`${API_URL}/integrations/${id}`, {
    cache: 'no-store',
    credentials: 'include',
  });
  return res.json();
}

export async function createIntegration(data: {
  name: string;
  type: 'TRENDYOL' | 'HEPSIBURADA' | 'IKAS';
  apiUrl: string;
  isActive?: boolean;
}): Promise<ApiResponse<Integration>> {
  const res = await fetch(`${API_URL}/integrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateIntegration(id: string, data: {
  name?: string;
  type?: 'TRENDYOL' | 'HEPSIBURADA' | 'IKAS';
  apiUrl?: string;
  isActive?: boolean;
}): Promise<ApiResponse<Integration>> {
  const res = await fetch(`${API_URL}/integrations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteIntegration(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/integrations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// IntegrationStore API
export async function getIntegrationStores(integrationId?: string): Promise<IntegrationStore[]> {
  const url = new URL(`${API_URL}/integration-stores`, BASE_URL);
  if (integrationId) {
    url.searchParams.append('integrationId', integrationId);
  }
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  const data = await res.json();
  // Handle both array response and wrapped response
  return Array.isArray(data) ? data : (data?.data || []);
}

export async function createIntegrationStore(data: {
  integrationId: string;
  storeId: string;
  shippingProviderId?: string;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  crawlIntervalMinutes: number;
  sendStock: boolean;
  sendPrice: boolean;
  sendOrderStatus: boolean;
  isActive?: boolean;
  // Şirket Konfigürasyonu
  brandCode?: string;
  companyCode?: string;
  branchCode?: string;
  coCode?: string;
  // Fatura Ayarları
  invoiceTransactionCode?: string;
  hasMicroExport?: boolean;
  eArchiveBulkCustomer?: boolean;
  eArchiveCardCode?: string;
  eArchiveHavaleCardCode?: string;
  eArchiveAccountCode?: string;
  eArchiveHavaleAccountCode?: string;
  eArchiveSerialNo?: string;
  eArchiveSequenceNo?: string;
  eInvoiceBulkCustomer?: boolean;
  eInvoiceCardCode?: string;
  eInvoiceAccountCode?: string;
  eInvoiceHavaleAccountCode?: string;
  eInvoiceSerialNo?: string;
  eInvoiceSequenceNo?: string;
  bulkEArchiveSerialNo?: string;
  bulkEArchiveSequenceNo?: string;
  bulkEInvoiceSerialNo?: string;
  bulkEInvoiceSequenceNo?: string;
  refundExpenseVoucherEArchiveSerialNo?: string;
  refundExpenseVoucherEArchiveSequenceNo?: string;
  refundExpenseVoucherEInvoiceSerialNo?: string;
  refundExpenseVoucherEInvoiceSequenceNo?: string;
  microExportTransactionCode?: string;
  microExportAccountCode?: string;
  microExportAzAccountCode?: string;
  microExportEArchiveSerialNo?: string;
  microExportEArchiveSequenceNo?: string;
  microExportBulkSerialNo?: string;
  microExportBulkSequenceNo?: string;
  microExportRefundSerialNo?: string;
  microExportRefundSequenceNo?: string;
}): Promise<ApiResponse<IntegrationStore>> {
  const res = await fetch(`${API_URL}/integration-stores`, {
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

export async function updateIntegrationStore(id: string, data: {
  shippingProviderId?: string;
  sellerId?: string;
  apiKey?: string;
  apiSecret?: string;
  crawlIntervalMinutes?: number;
  sendStock?: boolean;
  sendPrice?: boolean;
  sendOrderStatus?: boolean;
  isActive?: boolean;
  // Şirket Konfigürasyonu
  brandCode?: string;
  companyCode?: string;
  branchCode?: string;
  coCode?: string;
  // Fatura Ayarları
  invoiceTransactionCode?: string;
  hasMicroExport?: boolean;
  eArchiveBulkCustomer?: boolean;
  eArchiveCardCode?: string;
  eArchiveHavaleCardCode?: string;
  eArchiveAccountCode?: string;
  eArchiveHavaleAccountCode?: string;
  eArchiveSerialNo?: string;
  eArchiveSequenceNo?: string;
  eInvoiceBulkCustomer?: boolean;
  eInvoiceCardCode?: string;
  eInvoiceAccountCode?: string;
  eInvoiceHavaleAccountCode?: string;
  eInvoiceSerialNo?: string;
  eInvoiceSequenceNo?: string;
  bulkEArchiveSerialNo?: string;
  bulkEArchiveSequenceNo?: string;
  bulkEInvoiceSerialNo?: string;
  bulkEInvoiceSequenceNo?: string;
  refundExpenseVoucherEArchiveSerialNo?: string;
  refundExpenseVoucherEArchiveSequenceNo?: string;
  refundExpenseVoucherEInvoiceSerialNo?: string;
  refundExpenseVoucherEInvoiceSequenceNo?: string;
  microExportTransactionCode?: string;
  microExportAccountCode?: string;
  microExportAzAccountCode?: string;
  microExportEArchiveSerialNo?: string;
  microExportEArchiveSequenceNo?: string;
  microExportBulkSerialNo?: string;
  microExportBulkSequenceNo?: string;
  microExportRefundSerialNo?: string;
  microExportRefundSequenceNo?: string;
}): Promise<ApiResponse<IntegrationStore>> {
  const res = await fetch(`${API_URL}/integration-stores/${id}`, {
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

// Product API
export interface ProductFilters {
  name?: string;
  isActive?: string;
  brandId?: string;
  categoryId?: string;
}

export async function getProducts(page = 1, limit = 10, filters?: ProductFilters): Promise<PaginationResponse<Product>> {
  const url = new URL(`${API_URL}/products`, BASE_URL);
  url.searchParams.append('page', String(page));
  url.searchParams.append('limit', String(limit));

  if (filters?.name) url.searchParams.append('name', filters.name);
  if (filters?.isActive) url.searchParams.append('isActive', filters.isActive);
  if (filters?.brandId) url.searchParams.append('brandId', filters.brandId);
  if (filters?.categoryId) url.searchParams.append('categoryId', filters.categoryId);

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
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.data || []);
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

export async function deleteIntegrationStore(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/integration-stores/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

// ProductIntegration API
export async function getProductIntegrations(productStoreId?: string): Promise<ProductIntegration[]> {
  const url = new URL(`${API_URL}/product-integrations`, BASE_URL);
  if (productStoreId) {
    url.searchParams.append('productStoreId', productStoreId);
  }
  const res = await fetch(url.toString(), {
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

export async function createProductIntegration(data: {
  productStoreId: string;
  integrationId: string;
  integrationSalePrice?: number;
  isActive?: boolean;
}): Promise<ApiResponse<ProductIntegration>> {
  const res = await fetch(`${API_URL}/product-integrations`, {
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

export async function updateProductIntegration(id: string, data: {
  integrationSalePrice?: number;
  isActive?: boolean;
}): Promise<ApiResponse<ProductIntegration>> {
  const res = await fetch(`${API_URL}/product-integrations/${id}`, {
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

export async function deleteProductIntegration(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/product-integrations/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Request failed');
  }
  return res.json();
}

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
  district: string | null;
  address: string | null;
  tcIdentityNumber: string | null;
  trendyolCustomerId: string | null;
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
  PICKING = 'PICKING',
  INVOICED = 'INVOICED',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
  DELIVERED = 'DELIVERED',
  UNDELIVERED = 'UNDELIVERED',
  RETURNED = 'RETURNED',
  REPACK = 'REPACK',
  UNSUPPLIED = 'UNSUPPLIED',
  UNKNOWN = 'UNKNOWN',
}

export interface Order {
  id: string;
  orderNumber: string;
  integrationId: string;
  integration?: Integration;
  customerId: string;
  customer?: Customer;
  storeId?: string;
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

export interface Invoice {
  id: string;
  orderId: string;
  order?: Order;
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

export async function createRoute(data: { name?: string; description?: string; orderIds: string[] }): Promise<ApiResponse<Route>> {
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

export async function completePackingOrder(sessionId: string, orderId: string): Promise<{
  success: boolean;
  message: string;
  data: { sessionComplete?: boolean; nextOrderId?: string };
}> {
  const res = await fetch(`${API_URL}/packing/complete-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ sessionId, orderId }),
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
