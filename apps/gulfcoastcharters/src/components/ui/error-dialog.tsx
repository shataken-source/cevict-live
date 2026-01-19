import { AlertCircle, Anchor } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
}

export function ErrorDialog({ open, onOpenChange, title, message }: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2 rounded-full">
              <Anchor className="text-white" size={24} />
            </div>
            <DialogTitle className="text-2xl text-blue-900">
              {title || 'Oops! Something went wrong'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-700 space-y-3">
            <div className="flex items-start gap-2 bg-white p-4 rounded-lg border border-blue-200">
              <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
              <p className="text-sm">
                {message || 'We encountered an unexpected issue. Our team has been notified and is working on it.'}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">
                🚢 We're working on it!
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Gulf Coast Charters team is on deck and fixing this issue. Please try again in a few moments.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}