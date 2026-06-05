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
      'Access-Control-Allow-Headers':
        'Content-Type,Authorization,X-Device-Id,X-Tenant-Id,X-Site-Id,X-Device-Platform,X-Device-Manufacturer,X-Device-Model,X-Android-Sdk,X-Device-Latitude,X-Device-Longitude,X-Device-Ip',
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
      'Access-Control-Allow-Headers':
        'Content-Type,Authorization,X-Device-Id,X-Tenant-Id,X-Site-Id,X-Device-Platform,X-Device-Manufacturer,X-Device-Model,X-Android-Sdk,X-Device-Latitude,X-Device-Longitude,X-Device-Ip',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
    },
    body: '',
  };
}
