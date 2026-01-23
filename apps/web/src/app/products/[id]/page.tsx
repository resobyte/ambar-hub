import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ProductDetailClient } from './ProductDetailClient';
import { redirect } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default async function ProductDetailPage({ params }: Props) {
  const user = await getServerUser();

  if (!user || user.role !== Role.PLATFORM_OWNER) {
    redirect('/403');
  }

  return (
    <AppLayout user={user} currentPath={`/products/${params.id}`}>
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <ProductDetailClient productId={params.id} />
      </Suspense>
    </AppLayout>
  );
}
