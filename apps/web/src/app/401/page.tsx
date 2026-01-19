import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
        <div className="pt-4">
          <Link href="/auth/login">
            <Button>Giriş Yap</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
