import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCaptains: 0,
    totalBookings: 0,
    totalPoints: 0,
    activeCampaigns: 0
  });

  useEffect(() => {
    // Require login; use same client as login page so session is shared. Always send redirect=/admin.
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login?redirect=' + encodeURIComponent('/admin'));
    });

    async function loadStats() {
      try {
        const [usersRes, campaignsRes] = await Promise.all([
          fetch('/api/admin/users').catch(() => null),
          fetch('/api/admin/campaigns').catch(() => null),
        ]);
        
        let totalUsers = 0;
        let activeCampaigns = 0;
        
        if (usersRes?.ok) {
          const usersData = await usersRes.json();
          totalUsers = usersData.users?.length || 0;
        }
        
        if (campaignsRes?.ok) {
          const campaignsData = await campaignsRes.json();
          activeCampaigns = campaignsData.campaigns?.filter((c: any) => c.status === 'sending' || c.status === 'draft').length || 0;
        }
        
        setStats({
          totalUsers,
          totalCaptains: 0,
          totalBookings: 0,
          totalPoints: 0,
          activeCampaigns
        });
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    }
    
    loadStats();
  }, [router]);

  return (
    <>
      <Head>
        <title>Admin Dashboard - Gulf Coast Charters</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

          {/* Cross-Platform Features Quick Links */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8 border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🔗 Cross-Platform Features</h2>
            <div className="flex flex-wrap gap-4">
              <a
                href="/test-cross-platform"
                className="bg-white px-4 py-2 rounded-lg shadow hover:shadow-md text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                🧪 Cross-Platform Test
              </a>
              <a
                href="/test-package-booking"
                className="bg-white px-4 py-2 rounded-lg shadow hover:shadow-md text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                🎁 Package Booking
              </a>
              <a
                href="/admin/review-moderation"
                className="bg-white px-4 py-2 rounded-lg shadow hover:shadow-md text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                ✍️ Review Moderation
              </a>
            </div>
          </div>

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
              title="SMS Campaigns"
              description="Send bulk SMS messages to subscribers"
              icon="💬"
              onClick={() => router.push('/admin/sms-campaigns')}
            />
            <ActionCard
              title="GPS Live Tracking"
              description="Enable and preview public captain location sharing"
              icon="🛰️"
              onClick={() => router.push('/admin/gps')}
            />
            <ActionCard
              title="Scraper"
              description="Configure and run boat discovery"
              icon="🔍"
              onClick={() => router.push('/admin/scraper')}
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
