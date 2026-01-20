import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import CustomersClient from './CustomersClient';
import { redirect } from 'next/navigation';

export default async function CustomersPage() {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/customers">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <CustomersClient />
            </Suspense>
        </AppLayout>
    );
}
