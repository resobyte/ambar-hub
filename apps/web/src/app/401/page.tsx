import Link from 'next/link';
import { Button } from '@/components/common/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">401</h1>
          <h2 className="text-2xl font-semibold">Unauthorized</h2>
          <p className="text-muted-foreground max-w-md">
            You need to be logged in to access this page. Please sign in to continue.
          </p>
        </div>
        <Link href="/auth/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    </div>
  );
}
