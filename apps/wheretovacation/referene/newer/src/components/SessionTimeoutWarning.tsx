import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  remainingSeconds: number;
  onExtend: () => void;
  onLogout: () => void;
}

export function SessionTimeoutWarning({
  isOpen,
  remainingSeconds,
  onExtend,
  onLogout
}: SessionTimeoutWarningProps) {
  const [timeLeft, setTimeLeft] = useState(remainingSeconds);

  useEffect(() => {
    setTimeLeft(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onLogout]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressValue = (timeLeft / remainingSeconds) * 100;


  return (

    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md border-t-4 border-t-amber-500">
        <DialogHeader className="bg-gradient-to-r from-amber-500 to-orange-500 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle className="text-white">Session Expiring Soon</DialogTitle>
          </div>
          <DialogDescription className="text-amber-50">
            Your Gulf Coast Charters session will expire due to inactivity. Stay logged in to continue managing your bookings.
          </DialogDescription>
        </DialogHeader>


        <div className="space-y-4 py-4">
          <div className="flex items-center justify-center gap-2 text-4xl font-bold text-amber-600">
            <Clock className="h-8 w-8" />
            <span>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>

          <Progress value={progressValue} className="h-2" />

          <p className="text-sm text-center text-muted-foreground">
            Click "Stay Logged In" to continue your session, or you will be automatically logged out.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onLogout} className="w-full sm:w-auto">
            Logout Now
          </Button>
          <Button onClick={onExtend} className="w-full sm:w-auto">
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SessionTimeoutWarning;
