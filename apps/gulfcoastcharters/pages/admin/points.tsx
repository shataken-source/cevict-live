import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export default function AdminPointsPage() {
  const router = useRouter();
  const supabase = createPagesBrowserClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
    });
    setLoading(false);
  }, [router, supabase]);

  return (
    <>
      <Head>
        <title>Points System - Gulf Coast Charters</title>
      </Head>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Points System</h1>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Back to Dashboard
            </button>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">Points system management interface coming soon.</p>
            <p className="text-sm text-gray-500 mt-2">
              Use the points-rewards-system Supabase function for point operations.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
