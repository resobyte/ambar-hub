'use client';

import { useEffect } from 'react';
import { Button } from '@/components/common/Button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-destructive">Hata</h1>
          <h2 className="text-2xl font-semibold">Bir şeyler yanlış gitti</h2>
          <p className="text-muted-foreground max-w-md">
            Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin veya sorun devam ederse destek ekibiyle iletişime geçin.
          </p>
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>Tekrar Dene</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Ana Sayfaya Dön
          </Button>
        </div>
      </div>
    </div>
  );
}
