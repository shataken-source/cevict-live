import { CheckCircle, Clock, Ship, Star, XCircle } from 'lucide-react';
import { Badge } from './ui/badge';

interface BookingStatusTrackerProps {
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'reviewed';
  bookingDate: string;
}

export default function BookingStatusTracker({ status, bookingDate }: BookingStatusTrackerProps) {
  const steps = [
    { key: 'pending', label: 'Pending', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'in-progress', label: 'In Progress', icon: Ship },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
    { key: 'reviewed', label: 'Reviewed', icon: Star }
  ];

  const statusIndex = steps.findIndex(s => s.key === status);
  const isCancelled = status === 'cancelled';

  return (
    <div className="w-full py-6">
      {isCancelled ? (
        <div className="flex items-center justify-center gap-3 text-red-600">
          <XCircle className="w-8 h-8" />
          <span className="text-lg font-semibold">Booking Cancelled</span>
        </div>
      ) : (
        <div className="flex items-center justify-between relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= statusIndex;
            return (
              <div key={step.key} className="flex flex-col items-center flex-1 relative">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'} z-10`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-xs mt-2 font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{step.label}</span>
                {index < steps.length - 1 && (
                  <div className={`absolute top-6 left-1/2 w-full h-0.5 ${index < statusIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
