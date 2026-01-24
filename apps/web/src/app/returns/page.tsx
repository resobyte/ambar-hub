import { AppLayout } from '@/components/layouts/AppLayout';
import { getServerUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ReturnsClient } from './ReturnsClient';

export default async function ReturnsPage() {
    const user = await getServerUser();
    if (!user) redirect('/login');

    return (
        <AppLayout user={user} currentPath="/returns">
            <ReturnsClient />
        </AppLayout>
    );
}
