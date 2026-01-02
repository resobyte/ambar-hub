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
        <div>
          <h2 className="text-3xl font-bold text-foreground font-rubik">Account Settings</h2>
          <p className="text-muted-foreground mt-1">Manage your profile and security settings.</p>
        </div>

        <AccountForm user={user} />
      </div>
    </AppLayout>
  );
}
