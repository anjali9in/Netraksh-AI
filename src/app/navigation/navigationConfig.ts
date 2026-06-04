import type {ButtonIconName} from '../../components/icons/ButtonIcon';
import {ROUTES, type RouteName} from './routes';

export type NavItem = {
  route: RouteName;
  label: string;
  icon: ButtonIconName;
};

export const MAIN_NAV_ITEMS: NavItem[] = [
  {route: ROUTES.HOME, label: 'Home', icon: 'home'},
  {route: ROUTES.ENROLLMENT, label: 'Enroll', icon: 'userPlus'},
  {route: ROUTES.AUTHENTICATION, label: 'Auth', icon: 'shield'},
  {route: ROUTES.OFFLINE_LOGS, label: 'Logs', icon: 'logs'},
  {route: ROUTES.BENCHMARK, label: 'Bench', icon: 'chart'},
];

export const FOOTER_NAV_ITEMS: NavItem[] = [
  {route: ROUTES.PROFILE, label: 'Profile', icon: 'user'},
  {route: ROUTES.SETTINGS, label: 'Settings', icon: 'settings'},
];

export const ROUTE_TITLES: Record<RouteName, string> = {
  [ROUTES.HOME]: 'Home',
  [ROUTES.ENROLLMENT]: 'Enroll User',
  [ROUTES.ENROLLMENT_CAPTURE]: 'Face Capture',
  [ROUTES.AUTHENTICATION]: 'Authenticate',
  [ROUTES.OFFLINE_LOGS]: 'Offline Logs',
  [ROUTES.BENCHMARK]: 'Benchmark',
  [ROUTES.PROFILE]: 'Profile',
  [ROUTES.SETTINGS]: 'Settings',
};
