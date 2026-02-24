import { useState, useEffect } from 'react';
import { Mail, CreditCard, Award, Check, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import StripeEmailCheckout from './StripeEmailCheckout';
import EmailAliasManager from './EmailAliasManager';
import EmailSubscriptionPlans from './EmailSubscriptionPlans';


interface CustomEmailPurchaseProps {
  userId: string;
  userType: 'captain' | 'customer';
  currentPoints?: number;
  onPurchaseSuccess?: () => void;
}

const POINTS_COST = 5000;
const CASH_COST = 25;

export default function CustomEmailPurchase({ 
  userId, 
  userType,
  currentPoints = 0,
  onPurchaseSuccess 
}: CustomEmailPurchaseProps) {
  const [customEmailPrefix, setCustomEmailPrefix] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [hasCustomEmail, setHasCustomEmail] = useState(false);
  const [currentEmail, setCurrentEmail] = useState('');
  const [customEmailId, setCustomEmailId] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState<'basic' | 'pro' | 'premium'>('basic');
  const [paymentMethod, setPaymentMethod] = useState<'points' | 'cash'>('cash');
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    checkExistingEmail();
  }, [userId]);

  const checkExistingEmail = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_emails')
        .select('id, email_address, subscription_tier')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (data) {
        setHasCustomEmail(true);
        setCurrentEmail(data.email_address);
        setCustomEmailId(data.id);
        setSubscriptionTier(data.subscription_tier || 'basic');
      }
    } catch (err) {
      // No custom email found
    } finally {
      setChecking(false);
    }
  };


  const validatePrefix = (prefix: string): boolean => {
    if (prefix.length < 3) {
      setError('Minimum 3 characters required');
      return false;
    }
    if (prefix.length > 30) {
      setError('Maximum 30 characters allowed');
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(prefix)) {
      setError('Only lowercase letters, numbers, and hyphens');
      return false;
    }
    if (prefix.startsWith('-') || prefix.endsWith('-')) {
      setError('Cannot start or end with hyphen');
      return false;
    }
    return true;
  };

  const handlePurchase = async () => {
    setError('');
    
    if (!validatePrefix(customEmailPrefix)) return;

    if (paymentMethod === 'points' && currentPoints < POINTS_COST) {
      setError(`Insufficient points. Need ${POINTS_COST} points.`);
      return;
    }

    // For cash payments, open Stripe checkout
    if (paymentMethod === 'cash') {
      setShowStripeCheckout(true);
      return;
    }

    // For points payments, process directly
    setLoading(true);
    try {
      const { data, error: purchaseError } = await supabase.functions.invoke('purchase-custom-email', {
        body: { 
          emailPrefix: customEmailPrefix,
          paymentMethod: 'points',
          userType
        }
      });

      if (purchaseError) throw purchaseError;

      toast({
        title: "Success!",
        description: `Your custom email ${customEmailPrefix}@gulfcoastcharters.com is ready!`,
      });

      setHasCustomEmail(true);
      setCurrentEmail(`${customEmailPrefix}@gulfcoastcharters.com`);
      onPurchaseSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
      toast({
        title: "Error",
        description: err.message || 'Purchase failed',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStripeSuccess = () => {
    setShowStripeCheckout(false);
    setHasCustomEmail(true);
    setCurrentEmail(`${customEmailPrefix}@gulfcoastcharters.com`);
    toast({
      title: "Success!",
      description: `Your custom email ${customEmailPrefix}@gulfcoastcharters.com is ready!`,
    });
    onPurchaseSuccess?.();
  };


  if (checking) {
    return <div className="animate-pulse bg-gray-100 h-48 rounded-lg"></div>;
  }

  if (hasCustomEmail) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-lg">Custom Email Active</h3>
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-mono font-bold text-blue-900 mb-2">{currentEmail}</p>
              <p className="text-sm text-gray-600">Forward emails to your personal inbox in settings</p>
            </div>
          </div>
        </div>

        <EmailSubscriptionPlans customEmailId={customEmailId} currentTier={subscriptionTier} />
        <EmailAliasManager customEmailId={customEmailId} subscriptionTier={subscriptionTier} />
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-xl mb-1">Get Your Professional Email</h3>
            <p className="text-sm text-gray-700 mb-4">
              Stand out with a custom @gulfcoastcharters.com email address
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <label className="block text-sm font-semibold mb-2">Choose Your Email</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={customEmailPrefix}
              onChange={(e) => setCustomEmailPrefix(e.target.value.toLowerCase())}
              placeholder="yourname"
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={30}
            />
            <span className="flex items-center px-4 bg-gray-100 rounded-lg text-gray-700 font-mono text-sm">
              @gulfcoastcharters.com
            </span>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`p-4 rounded-lg border-2 transition ${
              paymentMethod === 'cash'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <CreditCard className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            <div className="font-bold">${CASH_COST}</div>
            <div className="text-xs text-gray-600">One-time payment</div>
          </button>

          <button
            onClick={() => setPaymentMethod('points')}
            className={`p-4 rounded-lg border-2 transition ${
              paymentMethod === 'points'
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Award className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <div className="font-bold">{POINTS_COST.toLocaleString()} pts</div>
            <div className="text-xs text-gray-600">
              {currentPoints >= POINTS_COST ? 'Available' : 'Insufficient'}
            </div>
          </button>
        </div>

        <Button
          onClick={handlePurchase}
          disabled={loading || !customEmailPrefix}
          className="w-full"
          size="lg"
        >
          {loading ? 'Processing...' : `Purchase with ${paymentMethod === 'cash' ? 'Card' : 'Points'}`}
        </Button>

        <p className="text-xs text-gray-500 text-center mt-3">
          Limited to 1 email per {userType}. Great prize for giveaways!
        </p>
      </div>

      <StripeEmailCheckout
        open={showStripeCheckout}
        onClose={() => setShowStripeCheckout(false)}
        emailAddress={`${customEmailPrefix}@gulfcoastcharters.com`}
        amount={CASH_COST}
        onSuccess={handleStripeSuccess}

      />
    </>
  );
}

