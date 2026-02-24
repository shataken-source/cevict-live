import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Users } from 'lucide-react';

interface PricingFactors {
  basePrice: number;
  demandMultiplier: number;
  seasonalMultiplier: number;
  weatherMultiplier: number;
  finalPrice: number;
  savings?: number;
}

export default function DynamicPricingDisplay({ 
  basePrice, 
  date, 
  partySize 
}: { 
  basePrice: number; 
  date: Date; 
  partySize: number;
}) {
  const [pricing, setPricing] = useState<PricingFactors | null>(null);

  useEffect(() => {
    calculateDynamicPrice();
  }, [basePrice, date, partySize]);

  const calculateDynamicPrice = () => {
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    
    // Weekend pricing
    const demandMultiplier = [0, 6].includes(dayOfWeek) ? 1.3 : 1.0;
    
    // Peak season (May-August)
    const seasonalMultiplier = [4, 5, 6, 7].includes(month) ? 1.2 : 0.9;
    
    // Weather factor (simplified)
    const weatherMultiplier = 1.0;
    
    const finalPrice = basePrice * demandMultiplier * seasonalMultiplier * weatherMultiplier;
    const savings = finalPrice < basePrice ? basePrice - finalPrice : undefined;

    setPricing({
      basePrice,
      demandMultiplier,
      seasonalMultiplier,
      weatherMultiplier,
      finalPrice,
      savings
    });
  };

  if (!pricing) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Smart Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">${pricing.finalPrice.toFixed(2)}</span>
          {pricing.savings && (
            <Badge variant="default" className="bg-green-600">
              <TrendingDown className="h-3 w-3 mr-1" />
              Save ${pricing.savings.toFixed(2)}
            </Badge>
          )}
        </div>
        <div className="text-sm space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span>Base Price:</span>
            <span>${pricing.basePrice.toFixed(2)}</span>
          </div>
          {pricing.demandMultiplier > 1 && (
            <div className="flex justify-between text-orange-600">
              <span>Weekend Premium:</span>
              <span>+{((pricing.demandMultiplier - 1) * 100).toFixed(0)}%</span>
            </div>
          )}
          {pricing.seasonalMultiplier !== 1 && (
            <div className="flex justify-between">
              <span>Seasonal Adjustment:</span>
              <span>{pricing.seasonalMultiplier > 1 ? '+' : ''}{((pricing.seasonalMultiplier - 1) * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
