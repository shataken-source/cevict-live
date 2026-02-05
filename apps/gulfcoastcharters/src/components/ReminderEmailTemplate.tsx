import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, Mail } from 'lucide-react';

interface ReminderEmailTemplateProps {
  type: 'week_before' | '24h_before' | 'follow_up';
  booking: {
    customer_name: string;
    charter_name: string;
    booking_date: string;
    location: string;
    boat_type: string;
  };
}

export const ReminderEmailTemplate: React.FC<ReminderEmailTemplateProps> = ({ type, booking }) => {
  const templates = {
    week_before: {
      title: 'Your Charter is Coming Up!',
      color: 'bg-blue-500',
      icon: <Calendar className="w-8 h-8" />,
      message: 'This is a friendly reminder that your charter booking is coming up in one week!'
    },
    '24h_before': {
      title: 'Your Charter is Tomorrow!',
      color: 'bg-amber-500',
      icon: <Clock className="w-8 h-8" />,
      message: 'Just a quick reminder that your charter is scheduled for tomorrow!'
    },
    follow_up: {
      title: 'How Was Your Trip?',
      color: 'bg-green-500',
      icon: <Mail className="w-8 h-8" />,
      message: `We hope you had an amazing time on your charter with ${booking.charter_name}!`
    }
  };

  const template = templates[type];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className={`${template.color} text-white`}>
        <div className="flex items-center gap-3">
          {template.icon}
          <CardTitle className="text-2xl">{template.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-lg">Hi {booking.customer_name},</p>
        <p>{template.message}</p>

        {type !== 'follow_up' && (
          <Card className="bg-gray-50">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg text-blue-600">Booking Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Charter:</strong> {booking.charter_name}</p>
                <p><strong>Date:</strong> {new Date(booking.booking_date).toLocaleDateString()}</p>
                <p><strong>Location:</strong> {booking.location}</p>
                <p><strong>Boat:</strong> {booking.boat_type}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {type === '24h_before' && (
          <div className="space-y-2">
            <p className="font-semibold">Important reminders:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Arrive 15 minutes early</li>
              <li>Bring sunscreen and appropriate clothing</li>
              <li>Don't forget your ID and confirmation</li>
            </ul>
          </div>
        )}

        {type === 'follow_up' && (
          <div className="text-center py-4">
            <p className="mb-4">We'd love to hear about your experience!</p>
            <button className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600">
              Leave a Review
            </button>
          </div>
        )}

        <p className="text-sm text-gray-600">
          {type === 'follow_up' 
            ? 'Thank you for choosing Charter Connect. We hope to see you again soon!'
            : type === '24h_before'
            ? 'Have a fantastic trip!'
            : 'We\'re excited to see you soon!'}
        </p>
      </CardContent>
    </Card>
  );
};
