export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type ApiListResponse<T> = ApiResponse<T[]>;

export type ApiPagination = {
  page: number;
  limit: number;
  total: number;
};

export type PaginatedApiResponse<T> = ApiResponse<T[]> & {
  pagination: ApiPagination;
};
