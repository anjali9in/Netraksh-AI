export type GpsCoordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
};

export type DeviceLocationContext = {
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  altitude?: number;
  ipAddress?: string;
  locationCapturedAt?: string;
};

export type LocationPermissionState =
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';

export type AppPermissionSummary = {
  notifications: LocationPermissionState;
  location: LocationPermissionState;
};
