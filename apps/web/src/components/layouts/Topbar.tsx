import { AuthUser } from '@/types';
import { ThemeToggle } from '@/components/common/ThemeToggle';

interface TopbarProps {
  user: AuthUser;
  onMobileMenuOpen: () => void;
}

export function Topbar({ user, onMobileMenuOpen }: TopbarProps) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 shadow-sm">
      <button
        className="md:hidden text-muted-foreground hover:text-foreground"
        onClick={onMobileMenuOpen}
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      <div className="flex items-center space-x-2 md:space-x-4">
        <ThemeToggle />
        <button className="relative text-muted-foreground hover:text-primary transition-colors p-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors text-sm">
          {initials}
        </div>
      </div>
    </header>
  );
}
