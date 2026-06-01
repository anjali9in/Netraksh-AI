export const ROUTES = {
  HOME: 'Home',
  ENROLLMENT: 'Enrollment',
  AUTHENTICATION: 'Authentication',
  OFFLINE_LOGS: 'OfflineLogs',
  BENCHMARK: 'Benchmark',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

export type RootStackParamList = {
  [ROUTES.HOME]: undefined;
  [ROUTES.ENROLLMENT]: undefined;
  [ROUTES.AUTHENTICATION]: undefined;
  [ROUTES.OFFLINE_LOGS]: undefined;
  [ROUTES.BENCHMARK]: undefined;
};
