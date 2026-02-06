/**
 * Review Moderation Page
 * Simple admin page to approve/reject reviews
 * /admin/review-moderation
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface Review {
  id: string;
  user_id: string;
  review_type: string;
  rating: number;
  title?: string;
  content?: string;
  status: string;
  platform: string;
  created_at: string;
}

export default function ReviewModerationPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    // Check auth
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/admin/login');
      } else {
        loadReviews();
      }
    });
  }, [router, filter]);

  const loadReviews = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials');
        return;
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      let query = supabaseAdmin
        .from('unified_reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading reviews:', error);
      } else {
        setReviews(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReviewStatus = async (reviewId: string, newStatus: 'approved' | 'rejected' | 'hidden') => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!supabaseUrl || !supabaseServiceKey) return;

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      const { error } = await supabaseAdmin
        .from('unified_reviews')
        .update({ status: newStatus })
        .eq('id', reviewId);

      if (error) {
        console.error('Error updating review:', error);
        alert('Failed to update review status');
      } else {
        loadReviews(); // Reload
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update review status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading reviews...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Review Moderation | GCC Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold mb-2">Review Moderation</h1>
            <p className="text-gray-600">Approve or reject cross-platform reviews</p>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)} ({reviews.filter(r => f === 'all' || r.status === f).length})
                </button>
              ))}
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.filter(r => filter === 'all' || r.status === filter).map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold">⭐ {review.rating}/5</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        review.status === 'approved' ? 'bg-green-100 text-green-800' :
                        review.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {review.status}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {review.platform}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                        {review.review_type}
                      </span>
                    </div>
                    {review.title && (
                      <h3 className="font-semibold text-lg mb-1">{review.title}</h3>
                    )}
                    {review.content && (
                      <p className="text-gray-700 mb-2">{review.content}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Review ID: {review.id.substring(0, 8)}... • Created: {new Date(review.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {review.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => updateReviewStatus(review.id, 'approved')}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => updateReviewStatus(review.id, 'rejected')}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      ❌ Reject
                    </button>
                    <button
                      onClick={() => updateReviewStatus(review.id, 'hidden')}
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                      👁️ Hide
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {reviews.filter(r => filter === 'all' || r.status === filter).length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">No reviews found with status "{filter}"</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
