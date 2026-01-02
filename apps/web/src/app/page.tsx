import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { getDefaultRouteByRole } from '@/config/routes';

export default async function HomePage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/auth/login');
  }

  redirect(getDefaultRouteByRole(user.role));
}
