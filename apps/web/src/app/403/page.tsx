import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
        <div className="pt-4">
          <Link href="/">
            <Button>Ana Sayfaya Dön</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
