import axios from 'axios';

export type NormalizedApiError = {
  message: string;
  status?: number;
  code?: string;
  isNetworkError: boolean;
  originalError?: unknown;
};

type ApiErrorBody = {
  message?: unknown;
  error?: unknown;
  code?: unknown;
};

export const OFFLINE_ERROR_CODE = 'OFFLINE';

export function createOfflineApiError(): NormalizedApiError {
  return {
    message: 'No internet connection. Please try again when online.',
    code: OFFLINE_ERROR_CODE,
    isNetworkError: true,
  };
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (isNormalizedApiError(error)) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return {
      message:
        error instanceof Error ? error.message : 'Unexpected error occurred.',
      isNetworkError: false,
      originalError: error,
    };
  }

  const status = error.response?.status;
  const responseData = error.response?.data as ApiErrorBody | undefined;
  const code = getErrorCode(responseData, error.code);
  const isTimeout = code === 'ECONNABORTED' || code === 'ETIMEDOUT';
  const isNetworkError = !error.response || error.message === 'Network Error';

  return {
    message: getErrorMessage({
      responseData,
      fallback: error.message,
      status,
      isTimeout,
      isNetworkError,
    }),
    status,
    code,
    isNetworkError,
    originalError: error,
  };
}

function isNormalizedApiError(error: unknown): error is NormalizedApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'isNetworkError' in error
  );
}

function getErrorCode(
  responseData: ApiErrorBody | undefined,
  fallback?: string,
): string | undefined {
  return typeof responseData?.code === 'string' ? responseData.code : fallback;
}

function getErrorMessage(params: {
  responseData: ApiErrorBody | undefined;
  fallback: string;
  status?: number;
  isTimeout: boolean;
  isNetworkError: boolean;
}): string {
  const {responseData, fallback, status, isTimeout, isNetworkError} = params;

  if (typeof responseData?.message === 'string') {
    return responseData.message;
  }

  if (typeof responseData?.error === 'string') {
    return responseData.error;
  }

  if (isTimeout) {
    return 'Request timed out. Please try again.';
  }

  if (status === 401) {
    return 'Session expired. Please log in again.';
  }

  if (status && status >= 500) {
    return 'Server error. Please try again later.';
  }

  if (isNetworkError) {
    return 'Network request failed. Please check your connection.';
  }

  return fallback || 'API request failed.';
}
