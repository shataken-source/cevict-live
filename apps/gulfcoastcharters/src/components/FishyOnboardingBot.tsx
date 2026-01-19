import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  message: string;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  targetElement?: string;
}

interface FishyOnboardingBotProps {
  userType: 'captain' | 'customer';
  onComplete: () => void;
}

export default function FishyOnboardingBot({ userType, onComplete }: FishyOnboardingBotProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: '50%', left: '50%' });

  const captainSteps: OnboardingStep[] = [
    { id: '1', title: 'Welcome Captain!', message: "Hi! I'm Fishy, your guide. Let me show you around your new dashboard!", position: { top: '20%', left: '50%' } },
    { id: '2', title: 'Manage Bookings', message: 'View and manage all your charter bookings in the Bookings tab. Accept, complete, or add notes!', position: { top: '30%', left: '20%' } },
    { id: '3', title: 'Track Earnings', message: 'Monitor your revenue and see detailed charts in the Earnings section.', position: { top: '40%', right: '20%' } },
    { id: '4', title: 'Upload Documents', message: 'Keep your licenses, insurance, and certifications up to date in Documents tab.', position: { bottom: '30%', left: '30%' } },
    { id: '5', title: 'Fleet Management', message: 'Add and manage your boats, equipment, and maintenance schedules.', position: { top: '50%', left: '60%' } },
    { id: '6', title: 'Set Availability', message: 'Use the Calendar to block dates and manage your schedule.', position: { bottom: '40%', right: '25%' } },
    { id: '7', title: 'Create Last-Minute Deals', message: 'Boost bookings by offering discounted rates for open dates!', position: { top: '35%', left: '45%' } },
    { id: '8', title: "You're All Set!", message: 'Start accepting bookings and growing your charter business. Good luck!', position: { top: '50%', left: '50%' } }
  ];

  const customerSteps: OnboardingStep[] = [
    { id: '1', title: 'Welcome Aboard!', message: "Hi! I'm Fishy! Let me show you how to book amazing charter experiences!", position: { top: '20%', left: '50%' } },
    { id: '2', title: 'Browse Charters', message: 'Explore hundreds of charter boats, fishing trips, and yacht tours!', position: { top: '30%', left: '25%' } },
    { id: '3', title: 'Use Filters', message: 'Filter by location, price, boat type, and more to find your perfect trip.', position: { top: '40%', right: '20%' } },
    { id: '4', title: 'Check Last-Minute Deals', message: 'Save big on same-day and next-day charters with special discounts!', position: { bottom: '35%', left: '30%' } },
    { id: '5', title: 'Read Reviews', message: 'See what other customers say and view captain ratings before booking.', position: { top: '45%', right: '30%' } },
    { id: '6', title: 'Book Instantly', message: 'Secure your spot with instant booking and receive confirmation immediately.', position: { bottom: '40%', left: '40%' } },
    { id: '7', title: 'Earn Rewards', message: 'Get points for bookings, reviews, and referrals. Redeem for discounts!', position: { top: '35%', left: '55%' } },
    { id: '8', title: 'Happy Fishing!', message: "You're ready to book your first adventure. Let's make some memories!", position: { top: '50%', left: '50%' } }
  ];

  const steps = userType === 'captain' ? captainSteps : customerSteps;

  useEffect(() => {
    setPosition(steps[currentStep].position);
  }, [currentStep, steps]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center pointer-events-none">
      <Card 
        className="pointer-events-auto w-80 p-4 shadow-2xl border-4 border-blue-400 animate-bounce-slow"
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          right: position.right,
          bottom: position.bottom,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="flex items-start gap-3 mb-3">
          <img 
            src="https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763545510842_6626974b.webp" 
            alt="Fishy" 
            className="w-16 h-16 rounded-full border-2 border-blue-400"
          />
          <div className="flex-1">
            <h3 className="font-bold text-lg text-blue-600">{steps[currentStep].title}</h3>
            <p className="text-sm text-gray-700">{steps[currentStep].message}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={handleSkip}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Step {currentStep + 1} of {steps.length}</span>
          <Button onClick={handleNext} size="sm">
            {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
