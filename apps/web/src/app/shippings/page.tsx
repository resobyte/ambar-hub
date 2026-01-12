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
      <Suspense fallback={<div>Loading...</div>}>
        <ShippingTable />
      </Suspense>
    </AppLayout>
  );
}
