export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
}
