import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Role } from '@/types';
import { DefinitionsTabs } from './DefinitionsTabs';

export default async function DefinitionsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getServerUser();

    if (!user) {
        redirect('/auth/login');
    }

    if (user.role !== Role.PLATFORM_OWNER) {
        redirect('/403');
    }

    return (
        <AppLayout user={user} currentPath="/definitions">
            <div className="space-y-6">


                <DefinitionsTabs />

                <div className="min-h-[400px]">
                    {children}
                </div>
            </div>
        </AppLayout>
    );
}
