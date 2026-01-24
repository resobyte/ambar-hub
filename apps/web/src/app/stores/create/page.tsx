import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { StoreDetailClient } from '../[id]/StoreDetailClient';
import { redirect } from 'next/navigation';

export default async function CreateStorePage() {
  const user = await getServerUser();

  if (!user || user.role !== Role.PLATFORM_OWNER) {
    redirect('/403');
  }

  return (
    <AppLayout user={user} currentPath="/stores">
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <StoreDetailClient storeId={null} />
      </Suspense>
    </AppLayout>
  );
}
