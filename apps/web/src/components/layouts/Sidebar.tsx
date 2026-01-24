'use client';

import Link from 'next/link';
import { useTransition, useState } from 'react';
import { logout } from '@/lib/actions/auth';
import { RouteConfig } from '@/types';
import { useSidebar } from '@/components/common/SidebarProvider';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  Warehouse,
  ShoppingBag,
  Link2,
  Package,
  Truck,
  Settings,
  ShoppingCart,
  AlertTriangle,
  Archive,
  UsersRound,
  ClipboardList,
  Route,
  PackageOpen,
  ClipboardCheck,
  FileText,
  LogOut,
  X,
  Contact,
  Menu,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/common/ThemeToggle';

interface SidebarProps {
  routes: RouteConfig[];
  currentPath: string;
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  warehouse: <Warehouse className="w-4 h-4" />,
  store: <ShoppingBag className="w-4 h-4" />,
  integration: <Link2 className="w-4 h-4" />,
  link: <Link2 className="w-4 h-4" />,
  products: <Package className="w-4 h-4" />,
  shipping: <Truck className="w-4 h-4" />,
  account: <Settings className="w-4 h-4" />,
  orders: <ShoppingCart className="w-4 h-4" />,
  plus: <ShoppingCart className="w-4 h-4" />,
  error: <AlertTriangle className="w-4 h-4" />,
  shelf: <Archive className="w-4 h-4" />,
  supplier: <UsersRound className="w-4 h-4" />,
  purchase: <ClipboardList className="w-4 h-4" />,
  route: <Route className="w-4 h-4" />,
  package: <PackageOpen className="w-4 h-4" />,
  picking: <ClipboardCheck className="w-4 h-4" />,
  invoice: <FileText className="w-4 h-4" />,
  settings: <Settings className="w-4 h-4" />,
  customer: <Contact className="w-4 h-4" />,
  return: <RotateCcw className="w-4 h-4" />,
};

type GroupedRoutes = {
  [key: string]: RouteConfig[];
};

export function Sidebar({ routes, currentPath, isMobileMenuOpen, onMobileMenuClose }: SidebarProps) {
  const { openMobileMenu } = useSidebar();
  const [isPending, startTransition] = useTransition();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const groupedRoutes = routes.reduce<GroupedRoutes>((acc, route) => {
    const groupName = route.group || 'Diğer';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(route);
    return acc;
  }, {});

  const dashboardRoute = routes.find(r => r.path === '/dashboard');
  const otherGroups = Object.entries(groupedRoutes)
    .filter(([group]) => group !== 'Diğer')
    .sort((a, b) => {
      const order = ['Sipariş İşlemleri', 'Operasyon', 'Depo & Stok', 'Satın Alma', 'Entegrasyonlar', 'Ayarlar'];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  const isActive = (path: string) => currentPath.startsWith(path);

  const renderMobileRouteLink = (route: RouteConfig) => {
    const isItemActive = isActive(route.path);
    return (
      <Link
        key={route.path}
        href={route.path}
        onClick={onMobileMenuClose}
        className={cn(
          "flex items-center w-full rounded-lg transition-all duration-200 px-3 py-2",
          isItemActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <span className="mr-3 shrink-0">
          {route.icon && iconMap[route.icon]}
        </span>
        <span className="whitespace-nowrap overflow-hidden text-sm">
          {route.label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Topbar */}
      <header className="hidden md:flex h-14 bg-card border-b border-border items-center px-6 shadow-sm shrink-0">
        {/* Logo */}
        <Link href="/dashboard" className="shrink-0">
          <h1 className="text-xl font-bold font-rubik tracking-wide text-primary">AmbarHub</h1>
        </Link>

        {/* Separator */}
        <div className="h-6 w-px bg-border mx-6" />

        {/* Navigation - Centered */}
        <nav className="flex-1 flex items-center justify-center gap-6">
          {/* Dashboard */}
          {dashboardRoute && (
            <Link
              href={dashboardRoute.path}
              className={cn(
                "inline-flex items-center gap-2 h-9 px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive(dashboardRoute.path) && "bg-accent text-accent-foreground"
              )}
            >
              {dashboardRoute.icon && iconMap[dashboardRoute.icon]}
              {dashboardRoute.label}
            </Link>
          )}

          {/* Grouped Routes with Dropdowns */}
          {otherGroups.map(([groupName, groupRoutes]) => {
            if (groupRoutes.length === 0) return null;

            const hasActiveRoute = groupRoutes.some(route => isActive(route.path));
            const isOpen = openDropdown === groupName;

            return (
              <div
                key={groupName}
                className="relative"
                onMouseEnter={() => setOpenDropdown(groupName)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <DropdownMenu open={isOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "inline-flex items-center gap-1 h-9 px-4 py-2 text-sm font-medium rounded-md transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none",
                        hasActiveRoute && "bg-accent text-accent-foreground"
                      )}
                    >
                      {groupName}
                      <ChevronDown className={cn(
                        "h-3 w-3 opacity-50 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-52 p-2">
                    {groupRoutes.map((route) => (
                      <DropdownMenuItem key={route.path} asChild className="py-2.5 px-3">
                        <Link
                          href={route.path}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer",
                            isActive(route.path) && "bg-primary/10 text-primary font-semibold"
                          )}
                        >
                          {route.icon && iconMap[route.icon]}
                          {route.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isPending}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span className="hidden lg:inline">Çıkış</span>
          </Button>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden h-14 bg-card border-b border-border flex items-center justify-between px-4 shadow-sm shrink-0">
        <Link href="/dashboard">
          <h1 className="text-xl font-bold font-rubik tracking-wide text-primary">AmbarHub</h1>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={openMobileMenu}
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileMenuClose} />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 md:hidden flex flex-col",
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-14 flex justify-between items-center border-b border-border px-4 shrink-0">
          <h1 className="text-xl font-bold font-rubik text-primary">AmbarHub</h1>
          <Button variant="ghost" size="icon" onClick={onMobileMenuClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="space-y-6">
            {dashboardRoute && renderMobileRouteLink(dashboardRoute)}

            {otherGroups.map(([groupName, groupRoutes]) => (
              <div key={groupName} className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{groupName}</h3>
                <div className="space-y-1">
                  {groupRoutes.map(route => renderMobileRouteLink(route))}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={handleLogout}
            disabled={isPending}
            className="w-full justify-start px-3 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-3" />
            ) : (
              <LogOut className="h-4 w-4 mr-3" />
            )}
            Çıkış Yap
          </Button>
        </div>
      </aside>
    </>
  );
}
