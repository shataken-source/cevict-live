import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  type: 'booking' | 'message' | 'review' | 'system' | 'payment';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  data?: Record<string, unknown>;

  created_at: string;
  read_at?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.read).length || 0);
      }
      setLoading(false);
    };

    fetchNotifications();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast for new notification
        toast({
          title: newNotification.title,
          description: newNotification.message,
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        const updated = payload.new as Notification;
        setNotifications(prev => 
          prev.map(n => n.id === updated.id ? updated : n)
        );
        if (updated.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const markAsRead = async (notificationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.functions.invoke('notification-manager', {
      body: { action: 'markRead', userId: user.id, notificationId }
    });

    if (error) console.error('Error marking notification as read:', error);
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.functions.invoke('notification-manager', {
      body: { action: 'markAllRead', userId: user.id, markAllRead: true }
    });

    if (error) console.error('Error marking all as read:', error);
  };

  const deleteNotification = async (notificationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.functions.invoke('notification-manager', {
      body: { action: 'delete', userId: user.id, notificationId }
    });

    if (error) console.error('Error deleting notification:', error);
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };
}
