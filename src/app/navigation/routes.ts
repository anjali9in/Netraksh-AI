export const ROUTES = {
  HOME: 'Home',
  ENROLLMENT: 'Enrollment',
  ENROLLMENT_CAPTURE: 'EnrollmentCapture',
  AUTHENTICATION: 'Authentication',
  OFFLINE_LOGS: 'OfflineLogs',
  BENCHMARK: 'Benchmark',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
  SUPPORT: 'Support',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

export type RootStackParamList = {
  [ROUTES.HOME]: undefined;
  [ROUTES.ENROLLMENT]: undefined;
  [ROUTES.ENROLLMENT_CAPTURE]: {
    employeeId: string;
    fullName: string;
    contact: string;
    email: string;
  };
  [ROUTES.AUTHENTICATION]: undefined;
  [ROUTES.OFFLINE_LOGS]: undefined;
  [ROUTES.BENCHMARK]: undefined;
  [ROUTES.PROFILE]: undefined;
  [ROUTES.SETTINGS]: undefined;
  [ROUTES.SUPPORT]: undefined;
};
