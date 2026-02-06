/**
 * Cross-Platform Integration Test Page
 * Simple page to test all the new cross-platform features
 */

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '@/lib/supabase';

interface SharedUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  gcc_active: boolean;
  wtv_active: boolean;
  total_points: number;
  loyalty_tier: string;
  created_at: string;
}

interface UnifiedBooking {
  id: string;
  booking_type: string;
  confirmation_code?: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface UnifiedReview {
  id: string;
  review_type: string;
  rating: number;
  title?: string;
  status: string;
  created_at: string;
}

export default function TestCrossPlatformPage() {
  const [user, setUser] = useState<any>(null);
  const [sharedUser, setSharedUser] = useState<SharedUser | null>(null);
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [reviews, setReviews] = useState<UnifiedReview[]>([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Check auth immediately
    checkAuth();
    
    // Also listen for auth state changes (in case user just logged in)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event, session?.user?.id);
      
      // Only handle SIGNED_IN if we don't already have a user
      if (event === 'SIGNED_IN' && session?.user && !user) {
        console.log('User signed in, loading data');
        setUser(session.user);
        setLoading(true);
        loadUserData().finally(() => {
          if (mounted) setLoading(false);
        });
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setLoading(false);
        setAuthChecked(false);
      }
      // Ignore other events to prevent unnecessary re-renders
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    // Only check once on mount
    if (authChecked) return;
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.warn('Auth check timeout - stopping loading');
      setAuthChecked(true);
      setLoading(false);
    }, 5000); // 5 second timeout
    
    try {
      // First try to get session (which might be in storage)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Test page session check:', { hasSession: !!session, sessionError });
      
      // Then try to get user
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      console.log('Test page auth check:', { hasUser: !!authUser, hasSession: !!session, error });
      
      clearTimeout(timeout);
      setAuthChecked(true);
      
      if ((authUser || session?.user) && !error) {
        console.log('User authenticated, loading data');
        const userToSet = authUser || session?.user;
        if (userToSet) {
          setUser(userToSet);
          // Load data but don't wait forever
          loadUserData().catch(err => {
            console.error('Error loading user data:', err);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } else {
        // Not logged in - just stop loading and show login prompt
        console.log('User not authenticated, showing login prompt');
        setLoading(false);
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error('Auth check error:', error);
      setAuthChecked(true);
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get current user if we don't have it yet
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (!currentUser || userError) {
        console.log('No user found in loadUserData:', userError);
        setLoading(false);
        return;
      }
      
      // Make sure user state is set
      if (!user || user.id !== currentUser.id) {
        console.log('Setting user in loadUserData:', currentUser.id);
        setUser(currentUser);
      }

      // Load shared user (with error handling)
      try {
        const { data: sharedUserData, error: sharedUserError } = await supabase
          .from('shared_users')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (sharedUserError) {
          console.warn('Error loading shared user (may not exist yet):', sharedUserError.message);
        } else if (sharedUserData) {
          setSharedUser(sharedUserData);
        }
      } catch (err) {
        console.warn('Exception loading shared user:', err);
      }

      // Load unified bookings (with error handling)
      try {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('unified_bookings')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (bookingsError) {
          console.warn('Error loading bookings:', bookingsError.message);
        } else if (bookingsData) {
          setBookings(bookingsData);
        }
      } catch (err) {
        console.warn('Exception loading bookings:', err);
      }

      // Load unified reviews (with error handling)
      try {
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('unified_reviews')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (reviewsError) {
          console.warn('Error loading reviews:', reviewsError.message);
        } else if (reviewsData) {
          setReviews(reviewsData);
        }
      } catch (err) {
        console.warn('Exception loading reviews:', err);
      }

      // Load loyalty transactions (with error handling)
      try {
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('loyalty_transactions')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (transactionsError) {
          console.warn('Error loading loyalty transactions:', transactionsError.message);
        } else if (transactionsData) {
          setLoyaltyTransactions(transactionsData);
        }
      } catch (err) {
        console.warn('Exception loading loyalty transactions:', err);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: `Error: ${error.message || 'Failed to load data'}` });
    } finally {
      setLoading(false);
    }
  };

  const testCreateBooking = async () => {
    if (!user) {
      setMessage({ type: 'error', text: 'Please log in first' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/unified-bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingData: {
            booking_type: 'boat_only',
            gcc_data: {
              vessel_id: '00000000-0000-0000-0000-000000000000', // Test ID
              trip_date: new Date().toISOString(),
              duration_hours: 4,
              passengers: 2,
              total: 400.00,
            },
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        const bookingAmount = data.booking.total_amount || 0;
        let pointsEarned = Math.floor(bookingAmount / 10);
        if (data.booking.is_package) {
          pointsEarned = Math.floor(pointsEarned * 1.5); // Package bonus
        }
        
        setMessage({ 
          type: 'success', 
          text: `Booking created! Code: ${data.booking.confirmation_code}${pointsEarned > 0 ? ` • Earned ${pointsEarned} loyalty points! ⭐` : ''}` 
        });
        // Wait a moment for points to be processed, then reload
        setTimeout(() => {
          loadUserData();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create booking' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const testCreateReview = async () => {
    if (!user) {
      setMessage({ type: 'error', text: 'Please log in first' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/unified-reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          reviewData: {
            review_type: 'gcc_vessel',
            platform: 'gcc',
            rating: 5,
            title: 'Test Review',
            content: 'This is a test review from the cross-platform test page.',
            gcc_vessel_id: '00000000-0000-0000-0000-000000000000', // Test ID
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: `Review created! ID: ${data.review.id.substring(0, 8)}... • Earned 10 loyalty points! ⭐` 
        });
        // Wait a moment for points to be processed, then reload
        setTimeout(() => {
          loadUserData();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create review' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only show login prompt if we've checked auth and confirmed no user
  if (!user && authChecked && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Cross-Platform Test</h1>
          <p className="text-gray-600 mb-6">Please log in to test cross-platform features</p>
          <a
            href="/admin/login?redirect=/test-cross-platform"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/admin/login?redirect=/test-cross-platform';
            }}
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }
  
  // If we have a user, show the main content
  if (!user) {
    // Still loading or checking auth
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Cross-Platform Integration Test | GCC</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold mb-2">Cross-Platform Integration Test</h1>
            <p className="text-gray-600">Test all the new cross-platform features</p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded ${
                message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Shared User Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Shared User Profile</h2>
            {sharedUser ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{sharedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold">
                    {sharedUser.first_name || 'N/A'} {sharedUser.last_name || ''}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Platform Activity</p>
                  <p className="font-semibold">
                    GCC: {sharedUser.gcc_active ? '✅' : '❌'} | WTV: {sharedUser.wtv_active ? '✅' : '❌'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Loyalty</p>
                  <p className="font-semibold text-lg">
                    {sharedUser.total_points} points ({sharedUser.loyalty_tier}) ⭐
                  </p>
                  {(() => {
                    const currentPoints = sharedUser.total_points;
                    let nextTier = '';
                    let pointsNeeded = 0;
                    let progressPercent = 0;
                    
                    if (currentPoints < 2500) {
                      nextTier = 'Silver';
                      pointsNeeded = 2500 - currentPoints;
                      progressPercent = (currentPoints / 2500) * 100;
                    } else if (currentPoints < 5000) {
                      nextTier = 'Gold';
                      pointsNeeded = 5000 - currentPoints;
                      progressPercent = ((currentPoints - 2500) / 2500) * 100;
                    } else if (currentPoints < 10000) {
                      nextTier = 'Platinum';
                      pointsNeeded = 10000 - currentPoints;
                      progressPercent = ((currentPoints - 5000) / 5000) * 100;
                    } else {
                      nextTier = 'Max';
                      pointsNeeded = 0;
                      progressPercent = 100;
                    }
                    
                    return (
                      <div className="mt-2">
                        {nextTier !== 'Max' ? (
                          <>
                            <p className="text-xs text-gray-600 mb-1">
                              {pointsNeeded} points until {nextTier} tier
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-green-600 font-semibold">
                            🏆 Maximum tier achieved!
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <p className="text-gray-600">No shared user profile found. It will be created automatically on first use.</p>
            )}
          </div>

          {/* Test Actions */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Test Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={testCreateBooking}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md border-2 border-blue-700"
                style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              >
                {loading ? 'Creating...' : 'Test Create Booking'}
              </button>
              <button
                onClick={testCreateReview}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md border-2 border-green-700"
                style={{ backgroundColor: '#16a34a', color: '#ffffff' }}
              >
                {loading ? 'Creating...' : 'Test Create Review'}
              </button>
              <button
                onClick={loadUserData}
                disabled={loading}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md border-2 border-gray-700"
                style={{ backgroundColor: '#4b5563', color: '#ffffff' }}
              >
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>

          {/* Unified Bookings */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Unified Bookings ({bookings.length})</h2>
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">
                          {booking.confirmation_code || booking.id.substring(0, 8)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Type: <span className="font-medium">{booking.booking_type}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Status: <span className={`font-medium ${
                            booking.status === 'confirmed' ? 'text-green-600' :
                            booking.status === 'pending' ? 'text-yellow-600' :
                            booking.status === 'cancelled' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {booking.status}
                          </span>
                          {booking.status === 'pending' && (
                            <span className="text-xs text-gray-500 ml-2">(awaiting payment)</span>
                          )}
                        </p>
                        <p className="text-sm font-semibold text-gray-800 mt-1">
                          Total: ${booking.total_amount.toFixed(2)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 ml-4">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No unified bookings yet. Create one using the test button above.</p>
            )}
          </div>

          {/* Unified Reviews */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Unified Reviews ({reviews.length})</h2>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">
                          {review.title || 'Untitled Review'} ⭐ {review.rating}/5
                        </p>
                        <p className="text-sm text-gray-600">
                          Type: {review.review_type} | Status: {review.status}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No unified reviews yet. Create one using the test button above.</p>
            )}
          </div>

          {/* Loyalty Points History */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Loyalty Points History ({loyaltyTransactions.length})</h2>
            {loyaltyTransactions.length > 0 ? (
              <div className="space-y-3">
                {loyaltyTransactions.map((transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            transaction.points > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.points > 0 ? '+' : ''}{transaction.points} points
                          </span>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                            {transaction.transaction_type}
                          </span>
                          <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                            {transaction.platform}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {transaction.description || `${transaction.source_type} transaction`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {transaction.source_type} • {new Date(transaction.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No loyalty transactions yet. Create bookings or reviews to earn points!</p>
            )}
          </div>

          {/* SSO Test Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">SSO (Single Sign-On) Test</h2>
            <p className="text-gray-600 mb-4">
              Test cross-platform authentication. Generate a token to switch to the other platform.
            </p>
            <div className="flex gap-4">
              <button
                onClick={async () => {
                  if (!user) {
                    setMessage({ type: 'error', text: 'Please log in first' });
                    return;
                  }
                  setLoading(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                      setMessage({ type: 'error', text: 'No active session' });
                      return;
                    }
                    const response = await fetch(`/api/sso/generate-token?platform=wtv`, {
                      headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                      },
                    });
                    const data = await response.json();
                    if (data.success) {
                      setMessage({ 
                        type: 'success', 
                        text: `SSO token generated! Redirect URL: ${data.redirect_url}` 
                      });
                    } else {
                      setMessage({ type: 'error', text: data.error || 'Failed to generate SSO token' });
                    }
                  } catch (error: any) {
                    setMessage({ type: 'error', text: `Error: ${error.message}` });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md border-2 border-purple-700"
                style={{ backgroundColor: '#9333ea', color: '#ffffff' }}
              >
                {loading ? 'Generating...' : 'Generate SSO Token (GCC → WTV)'}
              </button>
            </div>
          </div>

          {/* Points Redemption Test */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Points Redemption Test</h2>
            <p className="text-gray-600 mb-4">
              Test redeeming loyalty points for discounts. Current balance: {sharedUser?.total_points || 0} points
            </p>
            <div className="flex gap-4 items-center">
              <input
                type="number"
                id="redeemPoints"
                min="1"
                max={sharedUser?.total_points || 0}
                defaultValue="10"
                className="border rounded px-3 py-2 w-24"
                placeholder="Points"
              />
              <button
                onClick={async () => {
                  if (!user) {
                    setMessage({ type: 'error', text: 'Please log in first' });
                    return;
                  }
                  const pointsInput = document.getElementById('redeemPoints') as HTMLInputElement;
                  const points = parseInt(pointsInput.value) || 0;
                  
                  if (points <= 0) {
                    setMessage({ type: 'error', text: 'Please enter a valid points amount' });
                    return;
                  }

                  if ((sharedUser?.total_points || 0) < points) {
                    setMessage({ type: 'error', text: `Insufficient points. You have ${sharedUser?.total_points || 0} points.` });
                    return;
                  }

                  setLoading(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                      setMessage({ type: 'error', text: 'No active session' });
                      return;
                    }
                    const response = await fetch('/api/points/redeem', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                      },
                      body: JSON.stringify({
                        points,
                        description: `Test redemption of ${points} points`,
                        metadata: {
                          platform: 'gcc',
                          test: true,
                        },
                      }),
                    });
                    const data = await response.json();
                    if (data.success) {
                      setMessage({ 
                        type: 'success', 
                        text: `Redeemed ${points} points! New balance: ${data.new_balance} points` 
                      });
                      setTimeout(() => {
                        loadUserData();
                      }, 1000);
                    } else {
                      setMessage({ 
                        type: 'error', 
                        text: data.error || 'Failed to redeem points' + (data.details ? `: ${data.details}` : '') 
                      });
                      console.error('Redemption error:', data);
                    }
                  } catch (error: any) {
                    setMessage({ type: 'error', text: `Error: ${error.message}` });
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !sharedUser || (sharedUser.total_points || 0) < 10}
                className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md border-2 border-orange-700"
                style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
              >
                {loading ? 'Redeeming...' : 'Redeem Points'}
              </button>
              <span className="text-sm text-gray-600">
                (Min 10 points, max {sharedUser?.total_points || 0} points)
              </span>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-2">What This Tests</h3>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Shared Users table - cross-platform user profiles</li>
              <li>Unified Bookings - cross-platform package bookings</li>
              <li>Unified Reviews - cross-platform review system</li>
              <li>Loyalty Points - unified points tracking with transaction history</li>
              <li>Platform Activity - GCC/WTV activity tracking</li>
              <li>SSO (Single Sign-On) - cross-platform authentication</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
