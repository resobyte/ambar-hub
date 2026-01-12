import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ProductsTable } from './ProductsTable';
import { redirect } from 'next/navigation';

export default async function ProductsPage() {
  const user = await getServerUser();

  if (!user || user.role !== Role.PLATFORM_OWNER) {
    redirect('/403');
  }

  return (
    <AppLayout user={user} currentPath="/products">
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <ProductsTable />
      </Suspense>
    </AppLayout>
  );
}
