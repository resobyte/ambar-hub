'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  closeMobileMenu: () => void;
  openMobileMenu: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

function getStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  
  // On mobile, always start closed
  if (window.innerWidth < 768) return true;
  
  // On desktop, check localStorage
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  
  // Default: open on desktop
  return false;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Start with false (expanded) to match server render, then update after hydration
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration to avoid SSR mismatch - read localStorage only after mount
  useEffect(() => {
    setIsCollapsedState(getStoredCollapsed());
    setIsHydrated(true);
  }, []);

  // Persist collapsed state to localStorage (desktop only)
  useEffect(() => {
    if (!isHydrated) return;
    
    // Only persist on desktop
    if (window.innerWidth >= 768) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
    }
  }, [isCollapsed, isHydrated]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsedState((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        toggleCollapsed,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        closeMobileMenu,
        openMobileMenu,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextType {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
