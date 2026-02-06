/**
 * Rain Check Display Component
 * Shows rain check details and allows redemption
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CloudRain, Calendar, DollarSign, User, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface RainCheck {
  rain_check_id: string;
  code: string;
  value: number;
  remaining_balance: number;
  issued_date: string;
  expiration_date: string;
  status: string;
  cancellation_reason?: string;
  captain_message?: string;
  captains?: { name?: string };
  bookings?: { trip_type?: string };
}

interface RainCheckDisplayProps {
  rainCheck: RainCheck;
  onRedeem?: (code: string) => void;
}

export default function RainCheckDisplay({ rainCheck, onRedeem }: RainCheckDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rainCheck.code);
    setCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = new Date(rainCheck.expiration_date) < new Date();
  const isActive = rainCheck.status === 'active' && !isExpired;

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="w-6 h-6 text-blue-600" />
            Rain Check
          </CardTitle>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
            isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {isActive ? 'Active' : rainCheck.status}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="text-center border-b pb-4">
          <div className="text-2xl font-mono font-bold text-blue-600 mb-2">
            {rainCheck.code}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="mt-2"
          >
            {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>Value:</span>
            </div>
            <span className="font-semibold">${rainCheck.value.toFixed(2)}</span>
          </div>

          {rainCheck.remaining_balance < rainCheck.value && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="w-4 h-4" />
                <span>Remaining:</span>
              </div>
              <span className="font-semibold text-green-600">
                ${rainCheck.remaining_balance.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Issued:</span>
            </div>
            <span>{new Date(rainCheck.issued_date).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Expires:</span>
            </div>
            <span className={isExpired ? 'text-red-600 font-semibold' : ''}>
              {new Date(rainCheck.expiration_date).toLocaleDateString()}
            </span>
          </div>

          {rainCheck.captains && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>Captain:</span>
              </div>
              <span>{rainCheck.captains.name || 'N/A'}</span>
            </div>
          )}

          {rainCheck.cancellation_reason && (
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600 mb-1">Cancellation Reason:</p>
              <p className="text-sm">{rainCheck.cancellation_reason}</p>
            </div>
          )}

          {rainCheck.captain_message && (
            <div className="pt-2 border-t">
              <p className="text-sm text-gray-600 mb-1">Captain's Message:</p>
              <p className="text-sm italic">{rainCheck.captain_message}</p>
            </div>
          )}
        </div>

        {isActive && (
          <Button
            className="w-full mt-4"
            onClick={() => onRedeem?.(rainCheck.code)}
          >
            Rebook Now
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
