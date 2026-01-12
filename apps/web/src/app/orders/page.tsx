import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { OrdersClient } from './OrdersClient';
import { redirect } from 'next/navigation';

export default async function OrdersPage() {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/orders">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <OrdersClient />
            </Suspense>
        </AppLayout>
    );
}
