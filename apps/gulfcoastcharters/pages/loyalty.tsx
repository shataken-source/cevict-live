/**
 * Loyalty Program Page
 * 
 * Route: /loyalty
 * Displays loyalty points, rewards, and program information
 */

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Badge } from '../src/components/ui/badge';
import { Progress } from '../src/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { 
  Award, Star, Gift, TrendingUp, Calendar, 
  CheckCircle, Sparkles, Target, Zap 
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';

type LoyaltyTier = {
  name: string;
  pointsRequired: number;
  benefits: string[];
  color: string;
};

type Reward = {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  category: string;
  available: boolean;
};

const loyaltyTiers: LoyaltyTier[] = [
  {
    name: 'Bronze',
    pointsRequired: 0,
    benefits: [
      'Earn 1 point per $1 spent',
      'Access to exclusive deals',
    ],
    color: 'bg-amber-600',
  },
  {
    name: 'Silver',
    pointsRequired: 500,
    benefits: [
      'Earn 1.5 points per $1 spent',
      '5% discount on all bookings',
      'Priority customer support',
    ],
    color: 'bg-gray-400',
  },
  {
    name: 'Gold',
    pointsRequired: 1500,
    benefits: [
      'Earn 2 points per $1 spent',
      '10% discount on all bookings',
      'Free cancellation up to 24 hours',
      'Exclusive charter access',
    ],
    color: 'bg-yellow-500',
  },
  {
    name: 'Platinum',
    pointsRequired: 3000,
    benefits: [
      'Earn 2.5 points per $1 spent',
      '15% discount on all bookings',
      'Free upgrades when available',
      'VIP captain selection',
      'Annual free charter',
    ],
    color: 'bg-purple-600',
  },
];

const availableRewards: Reward[] = [
  {
    id: '1',
    name: '$25 Off Next Booking',
    description: 'Redeem 250 points for $25 off your next charter booking',
    pointsRequired: 250,
    category: 'Discount',
    available: true,
  },
  {
    id: '2',
    name: 'Free Half Day Charter',
    description: 'Redeem 1000 points for a free half-day charter',
    pointsRequired: 1000,
    category: 'Charter',
    available: true,
  },
  {
    id: '3',
    name: 'Captain Upgrade',
    description: 'Redeem 500 points to upgrade to a premium captain',
    pointsRequired: 500,
    category: 'Upgrade',
    available: true,
  },
  {
    id: '4',
    name: 'Fishing Gear Package',
    description: 'Redeem 750 points for a premium fishing gear package',
    pointsRequired: 750,
    category: 'Gear',
    available: true,
  },
];

export default function LoyaltyPage() {
  const [userPoints, setUserPoints] = useState(0);
  const [userTier, setUserTier] = useState<LoyaltyTier>(loyaltyTiers[0]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadLoyaltyData() {
      try {
        setLoading(true);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          // Allow public access but show limited info
          setUserPoints(0);
          setUserTier(loyaltyTiers[0]);
          return;
        }

        setUser(session.user);

        // Load user loyalty points
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('loyalty_points')
          .eq('id', session.user.id)
          .single();

        if (!profileError && profileData) {
          const points = profileData.loyalty_points || 0;
          setUserPoints(points);
          
          // Determine tier
          const currentTier = loyaltyTiers
            .slice()
            .reverse()
            .find(tier => points >= tier.pointsRequired) || loyaltyTiers[0];
          setUserTier(currentTier);
        } else {
          setUserPoints(0);
          setUserTier(loyaltyTiers[0]);
        }

      } catch (error: any) {
        console.error('Error loading loyalty data:', error);
        setUserPoints(0);
        setUserTier(loyaltyTiers[0]);
      } finally {
        setLoading(false);
      }
    }

    loadLoyaltyData();
  }, []);

  const nextTier = loyaltyTiers.find(tier => tier.pointsRequired > userPoints) || null;
  const pointsToNextTier = nextTier ? nextTier.pointsRequired - userPoints : 0;
  const progressToNextTier = nextTier 
    ? (userPoints / nextTier.pointsRequired) * 100 
    : 100;

  const handleRedeem = async (reward: Reward) => {
    if (!user) {
      toast.error('Please log in to redeem rewards');
      return;
    }

    if (userPoints < reward.pointsRequired) {
      toast.error(`You need ${reward.pointsRequired - userPoints} more points to redeem this reward`);
      return;
    }

    try {
      // TODO: Implement actual reward redemption
      toast.success(`Reward "${reward.name}" redeemed successfully!`);
      setUserPoints(prev => prev - reward.pointsRequired);
    } catch (error) {
      toast.error('Failed to redeem reward. Please try again.');
    }
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
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Award className="w-12 h-12 text-yellow-500" />
            <h1 className="text-4xl font-bold">Loyalty Program</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Earn points with every booking and unlock exclusive rewards
          </p>
        </div>

        {/* Points Summary */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-6 h-6" />
                <span className="text-sm font-semibold">Your Points</span>
              </div>
              <p className="text-4xl font-bold">{userPoints.toLocaleString()}</p>
              <p className="text-yellow-100 text-sm mt-2">
                {user ? 'Keep earning to unlock more rewards!' : 'Sign in to track your points'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-semibold">Current Tier</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${userTier.color} text-white`}>
                  {userTier.name}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {userTier.benefits.length} active benefits
              </p>
            </CardContent>
          </Card>

          {nextTier && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-semibold">Next Tier</span>
                </div>
                <p className="text-2xl font-bold">{nextTier.name}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{pointsToNextTier} points needed</span>
                    <span>{Math.round(progressToNextTier)}%</span>
                  </div>
                  <Progress value={progressToNextTier} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Tabs defaultValue="rewards" className="mb-6">
          <TabsList>
            <TabsTrigger value="rewards">Available Rewards</TabsTrigger>
            <TabsTrigger value="tiers">Tiers & Benefits</TabsTrigger>
            <TabsTrigger value="history">Points History</TabsTrigger>
          </TabsList>

          {/* Available Rewards */}
          <TabsContent value="rewards" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              {availableRewards.map((reward) => (
                <Card key={reward.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{reward.name}</CardTitle>
                      <Badge variant="outline">{reward.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{reward.pointsRequired} points</span>
                      </div>
                      <Button
                        onClick={() => handleRedeem(reward)}
                        disabled={!user || userPoints < reward.pointsRequired || !reward.available}
                        size="sm"
                      >
                        {userPoints >= reward.pointsRequired ? 'Redeem' : 'Not Enough Points'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tiers & Benefits */}
          <TabsContent value="tiers">
            <div className="space-y-6">
              {loyaltyTiers.map((tier, index) => (
                <Card 
                  key={tier.name}
                  className={userTier.name === tier.name ? 'border-2 border-blue-500' : ''}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-3">
                        <Badge className={`${tier.color} text-white`}>
                          {tier.name}
                        </Badge>
                        {userTier.name === tier.name && (
                          <Badge variant="default">Current Tier</Badge>
                        )}
                      </CardTitle>
                      <span className="text-sm text-gray-600">
                        {tier.pointsRequired === 0 
                          ? 'Starting tier' 
                          : `${tier.pointsRequired} points required`}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {tier.benefits.map((benefit, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Points History */}
          <TabsContent value="history">
            <Card>
              <CardContent className="pt-6">
                {user ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Points History</h3>
                    <p className="text-gray-600 mb-4">
                      Your points history will appear here as you make bookings.
                    </p>
                    <Link href="/bookings">
                      <Button>
                        Book a Charter
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Sign In to View History</h3>
                    <p className="text-gray-600 mb-4">
                      Create an account or sign in to start earning loyalty points.
                    </p>
                    <Link href="/admin/login">
                      <Button>
                        Sign In
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* How It Works */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-3">
                  1
                </div>
                <h4 className="font-semibold mb-2">Book & Earn</h4>
                <p className="text-sm text-gray-700">
                  Earn points with every charter booking. Points are awarded based on your tier.
                </p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-3">
                  2
                </div>
                <h4 className="font-semibold mb-2">Level Up</h4>
                <p className="text-sm text-gray-700">
                  Reach higher tiers by accumulating points. Each tier unlocks better benefits.
                </p>
              </div>
              <div>
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-3">
                  3
                </div>
                <h4 className="font-semibold mb-2">Redeem Rewards</h4>
                <p className="text-sm text-gray-700">
                  Use your points to redeem discounts, upgrades, and exclusive rewards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
