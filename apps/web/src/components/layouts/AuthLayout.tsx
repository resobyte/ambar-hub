interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border">
        <div className="bg-primary p-8 text-center">
          <h1 className="text-3xl font-bold text-white font-rubik mb-2">AmbarHUB</h1>
          <p className="text-white/80">Yönetim Paneli&apos;ne ulaşmak için giriş yapın.</p>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

