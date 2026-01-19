import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SendConversationEmail() {
  const { toast } = useToast();

  const sendEmail = async () => {
    try {
      const conversationHtml = `
        <h1>Charter Booking Platform - Development Conversation</h1>
        <p><strong>Date:</strong> November 17, 2025</p>
        
        <h2>Issue 1: Google Login Fix</h2>
        <p><strong>User Request:</strong> "Login with Google isn't working"</p>
        <p><strong>Solution Implemented:</strong></p>
        <ul>
          <li>Updated UserAuth.tsx to call oauth-profile-sync edge function after successful OAuth login</li>
          <li>Enhanced OAuth error handling with detailed console logging for debugging</li>
          <li>Improved redirect URL configuration with proper formatting</li>
          <li>Added fallback user data handling if profile sync fails</li>
          <li>Updated OAUTH_SETUP.md with comprehensive Google login troubleshooting section</li>
          <li>Created GOOGLE_LOGIN_FIX.md as quick reference guide for common OAuth issues</li>
        </ul>

        <h2>Issue 2: Loyalty Rewards Program</h2>
        <p><strong>User Request:</strong> "Implement a loyalty rewards program where customers earn points for bookings, reviews, and referrals. Create a points system with reward tiers (Bronze, Silver, Gold, Platinum), redeemable benefits like booking discounts and priority access, and a dedicated rewards dashboard."</p>
        <p><strong>Solution Implemented:</strong></p>
        <ul>
          <li>Created loyalty-rewards edge function with tier system (Bronze, Silver, Gold, Platinum)</li>
          <li>Built LoyaltyRewardsDashboard component with points display, tier progress, rewards catalog, and transaction history</li>
          <li>Created loyaltyRewards utility functions for awarding points and checking discounts</li>
          <li>Integrated loyalty points into booking flow (awards points based on booking amount)</li>
          <li>Integrated loyalty points into review submission (50 points per review)</li>
          <li>Added rewards tab to CustomerDashboard</li>
          <li>Points earning rates: 1-3x multiplier based on tier for bookings, 50 points for reviews, 200 points for referrals</li>
          <li>Tier benefits include earning multipliers, priority support, early access, and exclusive perks</li>
          <li>Rewards catalog with 5-20% booking discounts, priority access, cancellation insurance, and VIP concierge</li>
        </ul>

        <h2>Technical Details</h2>
        <p><strong>Files Modified/Created:</strong></p>
        <ul>
          <li>src/components/UserAuth.tsx - OAuth flow improvements</li>
          <li>supabase/functions/loyalty-rewards/index.ts - Points and tier management</li>
          <li>src/components/LoyaltyRewardsDashboard.tsx - Full rewards interface</li>
          <li>src/utils/loyaltyRewards.ts - Helper functions</li>
          <li>src/pages/PaymentSuccess.tsx - Points awarding on booking</li>
          <li>src/components/ReviewForm.tsx - Points awarding on review</li>
          <li>src/components/CustomerDashboard.tsx - Rewards tab integration</li>
          <li>GOOGLE_LOGIN_FIX.md - OAuth troubleshooting guide</li>
          <li>OAUTH_SETUP.md - Updated with troubleshooting</li>
        </ul>

        <p><strong>Status:</strong> All features fully implemented and functional</p>
      `;

      const { data, error } = await supabase.functions.invoke('mailjet-email-service', {
        body: {
          action: 'send',
          emailData: {
            to: 'shataken@gmail.com',
            subject: 'Charter Booking Platform - Development Conversation Summary',
            htmlContent: conversationHtml,
            textContent: 'Charter Booking Platform development conversation - see HTML version for full details'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent!",
        description: "Conversation summary sent to shataken@gmail.com"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email: " + error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Button onClick={sendEmail} variant="outline" size="sm">
      <Mail className="w-4 h-4 mr-2" />
      Email Conversation
    </Button>
  );
}
