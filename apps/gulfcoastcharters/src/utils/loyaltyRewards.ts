import { supabase } from '@/lib/supabase';

export async function awardLoyaltyPoints(
  userId: string,
  type: 'booking' | 'review' | 'referral' | 'signup',
  amount?: number,
  description?: string
) {
  try {
    // Get current loyalty data
    const data = localStorage.getItem(`loyalty_${userId}`);
    const loyaltyData = data ? JSON.parse(data) : {
      pointsBalance: 0,
      totalEarned: 0,
      tier: 'Bronze',
      transactions: [],
      redeemedRewards: []
    };

    // Calculate points to award
    const { data: result } = await supabase.functions.invoke('loyalty-rewards', {
      body: { action: 'awardPoints', userId, type, amount, description }
    });

    if (result?.pointsAwarded) {
      const pointsAwarded = result.pointsAwarded;
      const newTotal = loyaltyData.totalEarned + pointsAwarded;

      // Calculate new tier
      const { data: tierData } = await supabase.functions.invoke('loyalty-rewards', {
        body: { action: 'calculateTier', points: newTotal }
      });

      const newTier = tierData?.tier || loyaltyData.tier;

      // Update loyalty data
      const updated = {
        ...loyaltyData,
        pointsBalance: loyaltyData.pointsBalance + pointsAwarded,
        totalEarned: newTotal,
        tier: newTier,
        transactions: [
          {
            id: Date.now().toString(),
            points: pointsAwarded,
            type,
            description: result.description,
            date: new Date().toISOString()
          },
          ...loyaltyData.transactions
        ]
      };

      localStorage.setItem(`loyalty_${userId}`, JSON.stringify(updated));

      return { success: true, pointsAwarded, newTier };
    }

    return { success: false, error: 'Failed to award points' };
  } catch (error) {
    console.error('Error awarding loyalty points:', error);
    return { success: false, error: 'Failed to award points' };
  }
}

export function getLoyaltyData(userId: string) {
  const data = localStorage.getItem(`loyalty_${userId}`);
  return data ? JSON.parse(data) : null;
}

export function hasActiveDiscount(userId: string): { hasDiscount: boolean; discountPercentage: number } {
  const data = getLoyaltyData(userId);
  if (!data) return { hasDiscount: false, discountPercentage: 0 };

  const activeDiscounts = data.redeemedRewards.filter((r: { name: string; expiresAt: string }) => 

    r.name.includes('Discount') && new Date(r.expiresAt) > new Date()
  );

  if (activeDiscounts.length > 0) {
    const discount = activeDiscounts[0];
    const percentage = parseInt(discount.name.match(/\d+/)?.[0] || '0');
    return { hasDiscount: true, discountPercentage: percentage };
  }

  return { hasDiscount: false, discountPercentage: 0 };
}
