'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export type Plan = 'free' | 'pro' | 'enterprise';

export interface SubscriptionState {
  plan: Plan;
  status: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  isTrialExpired: boolean;
  postTrialDiscountEligible: boolean;
  isLoading: boolean;
  isProOrHigher: boolean;
}

export function useSubscription(): SubscriptionState {
  const { isLoaded, userId } = useAuth();
  const [plan, setPlan] = useState<Plan>('free');
  const [status, setStatus] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [postTrialDiscountEligible, setPostTrialDiscountEligible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    fetch('/api/subscription', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setPlan((data.plan as Plan) || 'free');
        setStatus(data.status ?? null);
        setCurrentPeriodEnd(data.currentPeriodEnd ?? null);
        setTrialEndsAt(data.trialEndsAt ?? null);
        setIsTrialExpired(!!data.isTrialExpired);
        setPostTrialDiscountEligible(!!data.postTrialDiscountEligible);
      })
      .catch(() => {
        if (!cancelled) setPlan('free');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isLoaded, userId]);

  return {
    plan,
    status,
    currentPeriodEnd,
    trialEndsAt,
    isTrialExpired,
    postTrialDiscountEligible,
    isLoading,
    isProOrHigher: plan === 'pro' || plan === 'enterprise',
  };
}
