import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth';
import { AppLayout } from '@/components/layouts/AppLayout';
import { InfoCard } from '@/components/common/InfoCard';
import { Role } from '@/types';

export default async function DashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect('/auth/login');
  }

  if (user.role !== Role.PLATFORM_OWNER) {
    redirect('/403');
  }

  return (
    <AppLayout user={user} currentPath="/dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground font-rubik">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Overview of your system performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <InfoCard
            title="Total Users"
            value="1,234"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            trend={{ value: 12, isPositive: true }}
          />
          <InfoCard
            title="Active Sessions"
            value="56"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            trend={{ value: 4.3, isPositive: true }}
          />
          <InfoCard
            title="Pending Tasks"
            value="23"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            trend={{ value: 2.1, isPositive: false }}
          />
          <InfoCard
            title="System Health"
            value="98%"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            }
            trend={{ value: 5, isPositive: true }}
          />
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-bold mb-4 text-foreground">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center p-3 hover:bg-muted/50 rounded-lg transition-colors">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground mr-3 text-xs font-bold">
                  U{i}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">New user registered</p>
                  <p className="text-xs text-muted-foreground">{i * 2} minutes ago</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-sm text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors">
            View All Activity
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
