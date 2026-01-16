import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { PackingClient } from './PackingClient';
import { redirect } from 'next/navigation';

export default async function PackingPage() {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/packing">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <PackingClient />
            </Suspense>
        </AppLayout>
    );
}
