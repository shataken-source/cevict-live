/**
 * Avatar Shop Page
 * Browse and purchase avatar items with points
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import AvatarShop from '../../src/components/avatar/AvatarShop';
import { getUserPoints } from '@/lib/avatar-helpers';

export default function AvatarShopPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.replace('/admin/login?redirect=/avatar/shop');
        return;
      }
      setUser(currentUser);
      const points = await getUserPoints(currentUser.id);
      setUserPoints(points);
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <>
      <Head>
        <title>Avatar Shop | GCC</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Avatar Shop</h1>
                <p className="text-gray-600">Customize your avatar with points earned from community engagement</p>
              </div>
              <a
                href="/message-board"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                ← Back to Message Board
              </a>
            </div>
          </div>

          <AvatarShop
            userId={user.id}
            userPoints={userPoints}
            onPointsChange={(newPoints) => {
              setUserPoints(newPoints);
            }}
          />
        </div>
      </div>
    </>
  );
}
