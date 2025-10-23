export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, string[]>;
}

export interface ApiErrorResponse {
  data: ApiError;
}