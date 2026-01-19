import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { RouteCreateClient } from './RouteCreateClient';
import { redirect } from 'next/navigation';

export default async function RouteCreatePage() {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/routes">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <RouteCreateClient />
            </Suspense>
        </AppLayout>
    );
}
