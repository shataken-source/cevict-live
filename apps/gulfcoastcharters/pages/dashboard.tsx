/**
 * User Dashboard Page
 * 
 * Route: /dashboard
 * Main user dashboard - shows different views for customers vs captains
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import CustomerDashboardOptimized from '../src/components/CustomerDashboardOptimized';
import CaptainDashboardOptimized from '../src/components/CaptainDashboardOptimized';
import { supabase } from '../src/lib/supabase';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<'customer' | 'captain' | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (!currentUser) {
          // Redirect to login if not authenticated
          router.push('/admin/login?redirect=/dashboard');
          return;
        }
        
        setUser(currentUser);

        // Check if user is a captain
        const { data: captainProfile } = await supabase
          .from('captain_profiles')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();

        if (captainProfile) {
          setUserType('captain');
        } else {
          setUserType('customer');
        }
      } catch (error: any) {
        console.error('Auth error:', error);
        toast.error('Please log in to view your dashboard');
        router.push('/admin/login?redirect=/dashboard');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-7xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  // Render appropriate dashboard based on user type
  return (
    <Layout session={null}>
      {userType === 'captain' ? (
        <CaptainDashboardOptimized />
      ) : (
        <CustomerDashboardOptimized />
      )}
    </Layout>
  );
}
