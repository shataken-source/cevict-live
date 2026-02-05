'use client';

/**
 * Notification Center
 * Real-time alerts for high-value picks, line movements, and arbitrage opportunities
 */

import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: 'pick' | 'movement' | 'arbitrage' | 'result' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // Load initial notifications
    setNotifications(getSampleNotifications());
    
    // Simulate real-time notifications
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        addRandomNotification();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getSampleNotifications = (): Notification[] => [
    {
      id: '1',
      type: 'pick',
      title: '🔥 High Confidence Pick',
      message: 'Chiefs -3 vs Raiders (82% confidence) - Value detected!',
      timestamp: new Date(Date.now() - 300000),
      read: false,
      priority: 'high',
      actionUrl: '/create-prediction'
    },
    {
      id: '2',
      type: 'arbitrage',
      title: '💰 Arbitrage Opportunity',
      message: 'Bills ML: 2.3% guaranteed profit across DraftKings/FanDuel',
      timestamp: new Date(Date.now() - 600000),
      read: false,
      priority: 'high',
      actionUrl: '/arbitrage'
    },
    {
      id: '3',
      type: 'movement',
      title: '📈 Line Movement Alert',
      message: 'Lakers spread moved from -2.5 to -4.0 - Sharp action detected',
      timestamp: new Date(Date.now() - 900000),
      read: true,
      priority: 'medium'
    },
    {
      id: '4',
      type: 'result',
      title: '✅ Pick Result',
      message: 'Your pick won! Celtics -6.5 ✓ Final: Celtics 118, Heat 105',
      timestamp: new Date(Date.now() - 1800000),
      read: true,
      priority: 'low'
    },
    {
      id: '5',
      type: 'system',
      title: '🤖 Claude Effect Updated',
      message: 'New model trained on 10,000 additional games',
      timestamp: new Date(Date.now() - 3600000),
      read: true,
      priority: 'low'
    },
  ];

  const addRandomNotification = () => {
    const types: Array<Notification['type']> = ['pick', 'movement', 'arbitrage'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const newNotifications: Record<Notification['type'], Partial<Notification>> = {
      pick: {
        title: '🎯 New Pick Available',
        message: 'High confidence pick generated for tonight\'s games',
        priority: 'high' as const
      },
      movement: {
        title: '📊 Line Movement',
        message: 'Significant line movement detected in NBA markets',
        priority: 'medium' as const
      },
      arbitrage: {
        title: '💰 Arbitrage Alert',
        message: 'New arbitrage opportunity found!',
        priority: 'high' as const
      },
      result: {
        title: '📋 Result',
        message: 'A recent pick has been graded',
        priority: 'low' as const
      },
      system: {
        title: '⚙️ System Update',
        message: 'New features available',
        priority: 'low' as const
      }
    };

    const notification: Notification = {
      id: Date.now().toString(),
      type,
      ...newNotifications[type],
      title: newNotifications[type].title || 'Notification',
      message: newNotifications[type].message || '',
      timestamp: new Date(),
      read: false,
      priority: newNotifications[type].priority || 'medium'
    };

    setNotifications(prev => [notification, ...prev]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'pick': return '🎯';
      case 'movement': return '📈';
      case 'arbitrage': return '💰';
      case 'result': return '✅';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {filter === 'all' ? 'Show Unread' : 'Show All'}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-white/40 hover:text-white/60"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[380px] overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-white/40">
                  <div className="text-4xl mb-2">🔔</div>
                  <p>No notifications</p>
                </div>
              ) : (
                filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                    className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 ${
                      !notification.read ? 'bg-purple-500/10' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                        notification.priority === 'high' ? 'bg-red-500/20' :
                        notification.priority === 'medium' ? 'bg-yellow-500/20' :
                        'bg-white/10'
                      }`}>
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${notification.read ? 'text-white/70' : 'text-white'}`}>
                            {notification.title}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-purple-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-white/50 truncate">{notification.message}</p>
                        <span className="text-xs text-white/30">{getTimeAgo(notification.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 text-center">
              <button className="text-sm text-purple-400 hover:text-purple-300">
                View All Notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

