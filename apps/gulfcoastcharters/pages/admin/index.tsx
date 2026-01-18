import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createPagesBrowserClient();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCaptains: 0,
    totalBookings: 0,
    totalPoints: 0,
    activeCampaigns: 0
  });

  useEffect(() => {
    // Require login for admin pages.
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
    });

    // TODO: Fetch real stats from API
    // For now, placeholder data
    setStats({
      totalUsers: 127,
      totalCaptains: 18,
      totalBookings: 342,
      totalPoints: 45600,
      activeCampaigns: 2
    });
  }, [router, supabase]);

  return (
    <>
      <Head>
        <title>Admin Dashboard - Gulf Coast Charters</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard title="Total Users" value={stats.totalUsers} icon="👥" />
            <StatCard title="Captains" value={stats.totalCaptains} icon="⚓" />
            <StatCard title="Bookings" value={stats.totalBookings} icon="📅" />
            <StatCard title="Total Points" value={stats.totalPoints.toLocaleString()} icon="⭐" />
            <StatCard title="Active Campaigns" value={stats.activeCampaigns} icon="📧" />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ActionCard
              title="Admin Login"
              description="Sign in/out of the admin session"
              icon="🔐"
              onClick={() => router.push('/admin/login')}
            />
            <ActionCard
              title="Email Campaigns"
              description="Send T-shirt votes, announcements, and more"
              icon="📧"
              onClick={() => router.push('/admin/campaigns')}
            />
            <ActionCard
              title="User Management"
              description="View and manage users and captains"
              icon="👥"
              onClick={() => router.push('/admin/users')}
            />
            <ActionCard
              title="Points System"
              description="Award points, view transactions"
              icon="⭐"
              onClick={() => router.push('/admin/points')}
            />
            <ActionCard
              title="Bookings"
              description="View and manage all bookings"
              icon="📅"
              onClick={() => router.push('/admin/bookings')}
            />
            <ActionCard
              title="Content Moderation"
              description="Review message boards and media"
              icon="🛡️"
              onClick={() => router.push('/admin/moderation')}
            />
            <ActionCard
              title="Analytics"
              description="View platform analytics and reports"
              icon="📊"
              onClick={() => router.push('/admin/analytics')}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}

function ActionCard({ title, description, icon, onClick }: { title: string; description: string; icon: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}
