import { AppLayout } from '@/components/layouts/AppLayout';
import { getServerUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReturnDetailClient } from './ReturnDetailClient';

export default async function ReturnDetailPage({ params }: { params: { id: string } }) {
    const user = await getServerUser();
    if (!user) redirect('/login');

    return (
        <AppLayout user={user} currentPath="/returns">
            <ReturnDetailClient id={params.id} userId={user.id} />
        </AppLayout>
    );
}
