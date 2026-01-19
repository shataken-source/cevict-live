import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy, Gift, Users, DollarSign, Share2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import ReferralTiers from './referral/ReferralTiers';
import ReferralEmailInvite from './referral/ReferralEmailInvite';
import ReferralBadges from './referral/ReferralBadges';
import SocialShareButtons from './SocialShareButtons';
import ReferralChallenges from './referral/ReferralChallenges';
import ChallengeLeaderboard from './referral/ChallengeLeaderboard';
import ChallengeBadges from './referral/ChallengeBadges';


export default function ReferralDashboard({ userEmail }: { userEmail: string }) {
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [credits, setCredits] = useState({ totalEarned: 0, availableBalance: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadReferralData();
  }, [userEmail]);

  const loadReferralData = async () => {
    try {
      const { data: codeData } = await supabase.functions.invoke('referral-rewards', {
        body: { action: 'generate_code', userEmail }
      });

      if (codeData?.referralCode) {
        setReferralCode(codeData.referralCode);
      }

      const { data: refData } = await supabase.functions.invoke('referral-rewards', {
        body: { action: 'get_referrals', userEmail }
      });

      if (refData?.referrals) {
        setReferrals(refData.referrals);
        setCredits(refData.credits);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({ title: 'Code copied!', description: 'Share it with your friends!' });
  };

  const shareUrl = `${window.location.origin}?ref=${referralCode}`;

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Share link copied!', description: 'Paste it anywhere to share!' });
  };

  const completedReferrals = referrals.filter(r => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-2 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${credits.availableBalance}</div>
            <p className="text-xs text-gray-500 mt-1">Use on any booking</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <Gift className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${credits.totalEarned}</div>
            <p className="text-xs text-gray-500 mt-1">Lifetime rewards</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Successful Referrals</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{completedReferrals}</div>
            <p className="text-xs text-gray-500 mt-1">{referrals.length - completedReferrals} pending</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-blue-300">
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={referralCode} readOnly className="font-mono text-lg font-bold" />
            <Button onClick={copyReferralCode} variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="text-sm" />
            <Button onClick={copyShareUrl} variant="outline">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <SocialShareButtons 
            referralCode={referralCode} 
            shareUrl={shareUrl}
            userName="A friend"
          />

          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
            <p className="font-semibold text-blue-900 mb-2">How it works:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Share your code with friends</li>
              <li>• They get $10 off their first booking</li>
              <li>• You earn $25 when they complete their booking</li>
              <li>• Unlock bonus rewards at 3, 10, 25, and 50 referrals!</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <ReferralChallenges userId={userEmail} />
      <div className="grid md:grid-cols-2 gap-6">
        <ChallengeLeaderboard />
        <ChallengeBadges userId={userEmail} />
      </div>

      <ReferralTiers currentReferrals={completedReferrals} />
      <ReferralBadges referralCount={completedReferrals} totalEarned={credits.totalEarned} />
      <ReferralEmailInvite referralCode={referralCode} userEmail={userEmail} />


      <Card>
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No referrals yet. Start sharing your code!</p>
          ) : (
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="font-medium">{ref.refereeEmail}</p>
                    <p className="text-sm text-gray-500">{new Date(ref.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={ref.status === 'completed' ? 'default' : 'secondary'} className={ref.status === 'completed' ? 'bg-green-600' : ''}>
                    {ref.status === 'completed' ? `+$${ref.rewardAmount}` : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
