import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">403</h1>
          <h2 className="text-2xl font-semibold">Erişim Reddedildi</h2>
          <p className="text-muted-foreground max-w-md">
            Bu sayfaya erişim izniniz yok. Bunun bir hata olduğunu düşünüyorsanız yöneticinizle iletişime geçin.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}
