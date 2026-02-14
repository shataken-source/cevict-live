import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AffiliateMarketingDashboard from '@/components/affiliate/AffiliateMarketingDashboard';
import AffiliatePromotionalKit from '@/components/affiliate/AffiliatePromotionalKit';
import AffiliateLeaderboard from '@/components/AffiliateLeaderboard';
import { useUserStore } from '@/stores/userStore';

export default function AffiliateProgram() {
  const { user } = useUserStore();
  const affiliateCode = `AFF-${user?.id?.substring(0, 8).toUpperCase() || 'DEMO'}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="promotional">Promotional Kit</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AffiliateMarketingDashboard userId={user?.id || 'demo'} />
        </TabsContent>

        <TabsContent value="promotional">
          <AffiliatePromotionalKit affiliateCode={affiliateCode} />
        </TabsContent>

        <TabsContent value="leaderboard">
          <AffiliateLeaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
