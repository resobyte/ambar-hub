import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ShippingTable } from './ShippingTable';
import { redirect } from 'next/navigation';

export default async function ShippingPage() {
  const user = await getServerUser();

  if (!user || user.role !== Role.PLATFORM_OWNER) {
    redirect('/403');
  }

  return (
    <AppLayout user={user} currentPath="/shippings">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground font-rubik">Shipping</h2>
          <p className="text-muted-foreground mt-1">Manage shipping providers</p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <ShippingTable />
        </Suspense>
      </div>
    </AppLayout>
  );
}
