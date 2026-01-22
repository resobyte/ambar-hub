import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { CreateOrderClient } from './CreateOrderClient';
import { redirect } from 'next/navigation';

export default async function CreateOrderPage() {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/orders/create">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <CreateOrderClient />
            </Suspense>
        </AppLayout>
    );
}
