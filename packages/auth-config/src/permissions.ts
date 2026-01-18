import { Role, RouteConfig } from '@repo/types';

export const ROUTE_PERMISSIONS: RouteConfig[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
  },
  // Depo & Stok
  {
    path: '/warehouses',
    label: 'Depolar',
    icon: 'warehouse',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Depo & Stok',
  },
  {
    path: '/shelves',
    label: 'Raflar',
    icon: 'shelf',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Depo & Stok',
  },
  {
    path: '/products',
    label: 'Ürünler',
    icon: 'products',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Depo & Stok',
  },
  // Sipariş İşlemleri
  {
    path: '/orders',
    label: 'Siparişler',
    icon: 'orders',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Sipariş İşlemleri',
  },
  {
    path: '/invoices',
    label: 'Faturalar',
    icon: 'invoice',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Sipariş İşlemleri',
  },
  {
    path: '/routes',
    label: 'Rotalar',
    icon: 'route',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Sipariş İşlemleri',
  },
  {
    path: '/picking',
    label: 'Toplama',
    icon: 'picking',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Sipariş İşlemleri',
  },
  {
    path: '/packing',
    label: 'Paketleme',
    icon: 'package',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Sipariş İşlemleri',
  },
  {
    path: '/faulty-orders',
    label: 'Hatalı Siparişler',
    icon: 'error',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Sipariş İşlemleri',
  },
  // Satın Alma
  {
    path: '/suppliers',
    label: 'Tedarikçiler',
    icon: 'supplier',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Satın Alma',
  },
  {
    path: '/purchases',
    label: 'Satın Alma',
    icon: 'purchase',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Satın Alma',
  },
  // Entegrasyonlar
  {
    path: '/stores',
    label: 'Mağazalar',
    icon: 'store',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Entegrasyonlar',
  },
  {
    path: '/integrations',
    label: 'Entegrasyonlar',
    icon: 'integration',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Entegrasyonlar',
  },
  {
    path: '/shippings',
    label: 'Kargo',
    icon: 'shipping',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Entegrasyonlar',
  },
  // Ayarlar
  {
    path: '/definitions',
    label: 'Tanımlamalar',
    icon: 'settings',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Ayarlar',
  },
  {
    path: '/users',
    label: 'Kullanıcılar',
    icon: 'users',
    roles: [Role.PLATFORM_OWNER],
    showInSidebar: true,
    group: 'Ayarlar',
  },
  {
    path: '/account',
    label: 'Hesabım',
    icon: 'account',
    roles: [Role.PLATFORM_OWNER, Role.OPERATION],
    showInSidebar: true,
    group: 'Ayarlar',
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
