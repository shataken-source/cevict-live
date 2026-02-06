/**
 * Reviews Page
 * 
 * Route: /reviews
 * Displays user reviews and ratings for vessels and captains
 */

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Badge } from '../src/components/ui/badge';
import { Input } from '../src/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../src/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../src/components/ui/avatar';
import { 
  Star, Search, Filter, Calendar, User, Anchor,
  ThumbsUp, MessageSquare, TrendingUp 
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import Link from 'next/link';

type Review = {
  id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  review_text: string;
  created_at: string;
  charter_name?: string;
  captain_name?: string;
  vessel_name?: string;
  helpful_count?: number;
  verified_booking?: boolean;
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    async function loadReviews() {
      try {
        setLoading(true);
        
        // Load reviews from database
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (reviewsError && reviewsError.code !== 'PGRST116') {
          console.error('Reviews error:', reviewsError);
          // Create mock reviews for demo
          setReviews(createMockReviews());
        } else if (reviewsData) {
          setReviews(reviewsData.map((r: any) => ({
            id: r.id,
            user_name: r.user_name || 'Anonymous',
            user_avatar: r.user_avatar,
            rating: r.rating || 5,
            review_text: r.review_text || r.comment || '',
            created_at: r.created_at,
            charter_name: r.charter_name,
            captain_name: r.captain_name,
            vessel_name: r.vessel_name,
            helpful_count: r.helpful_count || 0,
            verified_booking: r.verified_booking || false,
          })));
        } else {
          setReviews(createMockReviews());
        }

      } catch (error: any) {
        console.error('Error loading reviews:', error);
        setReviews(createMockReviews());
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, []);

  const createMockReviews = (): Review[] => {
    return [
      {
        id: '1',
        user_name: 'John D.',
        rating: 5,
        review_text: 'Amazing fishing trip! Captain Mike was knowledgeable and found us some great spots. Caught a 30lb red snapper!',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        charter_name: 'Deep Sea Fishing',
        captain_name: 'Captain Mike',
        helpful_count: 12,
        verified_booking: true,
      },
      {
        id: '2',
        user_name: 'Sarah M.',
        rating: 5,
        review_text: 'Perfect day on the water. The boat was clean and well-maintained. Highly recommend!',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        charter_name: 'Inshore Fishing',
        vessel_name: 'Sea Breeze',
        helpful_count: 8,
        verified_booking: true,
      },
      {
        id: '3',
        user_name: 'Robert T.',
        rating: 4,
        review_text: 'Good experience overall. Weather was perfect and we caught plenty of fish. Only minor issue was the boat could use some updates.',
        created_at: new Date(Date.now() - 259200000).toISOString(),
        charter_name: 'Half Day Charter',
        captain_name: 'Captain Sarah',
        helpful_count: 5,
        verified_booking: true,
      },
      {
        id: '4',
        user_name: 'Emily K.',
        rating: 5,
        review_text: 'Best fishing charter we\'ve ever been on! The captain knew exactly where to go and we limited out. Will definitely book again.',
        created_at: new Date(Date.now() - 345600000).toISOString(),
        charter_name: 'Full Day Charter',
        vessel_name: 'Gulf Runner',
        helpful_count: 15,
        verified_booking: true,
      },
    ];
  };

  const filteredAndSortedReviews = reviews
    .filter(review => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          review.review_text.toLowerCase().includes(query) ||
          review.charter_name?.toLowerCase().includes(query) ||
          review.captain_name?.toLowerCase().includes(query) ||
          review.vessel_name?.toLowerCase().includes(query) ||
          review.user_name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Rating filter
      if (filterRating !== 'all') {
        const ratingNum = parseInt(filterRating);
        if (review.rating !== ratingNum) return false;
      }

      // Tab filter
      if (activeTab === 'verified' && !review.verified_booking) return false;
      if (activeTab === '5-star' && review.rating !== 5) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'helpful') {
        return (b.helpful_count || 0) - (a.helpful_count || 0);
      } else if (sortBy === 'rating') {
        return b.rating - a.rating;
      }
      return 0;
    });

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
      : 0,
  }));

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating
            ? 'text-yellow-500 fill-yellow-500'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-6xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout session={null}>
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Reviews</h1>
          <p className="text-gray-600">See what our customers are saying about their charter experiences</p>
        </div>

        {/* Stats Summary */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
              </div>
              <p className="text-gray-600">Average Rating</p>
              <p className="text-sm text-gray-500 mt-1">{reviews.length} total reviews</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-6 h-6 text-green-600" />
                <span className="text-3xl font-bold">
                  {reviews.filter(r => r.rating >= 4).length}
                </span>
              </div>
              <p className="text-gray-600">Positive Reviews</p>
              <p className="text-sm text-gray-500 mt-1">
                {reviews.length > 0
                  ? Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)
                  : 0}% of all reviews
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="w-6 h-6 text-blue-600" />
                <span className="text-3xl font-bold">
                  {reviews.reduce((sum, r) => sum + (r.helpful_count || 0), 0)}
                </span>
              </div>
              <p className="text-gray-600">Helpful Votes</p>
              <p className="text-sm text-gray-500 mt-1">Community feedback</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="helpful">Most Helpful</SelectItem>
                <SelectItem value="rating">Highest Rating</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Reviews</TabsTrigger>
              <TabsTrigger value="verified">Verified Bookings</TabsTrigger>
              <TabsTrigger value="5-star">5 Star Reviews</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Rating Distribution */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm font-semibold">{rating}</span>
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-600 w-16 text-right">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredAndSortedReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
                <p className="text-gray-600">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={review.user_avatar} />
                      <AvatarFallback>{getInitials(review.user_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{review.user_name}</h3>
                            {review.verified_booking && (
                              <Badge variant="default" className="text-xs">
                                Verified Booking
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {(review.charter_name || review.captain_name || review.vessel_name) && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                              {review.charter_name && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {review.charter_name}
                                </span>
                              )}
                              {review.captain_name && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {review.captain_name}
                                </span>
                              )}
                              {review.vessel_name && (
                                <span className="flex items-center gap-1">
                                  <Anchor className="w-3 h-3" />
                                  {review.vessel_name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed mb-3">{review.review_text}</p>
                      <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" className="text-gray-600">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Helpful ({review.helpful_count || 0})
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
