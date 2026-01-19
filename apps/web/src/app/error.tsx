'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-destructive/20">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            Bir şeyler yanlış gitti
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin veya sorun devam ederse destek ekibiyle iletişime geçin.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-left bg-gray-100 p-2 rounded overflow-auto max-h-32 text-red-800 font-mono">
              {error.message}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row justify-center pt-2">
          <Button onClick={reset} className="w-full sm:w-auto" variant="default">
            <RotateCcw className="w-4 h-4 mr-2" />
            Tekrar Dene
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="w-full sm:w-auto"
          >
            <Home className="w-4 h-4 mr-2" />
            Ana Sayfa
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
