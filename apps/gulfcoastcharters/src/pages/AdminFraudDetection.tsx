import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FraudDetectionDashboard from '@/components/admin/FraudDetectionDashboard';
import DisputeResolutionWorkflow from '@/components/admin/DisputeResolutionWorkflow';
import ReferralPatternAnalyzer from '@/components/admin/ReferralPatternAnalyzer';

export default function AdminFraudDetection() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Fraud Detection & Prevention</h1>
        <p className="text-muted-foreground">
          Monitor suspicious activity, investigate fraud alerts, and resolve disputes
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Fraud Dashboard</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
          <TabsTrigger value="disputes">Dispute Resolution</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <FraudDetectionDashboard />
        </TabsContent>

        <TabsContent value="patterns">
          <ReferralPatternAnalyzer />
        </TabsContent>

        <TabsContent value="disputes">
          <DisputeResolutionWorkflow />
        </TabsContent>
      </Tabs>
    </div>
  );
}
