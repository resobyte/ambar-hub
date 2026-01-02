import { ApiResponse, ErrorResponse, PaginationResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

class ApiError extends Error {
  statusCode: number;
  error?: string;

  constructor(message: string, statusCode: number, error?: string) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ErrorResponse;
    throw new ApiError(
      errorData.message || 'An error occurred',
      errorData.statusCode || response.status,
      errorData.error
    );
  }

  return data;
}

function buildUrl(endpoint: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_URL}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

export async function apiGet<T>(
  endpoint: string,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options || {};
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
    ...fetchOptions,
  });

  return handleResponse<ApiResponse<T>>(response);
}

export async function apiGetPaginated<T>(
  endpoint: string,
  options?: FetchOptions
): Promise<PaginationResponse<T>> {
  const { params, ...fetchOptions } = options || {};
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
    ...fetchOptions,
  });

  return handleResponse<PaginationResponse<T>>(response);
}

export async function apiPost<T, D = unknown>(
  endpoint: string,
  data?: D,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options || {};
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...fetchOptions,
  });

  return handleResponse<ApiResponse<T>>(response);
}

export async function apiPatch<T, D = unknown>(
  endpoint: string,
  data?: D,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options || {};
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
    ...fetchOptions,
  });

  return handleResponse<ApiResponse<T>>(response);
}

export async function apiDelete<T>(
  endpoint: string,
  options?: FetchOptions
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options || {};
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
    ...fetchOptions,
  });

  return handleResponse<ApiResponse<T>>(response);
}

export { ApiError };
