'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { logout } from '@/lib/actions/auth';
import { RouteConfig } from '@/types';
import { useSidebar } from '@/components/common/SidebarProvider';

interface SidebarProps {
  routes: RouteConfig[];
  currentPath: string;
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  account: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export function Sidebar({ routes, currentPath, isMobileMenuOpen, onMobileMenuClose }: SidebarProps) {
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  const isActive = (path: string) => currentPath.startsWith(path);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col bg-card border-r border-border shadow-sm transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`p-4 h-16 flex items-center border-b border-border ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <h1 className="text-xl font-bold font-rubik tracking-wide text-primary truncate">AdminPanel</h1>
          )}
          {isCollapsed && (
            <h1 className="text-xl font-bold font-rubik tracking-wide text-primary">AP</h1>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${isCollapsed ? 'hidden' : 'block'}`}
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        
        {isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(false)}
            className="w-full flex justify-center py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
          {routes.map((route) => (
            <Link
              key={route.path}
              href={route.path}
              title={isCollapsed ? route.label : undefined}
              className={`flex items-center w-full rounded-lg transition-all duration-200 group relative ${
                isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
              } ${
                isActive(route.path) 
                  ? 'bg-[rgba(128,0,32,0.1)] text-primary font-semibold' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className={`${!isCollapsed && 'mr-3'} shrink-0`}>{route.icon && iconMap[route.icon]}</span>
              
              {!isCollapsed && (
                <span className="whitespace-nowrap overflow-hidden transition-all duration-300">
                  {route.label}
                </span>
              )}

              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  {route.label}
                </div>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <button 
            onClick={handleLogout}
            disabled={isPending}
            title={isCollapsed ? "Logout" : undefined}
            className={`flex items-center w-full rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group relative disabled:opacity-50 ${
              isCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
            }`}
          >
            {isPending ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className={`w-5 h-5 ${!isCollapsed && 'mr-3'} shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
            {!isCollapsed && <span>Logout</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={onMobileMenuClose} 
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-card border-r border-border text-foreground z-50 transform transition-transform duration-300 md:hidden flex flex-col ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 h-16 flex justify-between items-center border-b border-border shrink-0">
          <h1 className="text-xl font-bold font-rubik text-primary">AdminPanel</h1>
          <button onClick={onMobileMenuClose} className="text-muted-foreground hover:text-foreground">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {routes.map((route) => (
            <Link
              key={route.path}
              href={route.path}
              onClick={onMobileMenuClose}
              className={`flex items-center w-full px-4 py-3 rounded-lg ${
                isActive(route.path) 
                  ? 'bg-[rgba(128,0,32,0.1)] text-primary font-semibold' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className="mr-3">{route.icon && iconMap[route.icon]}</span>
              {route.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border shrink-0">
          <button 
            onClick={handleLogout}
            disabled={isPending}
            className="flex items-center w-full px-4 py-3 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg disabled:opacity-50"
          >
            {isPending ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-3" />
            ) : (
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
