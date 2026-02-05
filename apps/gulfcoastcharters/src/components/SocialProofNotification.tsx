import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

export default function SocialProofNotification() {
  const [visible, setVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(0);

  const notifications = [
    { name: 'Sarah M.', action: 'booked a Deep Sea Charter', location: 'Tampa, FL', time: '2 minutes ago' },
    { name: 'Mike T.', action: 'booked an Inshore Trip', location: 'Galveston, TX', time: '5 minutes ago' },
    { name: 'Jessica L.', action: 'booked a Sunset Cruise', location: 'Biloxi, MS', time: '8 minutes ago' }
  ];

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 3000);
    const hideTimer = setTimeout(() => setVisible(false), 8000);
    const cycleTimer = setInterval(() => {
      setCurrentNotification(prev => (prev + 1) % notifications.length);
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    }, 15000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearInterval(cycleTimer);
    };
  }, []);

  const notif = notifications[currentNotification];

  return (
    <div className={`fixed bottom-6 left-6 z-50 transition-all duration-500 ${visible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}>
      <div className="bg-white rounded-lg shadow-2xl p-4 max-w-sm border-l-4 border-green-500">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-900">{notif.name} {notif.action}</p>
            <p className="text-sm text-gray-600">{notif.location}</p>
            <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
