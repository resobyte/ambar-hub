import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { PurchasesList } from './PurchasesList';
import { redirect } from 'next/navigation';

export default async function PurchasesPage() {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/purchases">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <PurchasesList />
            </Suspense>
        </AppLayout>
    );
}
