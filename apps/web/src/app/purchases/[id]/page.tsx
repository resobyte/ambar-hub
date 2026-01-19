import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { AppLayout } from '@/components/layouts/AppLayout';
import { PurchaseDetailClient } from './PurchaseDetailClient';
import { redirect } from 'next/navigation';

export default async function PurchaseDetailPage({ params }: { params: { id: string } }) {
    const user = await getServerUser();

    if (!user) {
        redirect('/auth/login');
    }

    return (
        <AppLayout user={user} currentPath="/purchases">
            <Suspense fallback={<div>Yükleniyor...</div>}>
                <PurchaseDetailClient id={params.id} />
            </Suspense>
        </AppLayout>
    );
}
