const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginationResponse<T> {
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
  const url = new URL(`${API_URL}${endpoint}`);
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

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  storeCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Store {
  id: string;
  name: string;
  proxyUrl: string;
  warehouseId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Integration {
  id: string;
  name: string;
  type: 'TRENDYOL' | 'HEPSIBURADA' | 'IKAS';
  apiUrl: string;
  isActive: boolean;
  storeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface IntegrationStore {
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
}

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  barcode: string | null;
  sku: string | null;
  vatRate: number;
  desi: number | null;
  purchasePrice: number | null;
  salePrice: number | null;
  lastSalePrice: number | null;
  isActive: boolean;
  storeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductStore {
  id: string;
  productId: string;
  storeId: string;
  storeName?: string;
  storeSku: string | null;
  storeSalePrice: number | null;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductIntegration {
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

interface ShippingProvider {
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
  const url = new URL(`${API_URL}/integration-stores`);
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
export async function getProducts(page = 1, limit = 10): Promise<PaginationResponse<Product>> {
  const res = await fetch(`${API_URL}/products?page=${page}&limit=${limit}`, {
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
  brand?: string;
  category?: string;
  barcode?: string;
  sku?: string;
  vatRate: number;
  desi?: number;
  purchasePrice?: number;
  salePrice?: number;
  lastSalePrice?: number;
  isActive?: boolean;
}): Promise<ApiResponse<Product>> {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateProduct(id: string, data: {
  name?: string;
  brand?: string;
  category?: string;
  barcode?: string;
  sku?: string;
  vatRate?: number;
  desi?: number;
  purchasePrice?: number;
  salePrice?: number;
  lastSalePrice?: number;
  isActive?: boolean;
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

// ProductStore API
export async function getProductStores(productId?: string): Promise<ProductStore[]> {
  const url = new URL(`${API_URL}/product-stores`);
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
  const url = new URL(`${API_URL}/product-integrations`);
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

