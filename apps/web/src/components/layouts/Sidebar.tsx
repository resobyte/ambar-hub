'use client';

import Link from 'next/link';
import { useTransition, useState } from 'react';
import { logout } from '@/lib/actions/auth';
import { RouteConfig } from '@/types';
import { useSidebar } from '@/components/common/SidebarProvider';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  routes: RouteConfig[];
  currentPath: string;
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-5 h-5" />,
  users: <Users className="w-5 h-5" />,
  warehouse: <Warehouse className="w-5 h-5" />,
  store: <ShoppingBag className="w-5 h-5" />,
  integration: <Link2 className="w-5 h-5" />,
  products: <Package className="w-5 h-5" />,
  shipping: <Truck className="w-5 h-5" />,
  account: <Settings className="w-5 h-5" />,
  orders: <ShoppingCart className="w-5 h-5" />,
  error: <AlertTriangle className="w-5 h-5" />,
  shelf: <Archive className="w-5 h-5" />,
  supplier: <UsersRound className="w-5 h-5" />,
  purchase: <ClipboardList className="w-5 h-5" />,
  route: <Route className="w-5 h-5" />,
  package: <PackageOpen className="w-5 h-5" />,
  picking: <ClipboardCheck className="w-5 h-5" />,
  invoice: <FileText className="w-5 h-5" />,
  settings: <Settings className="w-5 h-5" />,
};

type GroupedRoutes = {
  [key: string]: RouteConfig[];
};

export function Sidebar({ routes, currentPath, isMobileMenuOpen, onMobileMenuClose }: SidebarProps) {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isPending, startTransition] = useTransition();

  // Group routes
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
      // Custom sort order if needed, otherwise alphabetical or defined order
      const order = ['Sipariş İşlemleri', 'Depo & Stok', 'Satın Alma', 'Entegrasyonlar', 'Ayarlar'];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    });

  // State for collapsible groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Sipariş İşlemleri': true,
    'Depo & Stok': true,
    'Satın Alma': false,
    'Entegrasyonlar': false,
    'Ayarlar': false
  });

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  const isActive = (path: string) => currentPath.startsWith(path);

  const renderRouteLink = (route: RouteConfig, collapsed: boolean) => {
    const isItemActive = isActive(route.path);
    return (
      <Link
        key={route.path}
        href={route.path}
        onClick={isMobileMenuOpen ? onMobileMenuClose : undefined}
        className={cn(
          "flex items-center w-full rounded-lg transition-all duration-200 group relative",
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
          isItemActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <span className={cn(!collapsed && 'mr-3', 'shrink-0')}>
          {route.icon && iconMap[route.icon]}
        </span>
        {!collapsed && (
          <span className="whitespace-nowrap overflow-hidden text-sm">
            {route.label}
          </span>
        )}
        {collapsed && (
          <span className="sr-only">{route.label}</span>
        )}
      </Link>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-card border-r border-border shadow-sm transition-all duration-300 ease-in-out",
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header content unchanged */}
        <div className={cn(
          "h-16 flex items-center border-b border-border shrink-0",
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}>
          {!isCollapsed && (
            <h1 className="text-xl font-bold font-rubik tracking-wide text-primary truncate">AmbarHub</h1>
          )}
          {isCollapsed && (
            <h1 className="text-xl font-bold font-rubik tracking-wide text-primary">AH</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn("h-8 w-8 shrink-0", isCollapsed && 'hidden')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Expand button */}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="w-full rounded-none h-10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-3">
          <nav className="space-y-4">
            {/* Dashboard Link (Always visible) */}
            {dashboardRoute && (
              isCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    {renderRouteLink(dashboardRoute, true)}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {dashboardRoute.label}
                  </TooltipContent>
                </Tooltip>
              ) : (
                renderRouteLink(dashboardRoute, false)
              )
            )}

            {!isCollapsed && <Separator className="my-2" />}

            {/* Groups */}
            {otherGroups.map(([groupName, groupRoutes]) => {
              if (groupRoutes.length === 0) return null;

              if (isCollapsed) {
                return (
                  <div key={groupName} className="space-y-1">
                    <div className="h-px bg-border my-2 mx-2" />
                    {groupRoutes.map(route => (
                      <Tooltip key={route.path} delayDuration={0}>
                        <TooltipTrigger asChild>
                          {renderRouteLink(route, true)}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10}>
                          {route.label}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                );
              }

              return (
                <Collapsible
                  key={groupName}
                  open={openGroups[groupName]}
                  onOpenChange={() => toggleGroup(groupName)}
                  className="space-y-1"
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between p-2 h-auto font-medium hover:bg-muted text-foreground"
                    >
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">{groupName}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200 text-muted-foreground",
                          !openGroups[groupName] && "-rotate-90"
                        )}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pl-1">
                    {groupRoutes.map(route => renderRouteLink(route, false))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <Separator />
        <div className="p-2">
          {/* Logout logic similar to before */}
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleLogout} disabled={isPending} className="w-full h-10">
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Çıkış Yap</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" onClick={handleLogout} disabled={isPending} className="w-full justify-start px-3 text-red-500 hover:text-red-600 hover:bg-red-50">
              {isPending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-3" />
              ) : (
                <LogOut className="h-4 w-4 mr-3" />
              )}
              Çıkış Yap
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Menu Overlay & Sidebar - Kept simpler for mobile for now but can be updated similarly if needed */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onMobileMenuClose} />
      )}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 md:hidden flex flex-col",
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-16 flex justify-between items-center border-b border-border px-4 shrink-0">
          <h1 className="text-xl font-bold font-rubik text-primary">AmbarHub</h1>
          <Button variant="ghost" size="icon" onClick={onMobileMenuClose}><X className="h-5 w-5" /></Button>
        </div>
        <ScrollArea className="flex-1 px-4 py-4">
          <nav className="space-y-6">
            {dashboardRoute && renderRouteLink(dashboardRoute, false)}

            {otherGroups.map(([groupName, groupRoutes]) => (
              <div key={groupName} className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{groupName}</h3>
                <div className="space-y-1">
                  {groupRoutes.map(route => renderRouteLink(route, false))}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" onClick={handleLogout} disabled={isPending} className="w-full justify-start px-3 text-red-500 hover:text-red-600 hover:bg-red-50">
            {isPending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-3" />
            ) : (
              <LogOut className="h-4 w-4 mr-3" />
            )}
            Çıkış Yap
          </Button>
        </div>
      </aside>

    </TooltipProvider>
  );
}
