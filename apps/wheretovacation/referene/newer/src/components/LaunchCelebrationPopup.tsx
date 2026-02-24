import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Anchor, Trophy, Star, X } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

export function LaunchCelebrationPopup() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    // Only show if user is not logged in and hasn't seen the popup
    const hasSeenPopup = localStorage.getItem('hasSeenLaunchPopup');
    if (!user && !hasSeenPopup) {
      setTimeout(() => setOpen(true), 1500);
    }
  }, [user]);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem('hasSeenLaunchPopup', 'true');
  };

  const handleSignUp = () => {
    handleClose();
    // Trigger sign up modal
    const signUpBtn = document.querySelector('[data-auth-trigger="signup"]') as HTMLElement;
    signUpBtn?.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-0">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-50 rounded-full bg-white/90 p-2 hover:bg-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative">
          <img
            src="https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763536079804_0303c3b0.webp"
            alt="Launch Celebration"
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-6">
            <Badge className="bg-yellow-500 text-black mb-2">🎉 GRAND OPENING</Badge>
            <h2 className="text-3xl font-bold text-white">Welcome to Gulf Coast Charters!</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-lg text-center text-gray-700">
            Join our community today and unlock <span className="font-bold text-blue-600">exclusive launch benefits!</span>
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <Gift className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-bold text-blue-900">$50 Welcome Credit</h3>
              <p className="text-sm text-blue-700">On your first charter booking</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <Star className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-bold text-green-900">500 Bonus Points</h3>
              <p className="text-sm text-green-700">Start earning rewards instantly</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <Trophy className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-bold text-purple-900">Founder Badge</h3>
              <p className="text-sm text-purple-700">Exclusive early member status</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
              <Anchor className="h-8 w-8 text-orange-600 mb-2" />
              <h3 className="font-bold text-orange-900">Premium Access</h3>
              <p className="text-sm text-orange-700">30 days free trial</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button onClick={handleSignUp} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg py-6">
              Claim Your Launch Rewards
            </Button>
            <Button onClick={handleClose} variant="ghost" className="w-full">
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Limited time offer • Valid for new members only
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
