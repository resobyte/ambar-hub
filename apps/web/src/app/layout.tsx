import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/common/ToastContext';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { SidebarProvider } from '@/components/common/SidebarProvider';

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-family',
});

export const metadata: Metadata = {
  title: 'Admin Panel',
  description: 'Administration Panel',
};

const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme-preference');
    var isDark = false;
    
    if (theme === 'dark') {
      isDark = true;
    } else if (theme === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className={`${rubik.variable} font-sans antialiased`}>
        <ThemeProvider>
          <SidebarProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
