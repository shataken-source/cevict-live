/**
 * Fishing Licenses Page
 * 
 * Route: /fishing-licenses
 * Allows users to purchase and view fishing licenses
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { CreditCard, FileText } from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import FishingLicensePurchase from '../src/components/FishingLicensePurchase';
import UserLicenses from '../src/components/UserLicenses';

export default function FishingLicensesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          router.push('/admin/login?redirect=/fishing-licenses');
          return;
        }
        setUser(session.user);
      } catch (error: any) {
        console.error('Auth error:', error);
        router.push('/admin/login?redirect=/fishing-licenses');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout session={null}>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Fishing Licenses</h1>
          <p className="text-gray-600">
            Purchase and manage your fishing licenses for Gulf Coast states
          </p>
        </div>

        <Tabs defaultValue="purchase" className="space-y-6">
          <TabsList>
            <TabsTrigger value="purchase">
              <CreditCard className="w-4 h-4 mr-2" />
              Purchase License
            </TabsTrigger>
            <TabsTrigger value="my-licenses">
              <FileText className="w-4 h-4 mr-2" />
              My Licenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="purchase">
            <FishingLicensePurchase
              userId={user.id}
              onSuccess={() => {
                // Refresh licenses list
                window.location.reload();
              }}
            />
          </TabsContent>

          <TabsContent value="my-licenses">
            <UserLicenses userId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
