'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6 p-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-destructive">Hata</h1>
              <h2 className="text-xl font-semibold text-foreground">Bir şeyler yanlış gitti</h2>
              <p className="text-muted-foreground max-w-md">
                Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin veya sorun devam ederse destek ekibiyle iletişime geçin.
              </p>
            </div>
            <Button onClick={reset} variant="default">
              <RotateCcw className="w-4 h-4 mr-2" />
              Tekrar Dene
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
