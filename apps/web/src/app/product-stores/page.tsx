import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ProductStoresClient } from './ProductStoresClient';
import { redirect } from 'next/navigation';

export default async function ProductStoresPage() {
  const user = await getServerUser();

  if (!user || user.role !== Role.PLATFORM_OWNER) {
    redirect('/403');
  }

  return (
    <AppLayout user={user} currentPath="/product-stores">
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <ProductStoresClient />
      </Suspense>
    </AppLayout>
  );
}
