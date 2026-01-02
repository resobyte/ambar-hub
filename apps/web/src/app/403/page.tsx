import Link from 'next/link';
import { Button } from '@/components/common/Button';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">403</h1>
          <h2 className="text-2xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            You don&apos;t have permission to access this page. Contact your administrator if you believe this is an error.
          </p>
        </div>
        <Link href="/">
          <Button>Go to Home</Button>
        </Link>
      </div>
    </div>
  );
}
