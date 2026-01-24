import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { StoreDetailClient } from './StoreDetailClient';
import { redirect } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

export default async function StoreDetailPage({ params }: PageProps) {
  const user = await getServerUser();

  if (!user || user.role !== Role.PLATFORM_OWNER) {
    redirect('/403');
  }

  return (
    <AppLayout user={user} currentPath="/stores">
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <StoreDetailClient storeId={params.id} />
      </Suspense>
    </AppLayout>
  );
}
