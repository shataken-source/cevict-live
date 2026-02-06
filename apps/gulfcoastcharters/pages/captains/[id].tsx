/**
 * Captain Profile Page
 * 
 * Route: /captains/[id]
 * Displays captain profile with booking options
 */

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import CaptainProfilePage from '../../src/components/CaptainProfilePage';
import { supabase } from '../../src/lib/supabase';
import { toast } from 'sonner';

export default function CaptainProfileRoute() {
  const router = useRouter();
  const { id } = router.query;
  const [captain, setCaptain] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function loadCaptain() {
      try {
        setLoading(true);
        setError(null);

        // Try to fetch from captain_profiles table first
        const { data: captainProfile, error: profileError } = await supabase
          .from('captain_profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          // If not found in captain_profiles, try captains table
          const { data: captainData, error: captainError } = await supabase
            .from('captains')
            .select('*')
            .eq('id', id)
            .single();

          if (captainError) {
            // Try fetching from boats/vessels if captain ID matches boat owner
            const { data: boatData, error: boatError } = await supabase
              .from('vessels')
              .select('*, captain_profiles(*)')
              .eq('id', id)
              .single();

            if (boatError) {
              throw new Error('Captain not found');
            }

            setCaptain({
              ...boatData,
              id: boatData.captain_profiles?.id || id,
              businessName: boatData.name,
              location: boatData.location || boatData.dock_location,
            });
          } else {
            setCaptain(captainData);
          }
        } else {
          setCaptain(captainProfile);
        }
      } catch (err: any) {
        console.error('Error loading captain:', err);
        setError(err.message || 'Failed to load captain profile');
        toast.error('Failed to load captain profile');
      } finally {
        setLoading(false);
      }
    }

    loadCaptain();
  }, [id]);

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-7xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !captain) {
    return (
      <Layout session={null}>
        <div className="max-w-7xl mx-auto p-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Captain Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The captain profile you are looking for does not exist.'}</p>
            <button
              onClick={() => router.push('/captains')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Browse All Captains
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout session={null}>
      <CaptainProfilePage captainId={id as string} />
    </Layout>
  );
}
