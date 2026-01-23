'use client';

import { AuthUser } from '@/types';
import { getSidebarRoutesByRole } from '@/config/routes';
import { useSidebar } from '@/components/common/SidebarProvider';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  user: AuthUser;
  currentPath: string;
}

export function AppLayout({ children, user, currentPath }: AppLayoutProps) {
  const { closeMobileMenu, isMobileMenuOpen } = useSidebar();
  const routes = getSidebarRoutesByRole(user.role);

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      <Sidebar
        routes={routes}
        currentPath={currentPath}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={closeMobileMenu}
      />
      <main className="flex-1 overflow-auto p-6 md:p-8 bg-muted/20">
        {children}
      </main>
    </div>
  );
}
