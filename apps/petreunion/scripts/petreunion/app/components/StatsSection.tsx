'use client';

import { Card, CardContent } from '@/components/ui/card';

interface StatsProps {
  total: number;
  found: number;
  active: number;
}

export function StatsSection({ stats }: { stats: StatsProps }) {
  return (
    <div className="max-w-6xl mx-auto px-4 -mt-12 mb-16">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          value={stats.total}
          label="Total Pets in Database"
          gradient="from-blue-50 to-blue-100"
          textColor="text-blue-700"
        />
        <StatCard 
          value={stats.found}
          label="Successfully Reunited"
          gradient="from-green-50 to-green-100"
          textColor="text-green-700"
        />
        <StatCard 
          value={stats.active}
          label="Currently Searching"
          gradient="from-purple-50 to-purple-100"
          textColor="text-purple-700"
        />
      </div>
    </div>
  );
}

function StatCard({ value, label, gradient, textColor }: { 
  value: number; 
  label: string; 
  gradient: string;
  textColor: string;
}) {
  return (
    <Card className={`bg-gradient-to-br ${gradient} border border-opacity-50 shadow-lg`}>
      <CardContent className="p-6 text-center">
        <div className={`text-4xl font-bold ${textColor} mb-2`}>
          {value.toLocaleString()}
        </div>
        <div className="text-gray-700">{label}</div>
      </CardContent>
    </Card>
  );
}
