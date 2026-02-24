import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { TrendingUp, TrendingDown, Mail, MousePointer, Users, DollarSign } from 'lucide-react';

interface CampaignAnalyticsProps {
  campaignId: string;
}

const CampaignAnalytics: React.FC<CampaignAnalyticsProps> = ({ campaignId }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [campaignId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-campaign-manager', {
        body: { action: 'get_campaign_stats', campaignId }
      });
      
      if (!error && data?.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8">No data available</div>;
  }

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend }: any) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-lg ${trend === 'up' ? 'bg-green-100' : 'bg-blue-100'}`}>
            <Icon className={`w-6 h-6 ${trend === 'up' ? 'text-green-600' : 'text-blue-600'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Campaign Performance</h2>
        <p className="text-gray-600">Detailed analytics and A/B test results</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sent"
          value={stats.totalSent}
          subtitle={`${stats.totalDelivered} delivered`}
          icon={Mail}
        />
        <MetricCard
          title="Open Rate"
          value={`${stats.openRate}%`}
          subtitle={`${stats.totalOpened} opens`}
          icon={TrendingUp}
          trend="up"
        />
        <MetricCard
          title="Click Rate"
          value={`${stats.clickRate}%`}
          subtitle={`${stats.totalClicked} clicks`}
          icon={MousePointer}
          trend="up"
        />
        <MetricCard
          title="Conversions"
          value={stats.totalConverted}
          subtitle={`${stats.conversionRate}% rate`}
          icon={DollarSign}
          trend="up"
        />
      </div>

      {/* A/B Test Comparison */}
      {stats.variantB && (
        <Card>
          <CardHeader>
            <CardTitle>A/B Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Variant A */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Variant A</h3>
                  <Badge variant="outline">{stats.variantA.sent} sent</Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Open Rate</span>
                      <span className="font-semibold">{stats.variantA.openRate}%</span>
                    </div>
                    <Progress value={stats.variantA.openRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Click Rate</span>
                      <span className="font-semibold">{stats.variantA.clickRate}%</span>
                    </div>
                    <Progress value={stats.variantA.clickRate} className="h-2" />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Opens</span>
                    <span className="font-semibold">{stats.variantA.opened}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-gray-500">Clicks</span>
                    <span className="font-semibold">{stats.variantA.clicked}</span>
                  </div>
                </div>
              </div>

              {/* Variant B */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Variant B</h3>
                  <Badge variant="outline">{stats.variantB.sent} sent</Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Open Rate</span>
                      <span className="font-semibold">{stats.variantB.openRate}%</span>
                    </div>
                    <Progress value={stats.variantB.openRate} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Click Rate</span>
                      <span className="font-semibold">{stats.variantB.clickRate}%</span>
                    </div>
                    <Progress value={stats.variantB.clickRate} className="h-2" />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Opens</span>
                    <span className="font-semibold">{stats.variantB.opened}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-gray-500">Clicks</span>
                    <span className="font-semibold">{stats.variantB.clicked}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Winner Badge */}
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-green-900">
                  {stats.variantB.openRate > stats.variantA.openRate ? 'Variant B' : 'Variant A'} is performing better
                </p>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {Math.abs(stats.variantB.openRate - stats.variantA.openRate).toFixed(1)}% higher open rate
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium">Delivered</div>
              <div className="flex-1">
                <Progress value={100} className="h-6" />
              </div>
              <div className="w-20 text-right font-semibold">{stats.totalDelivered}</div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium">Opened</div>
              <div className="flex-1">
                <Progress value={(stats.totalOpened / stats.totalDelivered) * 100} className="h-6" />
              </div>
              <div className="w-20 text-right font-semibold">{stats.totalOpened}</div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium">Clicked</div>
              <div className="flex-1">
                <Progress value={(stats.totalClicked / stats.totalDelivered) * 100} className="h-6" />
              </div>
              <div className="w-20 text-right font-semibold">{stats.totalClicked}</div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium">Converted</div>
              <div className="flex-1">
                <Progress value={(stats.totalConverted / stats.totalDelivered) * 100} className="h-6" />
              </div>
              <div className="w-20 text-right font-semibold">{stats.totalConverted}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignAnalytics;
