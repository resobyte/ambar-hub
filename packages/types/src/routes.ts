import { Role } from './role';

export interface RouteConfig {
  path: string;
  label: string;
  icon?: string;
  roles: Role[];
  showInSidebar: boolean;
  group?: string;
}
