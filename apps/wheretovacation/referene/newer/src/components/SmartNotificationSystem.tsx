import { useState } from 'react';
import { Bell, Cloud, DollarSign, Calendar, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  type: 'weather' | 'price' | 'availability' | 'booking';
  title: string;
  message: string;
  time: string;
}

export default function SmartNotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', type: 'weather', title: 'Weather Alert', message: 'Perfect conditions for fishing tomorrow!', time: '2 hours ago' },
    { id: '2', type: 'price', title: 'Price Drop', message: 'Captain Mike reduced rates by 15% this weekend', time: '5 hours ago' },
    { id: '3', type: 'availability', title: 'Captain Available', message: 'Your favorite captain has new slots open', time: '1 day ago' }
  ]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'weather': return <Cloud className="w-5 h-5 text-blue-600" />;
      case 'price': return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'availability': return <Calendar className="w-5 h-5 text-purple-600" />;
      default: return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-2">
      {notifications.map((notif) => (
        <Card key={notif.id} className="p-4">
          <div className="flex items-start gap-3">
            {getIcon(notif.type)}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{notif.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{notif.time}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeNotification(notif.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
