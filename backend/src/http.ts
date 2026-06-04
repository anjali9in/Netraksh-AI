export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export function jsonResponse<T>(statusCode: number, body: ApiResponse<T>) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

export function emptyOptionsResponse() {
  return {
    statusCode: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
    },
    body: '',
  };
}
