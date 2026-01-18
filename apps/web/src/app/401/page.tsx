import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">401</h1>
          <h2 className="text-2xl font-semibold">Yetkisiz Giriş</h2>
          <p className="text-muted-foreground max-w-md">
            Bu sayfaya erişmek için giriş yapmalısınız. Lütfen devam etmek için oturum açın.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Giriş Yap
        </Link>
      </div>
    </div>
  );
}
