/**
 * Bookings Dashboard Page
 * 
 * Route: /bookings
 * Displays user's booking dashboard with all bookings
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import CustomerDashboardOptimized from '../../src/components/CustomerDashboardOptimized';
import { supabase } from '../../src/lib/supabase';
import { toast } from 'sonner';

export default function BookingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (!currentUser) {
          // Redirect to login if not authenticated
          router.push('/admin/login?redirect=/bookings');
          return;
        }
        
        setUser(currentUser);
      } catch (error: any) {
        console.error('Auth error:', error);
        toast.error('Please log in to view your bookings');
        router.push('/admin/login?redirect=/bookings');
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
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <Layout session={null}>
      <CustomerDashboardOptimized />
    </Layout>
  );
}
