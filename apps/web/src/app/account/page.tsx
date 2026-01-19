import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { AppLayout } from '@/components/layouts/AppLayout';
import { AccountForm } from './AccountForm';

export default async function AccountPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <AppLayout user={user} currentPath="/account">
      <div className="max-w-2xl mx-auto space-y-6">


        <AccountForm user={user} />
      </div>
    </AppLayout>
  );
}
