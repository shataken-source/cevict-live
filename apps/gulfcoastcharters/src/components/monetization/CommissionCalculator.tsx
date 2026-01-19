import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';

interface CommissionBreakdown {
  bookingAmount: number;
  platformCommission: number;
  serviceFee: number;
  captainPayout: number;
  commissionRate: number;
  serviceFeeRate: number;
}

export function CommissionCalculator({ 
  bookingAmount, 
  commissionRate = 0.12, 
  serviceFeeRate = 0.08 
}: { 
  bookingAmount: number; 
  commissionRate?: number; 
  serviceFeeRate?: number;
}) {
  const platformCommission = bookingAmount * commissionRate;
  const serviceFee = bookingAmount * serviceFeeRate;
  const captainPayout = bookingAmount - platformCommission;
  const totalRevenue = platformCommission + serviceFee;

  const breakdown: CommissionBreakdown = {
    bookingAmount,
    platformCommission,
    serviceFee,
    captainPayout,
    commissionRate,
    serviceFeeRate
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Booking Amount</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${bookingAmount.toFixed(2)}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Platform Commission</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">${platformCommission.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">{(commissionRate * 100).toFixed(0)}% of booking</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Service Fee</CardTitle>
          <CreditCard className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">${serviceFee.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">{(serviceFeeRate * 100).toFixed(0)}% customer fee</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Captain Payout</CardTitle>
          <Users className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">${captainPayout.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">{((1 - commissionRate) * 100).toFixed(0)}% to captain</p>
        </CardContent>
      </Card>
    </div>
  );
}
