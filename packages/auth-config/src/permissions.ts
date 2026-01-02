import { Role, RouteConfig } from '@repo/types';

export const ROUTE_PERMISSIONS: RouteConfig[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
  },
  {
    path: '/users',
    label: 'Users',
    icon: 'users',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
  },
  {
    path: '/account',
    label: 'Account',
    icon: 'account',
    roles: [Role.PLATFORM_OWNER, Role.OPERATION],
    showInSidebar: true,
  },
];

export const PUBLIC_ROUTES = ['/auth/login'] as const;

export function getRoutesByRole(role: Role): RouteConfig[] {
  return ROUTE_PERMISSIONS.filter((route) => route.roles.includes(role));
}

export function getSidebarRoutesByRole(role: Role): RouteConfig[] {
  return ROUTE_PERMISSIONS.filter(
    (route) => route.roles.includes(role) && route.showInSidebar
  );
}

export function isRouteAllowed(path: string, role: Role): boolean {
  const route = ROUTE_PERMISSIONS.find((r) => path.startsWith(r.path));
  if (!route) return false;
  return route.roles.includes(role);
}

export function getDefaultRouteByRole(role: Role): string {
  if (role === Role.PLATFORM_OWNER) {
    return '/dashboard';
  }
  return '/account';
}

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((route) => path.startsWith(route));
}
