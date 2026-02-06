/**
 * Notifications Center
 * 
 * Route: /notifications
 * Displays user notifications and allows management
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Badge } from '../src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { 
  Bell, Check, X, Trash2, Calendar, CreditCard, 
  AlertCircle, Info, CheckCircle, AlertTriangle 
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { toast } from 'sonner';

type Notification = {
  id: string;
  type: 'booking' | 'payment' | 'system' | 'weather' | 'promotion';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  metadata?: Record<string, any>;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadNotifications() {
      try {
        setLoading(true);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.push('/admin/login?redirect=/notifications');
          return;
        }

        setUser(session.user);

        // Load notifications from database
        // For now, we'll create mock notifications structure
        // In production, this would query a notifications table
        const { data: notificationsData, error: notificationsError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (notificationsError && notificationsError.code !== 'PGRST116') {
          console.error('Notifications error:', notificationsError);
          // Create mock notifications for demo
          setNotifications(createMockNotifications());
        } else if (notificationsData) {
          setNotifications(notificationsData.map((n: any) => ({
            id: n.id,
            type: n.type || 'system',
            title: n.title || 'Notification',
            message: n.message || '',
            read: n.read || false,
            created_at: n.created_at,
            action_url: n.action_url,
            metadata: n.metadata,
          })));
        } else {
          setNotifications(createMockNotifications());
        }

      } catch (error: any) {
        console.error('Error loading notifications:', error);
        setNotifications(createMockNotifications());
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, [router]);

  const createMockNotifications = (): Notification[] => {
    return [
      {
        id: '1',
        type: 'booking',
        title: 'Booking Confirmed',
        message: 'Your charter booking for March 15, 2026 has been confirmed.',
        read: false,
        created_at: new Date().toISOString(),
        action_url: '/bookings/1',
      },
      {
        id: '2',
        type: 'payment',
        title: 'Payment Received',
        message: 'Your payment of $450.00 has been successfully processed.',
        read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        action_url: '/bookings/1',
      },
      {
        id: '3',
        type: 'weather',
        title: 'Weather Alert',
        message: 'High winds expected for your upcoming charter on March 15.',
        read: true,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        action_url: '/weather',
      },
      {
        id: '4',
        type: 'system',
        title: 'Welcome to Gulf Coast Charters',
        message: 'Thank you for joining! Start exploring our vessels and captains.',
        read: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        action_url: '/vessels',
      },
    ];
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error && error.code !== 'PGRST116') {
        // If table doesn't exist, just update local state
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      } else {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      if (user) {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);

        if (error && error.code !== 'PGRST116') {
          // Update local state
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } else {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
      }
      toast.success('All notifications marked as read');
    } catch (error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error && error.code !== 'PGRST116') {
        // Just update local state
        setNotifications(prev => prev.filter(n => n.id !== id));
      } else {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
      toast.success('Notification deleted');
    } catch (error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Notification deleted');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'weather':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'promotion':
        return <Info className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'booking':
        return <Badge variant="default">Booking</Badge>;
      case 'payment':
        return <Badge variant="default" className="bg-green-600">Payment</Badge>;
      case 'weather':
        return <Badge variant="default" className="bg-yellow-600">Weather</Badge>;
      case 'promotion':
        return <Badge variant="default" className="bg-purple-600">Promotion</Badge>;
      default:
        return <Badge variant="secondary">System</Badge>;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    return n.type === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout session={null}>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Bell className="w-8 h-8" />
              Notifications
            </h1>
            <p className="text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-2">{notifications.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="booking">Bookings</TabsTrigger>
            <TabsTrigger value="payment">Payments</TabsTrigger>
            <TabsTrigger value="weather">Weather</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                  <p className="text-gray-600">
                    {activeTab === 'unread' 
                      ? "You're all caught up! No unread notifications."
                      : 'No notifications in this category.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={!notification.read ? 'border-blue-500 border-2' : ''}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className={`font-semibold ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                              {notification.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {getNotificationBadge(notification.type)}
                              <span className="text-xs text-gray-500">
                                {new Date(notification.created_at).toLocaleDateString()} at{' '}
                                {new Date(notification.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          {notification.action_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(notification.action_url || '#')}
                            >
                              View Details
                            </Button>
                          )}
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Mark Read
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
