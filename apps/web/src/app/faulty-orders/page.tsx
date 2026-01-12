import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { FaultyOrdersTable } from './FaultyOrdersTable';
import { redirect } from 'next/navigation';

export default async function FaultyOrdersPage() {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/faulty-orders">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <FaultyOrdersTable />
            </Suspense>
        </AppLayout>
    );
}
