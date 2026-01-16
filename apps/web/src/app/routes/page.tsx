import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { RoutesClient } from './RoutesClient';
import { redirect } from 'next/navigation';

export default async function RoutesPage() {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/routes">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <RoutesClient />
            </Suspense>
        </AppLayout>
    );
}
