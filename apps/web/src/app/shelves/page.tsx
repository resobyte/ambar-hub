import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { ShelvesList } from './ShelvesList';
import { redirect } from 'next/navigation';

export default async function ShelvesPage() {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/shelves">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <ShelvesList />
            </Suspense>
        </AppLayout>
    );
}
