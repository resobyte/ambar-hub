import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { PickingClient } from './PickingClient';
import { redirect } from 'next/navigation';

export default async function PickingPage() {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/picking">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <PickingClient />
            </Suspense>
        </AppLayout>
    );
}
