import { Suspense } from 'react';
import { getServerUser } from '@/lib/auth';
import { Role } from '@repo/types';
import { AppLayout } from '@/components/layouts/AppLayout';
import { RouteDetailClient } from './RouteDetailClient';
import { redirect } from 'next/navigation';

interface Props {
    params: { id: string };
}

export default async function RouteDetailPage({ params }: Props) {
    const user = await getServerUser();

    if (!user || user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/routes">
            <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div></div>}>
                <RouteDetailClient routeId={params.id} />
            </Suspense>
        </AppLayout>
    );
}
