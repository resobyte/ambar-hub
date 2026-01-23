import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { OrderDetailClient } from './OrderDetailClient';
import { redirect } from 'next/navigation';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
    const user = await getServerUser();
    const { id } = await params;

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/orders">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <OrderDetailClient orderId={id} />
            </Suspense>
        </AppLayout>
    );
}
