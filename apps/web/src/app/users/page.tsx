import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Role } from '@/types';
import { UsersTable } from './UsersTable';

export default async function UsersPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/auth/login');
  }

  if (user.role !== Role.PLATFORM_OWNER) {
    redirect('/403');
  }

  return (
    <AppLayout user={user} currentPath="/users">
      <UsersTable />
    </AppLayout>
  );
}
