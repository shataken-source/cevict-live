import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, ShoppingCart, Award, Mail, Video, Building2, Target, Percent } from 'lucide-react';

export default function MonetizationDashboard() {
  const strategies = [
    { icon: Award, title: 'Premium Captain Listings', revenue: '$12,450', growth: '+23%', color: 'text-yellow-600' },
    { icon: Target, title: 'Sponsored Content', revenue: '$8,200', growth: '+45%', color: 'text-blue-600' },
    { icon: Users, title: 'Lead Generation Fees', revenue: '$6,800', growth: '+18%', color: 'text-green-600' },
    { icon: Users, title: 'Membership Tiers', revenue: '$15,600', growth: '+32%', color: 'text-purple-600' },
    { icon: Percent, title: 'Booking Commissions', revenue: '$22,400', growth: '+28%', color: 'text-red-600' },
    { icon: ShoppingCart, title: 'Affiliate Sales', revenue: '$9,300', growth: '+52%', color: 'text-orange-600' },
    { icon: Mail, title: 'Email Marketing', revenue: '$4,100', growth: '+15%', color: 'text-cyan-600' },
    { icon: DollarSign, title: 'Banner Ads', revenue: '$7,900', growth: '+20%', color: 'text-pink-600' },
    { icon: Video, title: 'Video Advertising', revenue: '$5,600', growth: '+38%', color: 'text-indigo-600' },
    { icon: Building2, title: 'Corporate Accounts', revenue: '$18,500', growth: '+42%', color: 'text-teal-600' }
  ];

  const totalRevenue = strategies.reduce((sum, s) => sum + parseFloat(s.revenue.replace(/[$,]/g, '')), 0);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <TrendingUp className="w-8 h-8" />
            Total Monthly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold">${totalRevenue.toLocaleString()}</div>
          <p className="text-blue-100 mt-2">+31% from last month</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((strategy, idx) => {
          const Icon = strategy.icon;
          return (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{strategy.title}</p>
                    <p className="text-2xl font-bold">{strategy.revenue}</p>
                    <p className="text-sm text-green-600 font-semibold mt-1">{strategy.growth}</p>
                  </div>
                  <Icon className={`w-10 h-10 ${strategy.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
