import { useState, useEffect } from 'react';
import { ShoppingBag, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MarketplaceNotificationBadgeProps {
  userId: string;
  onOpenMarketplace: () => void;
}

export default function MarketplaceNotificationBadge({ userId, onOpenMarketplace }: MarketplaceNotificationBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentMessages, setRecentMessages] = useState<Array<{ id: string; message_text: string; created_at: string }>>([]);

  const [showDropdown, setShowDropdown] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'get_unread_count', user_id: userId }
      });
      if (!error && data) {
        setUnreadCount(data.unreadCount || 0);
        setRecentMessages(data.recentMessages || []);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [userId, fetchUnreadCount]);


  return (
    <div className="relative">
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="hover:text-blue-100 flex items-center gap-1 relative"
      >
        <ShoppingBag className="w-4 h-4" />
        Marketplace
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </button>

      {showDropdown && unreadCount > 0 && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-3 border-b bg-gray-50 rounded-t-lg">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Recent Messages ({unreadCount})
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recentMessages.map((msg) => (
              <div key={msg.id} className="p-3 border-b hover:bg-gray-50 cursor-pointer">
                <p className="text-sm text-gray-900 font-medium truncate">{msg.message_text}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="p-3 bg-gray-50 rounded-b-lg">
            <Button 
              onClick={() => { setShowDropdown(false); onOpenMarketplace(); }} 
              className="w-full"
              size="sm"
            >
              View All Messages
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
