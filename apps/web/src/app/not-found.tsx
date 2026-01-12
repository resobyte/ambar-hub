import Link from 'next/link';
import { Button } from '@/components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold">Sayfa Bulunamadı</h2>
          <p className="text-muted-foreground max-w-md">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>
        </div>
        <Link href="/">
          <Button>Ana Sayfaya Dön</Button>
        </Link>
      </div>
    </div>
  );
}
