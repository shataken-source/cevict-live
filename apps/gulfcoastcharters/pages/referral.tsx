/**
 * Referral Program Page
 * 
 * Route: /referral
 * Referral program information and management
 */

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Badge } from '../src/components/ui/badge';
import { Input } from '../src/components/ui/input';
import { 
  Users, Gift, Share2, Copy, CheckCircle, 
  TrendingUp, Award, Mail, MessageSquare 
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';
import SocialShareButtons from '../src/components/SocialShareButtons';

type ReferralStats = {
  totalReferrals: number;
  successfulReferrals: number;
  totalEarnings: number;
  referralCode: string;
  referralLink: string;
};

export default function ReferralPage() {
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    successfulReferrals: 0,
    totalEarnings: 0,
    referralCode: '',
    referralLink: '',
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadReferralData() {
      try {
        setLoading(true);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          // Allow public access but show limited info
          setStats({
            totalReferrals: 0,
            successfulReferrals: 0,
            totalEarnings: 0,
            referralCode: '',
            referralLink: '',
          });
          return;
        }

        setUser(session.user);

        // Load referral data
        const { data: referralData, error: referralError } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', session.user.id)
          .single();

        if (!referralError && referralData) {
          const referralCode = referralData.code || `REF-${session.user.id.slice(0, 8).toUpperCase()}`;
          const referralLink = `${window.location.origin}/?ref=${referralCode}`;
          
          setStats({
            totalReferrals: referralData.total_referrals || 0,
            successfulReferrals: referralData.successful_referrals || 0,
            totalEarnings: referralData.total_earnings || 0,
            referralCode,
            referralLink,
          });
        } else {
          // Generate referral code if doesn't exist
          const referralCode = `REF-${session.user.id.slice(0, 8).toUpperCase()}`;
          const referralLink = `${window.location.origin}/?ref=${referralCode}`;
          
          // Award points for generating affiliate code (gamification)
          try {
            await supabase.functions.invoke('points-rewards-system', {
              body: {
                action: 'award_points',
                userId: session.user.id,
                actionType: 'affiliate_code_generated',
                amount: 10,
              },
            });
          } catch (pointsError) {
            console.error('Error awarding affiliate code points:', pointsError);
            // Don't block referral code generation if points fail
          }
          
          setStats({
            totalReferrals: 0,
            successfulReferrals: 0,
            totalEarnings: 0,
            referralCode,
            referralLink,
          });
        }

      } catch (error: any) {
        console.error('Error loading referral data:', error);
        setStats({
          totalReferrals: 0,
          successfulReferrals: 0,
          totalEarnings: 0,
          referralCode: '',
          referralLink: '',
        });
      } finally {
        setLoading(false);
      }
    }

    loadReferralData();
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(stats.referralLink);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Gulf Coast Charters',
        text: `Use my referral code ${stats.referralCode} to get $25 off your first booking!`,
        url: stats.referralLink,
      }).catch(() => {
        handleCopyLink();
      });
    } else {
      handleCopyLink();
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
            <Users className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold">Referral Program</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Share Gulf Coast Charters with friends and earn rewards!
          </p>
        </div>

        {user ? (
          <>
            {/* Stats Summary */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    <span className="text-sm font-semibold">Total Referrals</span>
                  </div>
                  <p className="text-3xl font-bold">{stats.totalReferrals}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.successfulReferrals} successful
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-6 h-6 text-green-600" />
                    <span className="text-sm font-semibold">Total Earnings</span>
                  </div>
                  <p className="text-3xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
                  <p className="text-sm text-gray-500 mt-1">In rewards earned</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                    <span className="text-sm font-semibold">Success Rate</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {stats.totalReferrals > 0
                      ? Math.round((stats.successfulReferrals / stats.totalReferrals) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Conversion rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Referral Code Section */}
            <Card className="mb-8 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">Your Referral Code</h2>
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Badge className="bg-white text-blue-600 text-xl px-6 py-2">
                      {stats.referralCode}
                    </Badge>
                  </div>
                  <p className="text-blue-100 mb-4">
                    Share this code with friends to earn $25 for each successful referral!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
                  <div className="flex-1">
                    <Input
                      value={stats.referralLink}
                      readOnly
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/70"
                    />
                  </div>
                  <Button
                    onClick={handleCopyLink}
                    variant="secondary"
                    className="whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleShare}
                    variant="secondary"
                    className="whitespace-nowrap"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>

                {/* Social Sharing Buttons */}
                {stats.referralCode && (
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <SocialShareButtons
                      referralCode={stats.referralCode}
                      shareUrl={stats.referralLink}
                      userName={user?.user_metadata?.full_name || 'A friend'}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                      <Share2 className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-2">1. Share Your Code</h3>
                    <p className="text-sm text-gray-600">
                      Share your unique referral code or link with friends and family
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <Gift className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">2. They Book</h3>
                    <p className="text-sm text-gray-600">
                      When they use your code to book their first charter, they get $25 off
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                      <Award className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-2">3. You Earn</h3>
                    <p className="text-sm text-gray-600">
                      You earn $25 in rewards for each successful referral that completes a booking
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rewards Info */}
            <Card>
              <CardHeader>
                <CardTitle>Reward Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">For Your Friends</h4>
                    <p className="text-sm text-gray-600">
                      $25 off their first charter booking when they use your referral code
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">For You</h4>
                    <p className="text-sm text-gray-600">
                      $25 in rewards for each friend who completes their first booking
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">No Limits</h4>
                    <p className="text-sm text-gray-600">
                      Refer as many friends as you want - there's no limit to how much you can earn!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-2xl font-bold mb-2">Join the Referral Program</h2>
              <p className="text-gray-600 mb-6">
                Sign in to get your unique referral code and start earning rewards!
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/admin/login">
                  <Button>
                    Sign In
                  </Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline">
                    Learn More
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

