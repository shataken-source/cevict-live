'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  MessageSquare, 
  Heart, 
  Trophy, 
  Camera, 
  Star,
  Users,
  Calendar,
  Clock,
  ChevronRight,
  Settings,
  Filter,
  MarkAsRead,
  Trash2,
  Archive,
  Flag,
  MoreVertical,
  Zap,
  Gift,
  Fish,
  Award,
  TrendingUp,
  AlertCircle,
  Info,
  CheckCircle
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'new_catch' | 'leaderboard' | 'community' | 'achievement' | 'reminder' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionText?: string;
  metadata?: {
    userName?: string;
    fishType?: string;
    weight?: string;
    rank?: number;
    category?: string;
  };
}

interface NotificationSettings {
  newCatch: boolean;
  leaderboardUpdates: boolean;
  communityMentions: boolean;
  achievements: boolean;
  reminders: boolean;
  announcements: boolean;
}

export default function CommunityNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'new_catch',
      title: 'New Catch Alert!',
      message: 'The Johnson Group just caught a massive 15.2 lb Red Snapper with Captain Mike!',
      timestamp: '2 minutes ago',
      read: false,
      priority: 'high',
      actionUrl: '/community/brag-board',
      actionText: 'View Catch',
      metadata: {
        userName: 'The Johnson Group',
        fishType: 'Red Snapper',
        weight: '15.2 lb'
      }
    },
    {
      id: '2',
      type: 'leaderboard',
      title: 'Leaderboard Update!',
      message: 'Congratulations! You moved up to #3 in the Biggest Snapper leaderboard this week.',
      timestamp: '15 minutes ago',
      read: false,
      priority: 'medium',
      actionUrl: '/community/brag-board',
      actionText: 'View Leaderboard',
      metadata: {
        rank: 3,
        category: 'Biggest Snapper'
      }
    },
    {
      id: '3',
      type: 'community',
      title: 'New Comment',
      message: 'Sarah Johnson commented on your Cook Your Catch review at Tacky Jacks',
      timestamp: '1 hour ago',
      read: false,
      priority: 'medium',
      actionUrl: '/community/cook-catch',
      actionText: 'View Comment',
      metadata: {
        userName: 'Sarah Johnson'
      }
    },
    {
      id: '4',
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: 'You earned the "First Catch" badge for sharing your first successful catch!',
      timestamp: '2 hours ago',
      read: true,
      priority: 'high',
      actionUrl: '/profile/achievements',
      actionText: 'View Badge'
    },
    {
      id: '5',
      type: 'reminder',
      title: 'Fishing Trip Tomorrow',
      message: 'Don\'t forget your fishing trip with Captain Sarah tomorrow at 7:00 AM',
      timestamp: '3 hours ago',
      read: true,
      priority: 'medium',
      actionUrl: '/bookings',
      actionText: 'View Details'
    },
    {
      id: '6',
      type: 'announcement',
      title: 'Community Challenge',
      message: 'Join our November Fishing Challenge - biggest catch wins a free charter!',
      timestamp: '1 day ago',
      read: true,
      priority: 'low',
      actionUrl: '/community/challenges',
      actionText: 'Join Challenge'
    }
  ]);

  const [settings, setSettings] = useState<NotificationSettings>({
    newCatch: true,
    leaderboardUpdates: true,
    communityMentions: true,
    achievements: true,
    reminders: true,
    announcements: false
  });

  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Simulate real-time notifications
    const interval = setInterval(() => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: 'new_catch',
        title: 'Live Catch Alert!',
        message: `Someone just caught a fish!`,
        timestamp: 'Just now',
        read: false,
        priority: 'medium'
      };
      
      // Random chance of new notification
      if (Math.random() > 0.8) {
        setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_catch':
        return <Fish className="w-5 h-5 text-blue-600" />;
      case 'leaderboard':
        return <Trophy className="w-5 h-5 text-yellow-600" />;
      case 'community':
        return <MessageSquare className="w-5 h-5 text-green-600" />;
      case 'achievement':
        return <Award className="w-5 h-5 text-purple-600" />;
      case 'reminder':
        return <Calendar className="w-5 h-5 text-orange-600" />;
      case 'announcement':
        return <Info className="w-5 h-5 text-gray-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'important') return notification.priority === 'high';
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-6 h-6 text-gray-900" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
              <p className="text-sm text-gray-600">Stay updated with community activity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={markAllAsRead}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={unreadCount === 0}
            >
              <CheckCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('important')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'important'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Important
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-6 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-4">Notification Preferences</h3>
          <div className="space-y-3">
            {Object.entries({
              newCatch: 'New catch alerts',
              leaderboardUpdates: 'Leaderboard updates',
              communityMentions: 'Community mentions',
              achievements: 'Achievements & badges',
              reminders: 'Trip reminders',
              announcements: 'Community announcements'
            }).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  type="checkbox"
                  checked={settings[key as keyof NotificationSettings]}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    [key]: e.target.checked
                  }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="divide-y">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">
              {filter === 'unread' ? 'All caught up!' : 'No notifications to show'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${getPriorityColor(notification.priority)} ${
                !notification.read ? 'border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium text-gray-900 mb-1 ${
                        !notification.read ? 'font-semibold' : ''
                      }`}>
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      {notification.metadata && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {notification.metadata.userName && (
                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              <Users className="w-3 h-3 mr-1" />
                              {notification.metadata.userName}
                            </span>
                          )}
                          {notification.metadata.fishType && (
                            <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              <Fish className="w-3 h-3 mr-1" />
                              {notification.metadata.fishType}
                            </span>
                          )}
                          {notification.metadata.weight && (
                            <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {notification.metadata.weight}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notification.timestamp}
                        </span>
                        {notification.actionUrl && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            {notification.actionText}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </p>
            <button
              onClick={() => setNotifications([])}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
