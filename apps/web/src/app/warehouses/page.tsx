import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { WarehousesTable } from './WarehousesTable';
import { redirect } from 'next/navigation';

export default async function WarehousesPage() {
  const user = await getServerUser();

  if (!user || user.role !== Role.PLATFORM_OWNER) {
    redirect('/403');
  }

  return (
    <AppLayout user={user} currentPath="/warehouses">
      <Suspense fallback={<div>Loading...</div>}>
        <WarehousesTable />
      </Suspense>
    </AppLayout>
  );
}
