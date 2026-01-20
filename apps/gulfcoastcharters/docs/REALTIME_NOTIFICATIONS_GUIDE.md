# Real-Time Notification System Guide

## Overview
Gulf Coast Charters now has a comprehensive real-time notification system using Supabase realtime subscriptions. Users receive instant notifications for bookings, messages, reviews, payments, and system alerts.

## Features

### 1. Real-Time Updates
- **Instant Delivery**: Notifications appear immediately using Supabase realtime subscriptions
- **Live Badge Counter**: Unread count updates in real-time on the bell icon
- **Toast Notifications**: New notifications show as toast messages
- **Auto-Refresh**: Notification list updates automatically

### 2. Notification Types
- **Booking Updates**: Confirmations, cancellations, modifications
- **Messages**: New messages from captains or customers
- **Reviews**: New reviews received
- **Payment Updates**: Payment confirmations, refunds
- **System Alerts**: Important platform announcements

### 3. User Preferences
Users can customize their notification settings:
- Enable/disable specific notification types
- Choose delivery methods (email, push, SMS)
- Marketing preferences
- Accessible at `/notifications` under Preferences tab

### 4. Notification Center
Full-featured notification management:
- View all notifications with filtering
- Search notifications
- Mark as read/unread
- Delete notifications
- Filter by unread only
- Click to navigate to related content

## Usage

### For Developers

#### Creating Notifications

```typescript
import { createNotification, NotificationTemplates } from '@/utils/createNotification';

// Using templates
await createNotification({
  userId: user.id,
  ...NotificationTemplates.bookingConfirmed(bookingId, 'Sunset Fishing Charter')
});

// Custom notification
await createNotification({
  userId: user.id,
  type: 'booking',
  title: 'Booking Reminder',
  message: 'Your charter is tomorrow at 8:00 AM',
  link: `/bookings/${bookingId}`,
  data: { bookingId }
});
```

#### Using the Hook

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { 
    notifications, 
    unreadCount, 
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification 
  } = useNotifications();

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      {notifications.map(notif => (
        <div key={notif.id} onClick={() => markAsRead(notif.id)}>
          {notif.title}
        </div>
      ))}
    </div>
  );
}
```

### For Users

#### Accessing Notifications
1. Click the bell icon in the navigation bar
2. View recent notifications in the dropdown
3. Click "View all notifications" for full history
4. Click any notification to navigate to related content

#### Managing Preferences
1. Go to `/notifications`
2. Click the "Preferences" tab
3. Toggle notification types on/off
4. Choose delivery methods
5. Click "Save Preferences"

## Database Schema

### notifications table
- `id`: UUID primary key
- `user_id`: Reference to auth.users
- `type`: Notification type (booking, message, review, system, payment)
- `title`: Notification title
- `message`: Notification message
- `link`: Optional link to related content
- `read`: Boolean read status
- `data`: JSONB for additional data
- `created_at`: Timestamp
- `read_at`: Timestamp when marked as read

### notification_preferences table
- `id`: UUID primary key
- `user_id`: Reference to auth.users (unique)
- `booking_updates`: Boolean
- `messages`: Boolean
- `reviews`: Boolean
- `system_alerts`: Boolean
- `payment_updates`: Boolean
- `marketing`: Boolean
- `email_notifications`: Boolean
- `push_notifications`: Boolean
- `sms_notifications`: Boolean

## Edge Function

### notification-manager
Handles all notification operations:
- `create`: Create new notification (checks user preferences)
- `markRead`: Mark notification as read
- `markAllRead`: Mark all user notifications as read
- `delete`: Delete a notification

## Components

### NotificationBell
- Bell icon with badge counter
- Dropdown showing 5 most recent notifications
- "Mark all as read" button
- Link to full notification center

### NotificationCenter
- Full notification list with search
- Filter by all/unread
- Delete individual notifications
- Click to navigate to related content

### NotificationPreferences
- Toggle switches for each notification type
- Delivery method preferences
- Save/update preferences

## Integration Examples

### Booking Confirmation
```typescript
// In booking confirmation handler
await createNotification({
  userId: customerId,
  ...NotificationTemplates.bookingConfirmed(booking.id, charter.name)
});
```

### New Message
```typescript
// In messaging system
await createNotification({
  userId: recipientId,
  ...NotificationTemplates.newMessage(senderId, senderName)
});
```

### Payment Received
```typescript
// In payment webhook
await createNotification({
  userId: captainId,
  ...NotificationTemplates.paymentReceived(amount, bookingId)
});
```

## Best Practices

1. **Check Preferences**: The edge function automatically checks user preferences
2. **Provide Links**: Always include a link to related content when possible
3. **Use Templates**: Use predefined templates for consistency
4. **Include Data**: Store relevant IDs in the data field for future reference
5. **Clear Messages**: Write concise, actionable notification messages

## Testing

### Test Notification Creation
```typescript
// In browser console or test file
import { createNotification } from '@/utils/createNotification';

await createNotification({
  userId: 'your-user-id',
  type: 'system',
  title: 'Test Notification',
  message: 'This is a test notification',
  link: '/'
});
```

### Test Real-Time Updates
1. Open two browser windows
2. Login as the same user in both
3. Create a notification in one window
4. Watch it appear in real-time in the other window

## Troubleshooting

### Notifications Not Appearing
1. Check user is logged in
2. Verify Supabase connection
3. Check browser console for errors
4. Ensure notification preferences allow the type

### Real-Time Not Working
1. Check Supabase realtime is enabled
2. Verify subscription is active
3. Check network tab for websocket connection
4. Ensure RLS policies are correct

## Future Enhancements
- Push notification support (web push API)
- SMS notifications via Twilio
- Email notifications
- Notification grouping
- Notification scheduling
- Rich notifications with images
- Sound notifications
- Desktop notifications

## Support
For issues or questions, contact the development team or check the documentation at `/developer-onboarding`.
