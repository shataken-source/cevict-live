import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AvatarCustomizer from '@/components/avatar/AvatarCustomizer';
import AvatarDisplay from '@/components/avatar/AvatarDisplay';
import AvatarShop from '@/components/avatar/AvatarShop';
import InstantMessenger from '@/components/InstantMessenger';
import MessageBoard from '@/components/MessageBoard';
import CommunityEventsCalendar from '@/components/CommunityEventsCalendar';
import CommunityLeaderboard from '@/components/CommunityLeaderboard';
import UserRankDisplay from '@/components/UserRankDisplay';
import AchievementBadgesEnhanced from '@/components/AchievementBadgesEnhanced';
import PointsRewardsDisplay from '@/components/PointsRewardsDisplay';
import ReferralDashboard from '@/components/ReferralDashboard';
import ReferralLeaderboard from '@/components/ReferralLeaderboard';
import { SocialShareButton } from '@/components/SocialShareButton';
import { mockThreads } from '@/data/mockCommunityData';
import { Users, MessageSquare, MessageCircle, Calendar, Trophy, Award, ShoppingBag, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';


export default function Community() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [avatarData, setAvatarData] = useState<Record<string, unknown> | null>(null);

  const [equippedItems, setEquippedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  const loadUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [profileRes, avatarRes, inventoryRes] = await Promise.all([
        supabase.from('profiles').select('points').eq('id', user.id).single(),
        supabase.from('user_avatars').select('*').eq('user_id', user.id).single(),
        supabase.from('user_avatar_inventory').select('item_id').eq('user_id', user.id).eq('is_equipped', true)
      ]);

      if (profileRes.data) setUserPoints(profileRes.data.points || 0);
      if (avatarRes.data) setAvatarData(avatarRes.data);
      if (inventoryRes.data) setEquippedItems(inventoryRes.data.map(i => i.item_id));
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSave = () => {
    setShowAvatarCustomizer(false);
    loadUserData();
    toast({ title: 'Avatar updated!', description: 'Your changes have been saved.' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <Button 
            variant="ghost" 
            className="text-white mb-4 hover:bg-white/20"
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </Button>
          <div className="flex items-center gap-4 mb-4">
            <Users className="w-12 h-12" />
            <h1 className="text-5xl font-bold">Community Hub</h1>
          </div>
          <p className="text-xl text-blue-100">
            Connect, customize your avatar, earn points, and compete with fellow charter enthusiasts
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {user && (
          <>
            <Card className="p-6 mb-8 bg-gradient-to-br from-white to-blue-50">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  {avatarData ? (
                    <AvatarDisplay
                      sex={avatarData.sex}
                      skinColor={avatarData.skin_color}
                      hairStyle={avatarData.hair_style}
                      hairColor={avatarData.hair_color}
                      equippedItems={equippedItems}
                      size={120}
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-3xl font-bold mb-1">{user.name}</h2>
                    <p className="text-gray-600 mb-2">{user.email}</p>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      <span className="text-2xl font-bold text-blue-600">{userPoints} Points</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <SocialShareButton
                    type="avatar"
                    data={{
                      id: user.id,
                      username: user.name,
                      points: userPoints,
                      level: Math.floor(userPoints / 100),
                      shareText: `Check out my Gulf Coast Charters avatar! Level ${Math.floor(userPoints / 100)} with ${userPoints} points!`
                    }}
                    userId={user.id}
                  />
                  <Button onClick={() => setShowAvatarCustomizer(!showAvatarCustomizer)} variant="outline">
                    {showAvatarCustomizer ? 'Hide' : 'Edit'} Avatar
                  </Button>
                </div>

              </div>
              {showAvatarCustomizer && (
                <div className="mt-6">
                  <AvatarCustomizer 
                    userId={user.id}
                    initialData={avatarData}
                    onSave={handleAvatarSave}
                    onCancel={() => setShowAvatarCustomizer(false)}
                  />
                </div>
              )}
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <UserRankDisplay userId={user.id} totalPoints={userPoints} />
              <PointsRewardsDisplay userId={user.id} />
            </div>
          </>
        )}

        <Tabs defaultValue="shop" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8">
            <TabsTrigger value="shop">
              <ShoppingBag className="w-5 h-5 mr-2" />
              Avatar Shop
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Trophy className="w-5 h-5 mr-2" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="achievements">
              <Award className="w-5 h-5 mr-2" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="events">
              <Calendar className="w-5 h-5 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="w-5 h-5 mr-2" />
              Live Chat
            </TabsTrigger>
            <TabsTrigger value="board">
              <MessageCircle className="w-5 h-5 mr-2" />
              Board
            </TabsTrigger>
            <TabsTrigger value="referrals">
              <Trophy className="w-5 h-5 mr-2" />
              Referrals
            </TabsTrigger>
          </TabsList>


          <TabsContent value="shop">
            {user ? (
              <AvatarShop 
                userId={user.id} 
                userPoints={userPoints} 
                onPointsChange={(newPoints) => setUserPoints(newPoints)} 
              />
            ) : (
              <Card className="p-12 text-center">
                <p className="text-xl text-gray-600 mb-4">Please login to access the Avatar Shop</p>
                <Button onClick={() => navigate('/')}>Go to Login</Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            <CommunityLeaderboard />
          </TabsContent>

          <TabsContent value="achievements">
            {user && <AchievementBadgesEnhanced userId={user.id} />}
          </TabsContent>

          <TabsContent value="events">
            <CommunityEventsCalendar />
          </TabsContent>

          <TabsContent value="chat">
            <InstantMessenger />
          </TabsContent>

          <TabsContent value="board">
            <MessageBoard />
          </TabsContent>

          <TabsContent value="referrals">
            {user ? (
              <div className="space-y-6">
                <ReferralDashboard userEmail={user.email} />
                <ReferralLeaderboard />
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-xl text-gray-600 mb-4">Please login to access the Referral Program</p>
                <Button onClick={() => navigate('/')}>Go to Login</Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}

