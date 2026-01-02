'use client';

import { Button } from '@/components/common/Button';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-red-600">Error</h1>
              <h2 className="text-2xl font-semibold text-gray-900">Something went wrong</h2>
              <p className="text-gray-600 max-w-md">
                A critical error has occurred. Please try again.
              </p>
            </div>
            <Button onClick={reset}>Try Again</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
