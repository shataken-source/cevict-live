# Web Push Notifications Guide

## Overview
Gulf Coast Charters now supports browser push notifications using the Web Push API and service workers. Users can receive instant notifications even when the website is closed.

## Features
- ✅ Browser push notification support
- ✅ Permission request prompts
- ✅ Push subscription management
- ✅ Database storage of subscriptions
- ✅ Automatic push on notification creation
- ✅ Service worker notification handling
- ✅ Notification click handling
- ✅ Multi-device support

## Database Schema

### push_subscriptions Table
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- endpoint: TEXT (unique per user)
- p256dh: TEXT (encryption key)
- auth: TEXT (authentication secret)
- user_agent: TEXT (browser info)
- created_at: TIMESTAMPTZ
- last_used_at: TIMESTAMPTZ
```

## Edge Functions

### push-notification-service
Handles push notification subscriptions and sending.

**Actions:**
- `subscribe`: Store push subscription
- `unsubscribe`: Remove push subscription
- `send`: Send push notification to user's devices

**Example Usage:**
```typescript
// Subscribe to push notifications
const { data } = await supabase.functions.invoke('push-notification-service', {
  body: {
    action: 'subscribe',
    userId: user.id,
    subscription: pushSubscription.toJSON()
  }
});

// Unsubscribe
await supabase.functions.invoke('push-notification-service', {
  body: {
    action: 'unsubscribe',
    userId: user.id,
    subscription: pushSubscription.toJSON()
  }
});
```

## Components

### PushNotificationManager
Main component for managing push subscriptions.

**Features:**
- Browser support detection
- Permission status display
- Subscribe/unsubscribe buttons
- Error handling
- Toast notifications

**Usage:**
```tsx
import { PushNotificationManager } from '@/components/PushNotificationManager';

<PushNotificationManager />
```

### NotificationPreferences (Updated)
Now includes PushNotificationManager for complete notification settings.

## Utility Functions

### pushNotifications.ts
Helper functions for push notification management.

**Functions:**
- `isPushSupported()`: Check browser support
- `getPushPermission()`: Get current permission status
- `requestPushPermission()`: Request permission
- `subscribeToPush(userId)`: Subscribe to push notifications
- `unsubscribeFromPush(userId)`: Unsubscribe
- `getCurrentSubscription()`: Get active subscription

**Example:**
```typescript
import { subscribeToPush, isPushSupported } from '@/utils/pushNotifications';

// Check support
const supported = await isPushSupported();

// Subscribe
if (supported) {
  const subscription = await subscribeToPush(user.id);
}
```

## Service Worker

### Push Event Handler
The service worker handles incoming push notifications.

**Notification Types:**
- `booking`: Booking updates
- `message`: New messages
- `review`: Review notifications
- `payment`: Payment updates
- `system`: System alerts
- `weather`: Weather alerts
- `reminder`: Reminders

**Example Push Payload:**
```json
{
  "type": "booking",
  "title": "Booking Confirmed",
  "body": "Your charter booking has been confirmed",
  "url": "/customer/dashboard",
  "notificationId": "uuid",
  "data": {
    "bookingId": "uuid"
  }
}
```

### Notification Click Handler
Automatically opens the app when notification is clicked.

## Integration with Notification System

When a notification is created via `notification-manager`, it automatically:
1. Checks user preferences
2. Creates database notification
3. Sends push notification if enabled
4. Updates subscription last_used_at

## Setup Instructions

### 1. Enable Service Worker
Service worker is already registered in the app. Ensure it's active:
```javascript
// Check in browser console
navigator.serviceWorker.getRegistration()
```

### 2. Request Permission
Users must grant permission for push notifications:
```typescript
const permission = await Notification.requestPermission();
// 'granted', 'denied', or 'default'
```

### 3. Subscribe User
Use PushNotificationManager component or utility functions:
```typescript
import { subscribeToPush } from '@/utils/pushNotifications';

const subscription = await subscribeToPush(user.id);
```

### 4. Send Notifications
Notifications are sent automatically when created:
```typescript
await supabase.functions.invoke('notification-manager', {
  body: {
    action: 'create',
    userId: targetUserId,
    type: 'booking',
    title: 'Booking Confirmed',
    message: 'Your charter has been confirmed',
    link: '/customer/dashboard'
  }
});
```

## VAPID Keys (Production Setup)

For production, generate your own VAPID keys:

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Update the keys in:
1. `src/utils/pushNotifications.ts` (public key)
2. Edge function environment (private key)

## Browser Support

**Supported:**
- Chrome 50+
- Firefox 44+
- Edge 17+
- Safari 16+ (macOS 13+)
- Opera 37+

**Not Supported:**
- iOS Safari (before iOS 16.4)
- Internet Explorer

## Testing

### Test Push Notifications

1. **Enable in Preferences:**
   - Go to /notifications
   - Click "Preferences" tab
   - Enable "Push Notifications"
   - Click "Enable" in Push Notification Manager

2. **Trigger Test Notification:**
```typescript
await supabase.functions.invoke('notification-manager', {
  body: {
    action: 'create',
    userId: user.id,
    type: 'system',
    title: 'Test Notification',
    message: 'This is a test push notification',
    link: '/notifications'
  }
});
```

3. **Check Browser:**
   - Notification should appear even if tab is in background
   - Click notification to open app

## Troubleshooting

### Permission Denied
If user denied permission:
1. Clear site data in browser settings
2. Reload page
3. Request permission again

Or instruct user to:
1. Click lock icon in address bar
2. Change notification permission to "Allow"
3. Reload page

### Notifications Not Appearing
1. Check service worker is active
2. Verify subscription exists in database
3. Check user preferences (push_notifications enabled)
4. Verify browser supports push notifications
5. Check browser notification settings

### Subscription Failed
1. Ensure HTTPS (required for push)
2. Check service worker registration
3. Verify VAPID keys are correct
4. Check browser console for errors

## Security

- Push subscriptions are user-specific
- Subscriptions stored securely in database
- RLS policies protect subscription data
- VAPID keys authenticate push messages
- Subscriptions expire and are cleaned up

## Best Practices

1. **Request Permission Contextually:**
   - Don't request on page load
   - Explain benefits first
   - Use PushNotificationManager component

2. **Respect User Preferences:**
   - Honor notification preferences
   - Provide easy unsubscribe
   - Don't spam notifications

3. **Handle Errors Gracefully:**
   - Check browser support
   - Handle permission denial
   - Provide fallback to in-app notifications

4. **Clean Up Old Subscriptions:**
   - Remove invalid subscriptions
   - Update last_used_at timestamp
   - Handle unsubscribe properly

## Future Enhancements

- [ ] Notification action buttons
- [ ] Rich media notifications (images)
- [ ] Notification grouping
- [ ] Scheduled notifications
- [ ] A/B testing for notification content
- [ ] Analytics for notification engagement
- [ ] Custom notification sounds
- [ ] Notification templates

## Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [VAPID Protocol](https://tools.ietf.org/html/rfc8292)
