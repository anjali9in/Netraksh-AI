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

export const PROFILE_NAV_ITEM: NavItem = {
  route: ROUTES.PROFILE,
  label: 'Profile',
  icon: 'user',
};
