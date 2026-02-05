# Marketplace Notification Badge System

## Overview
The Marketplace Notification Badge displays unread message counts in the navigation bar and provides a dropdown preview of recent messages.

## Features

### 1. Real-Time Unread Count
- Polls for unread messages every 30 seconds
- Displays red badge with count on Marketplace button
- Shows "99+" for counts over 99

### 2. Message Preview Dropdown
- Click badge to view recent messages
- Shows up to 5 most recent unread messages
- Displays message text and timestamp
- "View All Messages" button opens full marketplace

### 3. Visual Design
- Red circular badge positioned on top-right of button
- White text on red background for high visibility
- Dropdown with shadow and border for depth
- Hover effects for interactivity

## Implementation

### Edge Function Endpoint
```javascript
// marketplace-manager function
case 'get_unread_count':
  - Counts unread messages for user
  - Returns top 5 recent messages
  - Sorted by most recent first
```

### Component Usage
```tsx
<MarketplaceNotificationBadge 
  userId="user-123" 
  onOpenMarketplace={() => setShowMarketplace(true)} 
/>
```

## Integration Points

### Navigation Bar
- Replaces standard Marketplace button
- Maintains all original functionality
- Adds notification badge overlay

### Polling System
- Fetches every 30 seconds automatically
- Cleans up interval on unmount
- Only polls when userId is provided

### Dropdown Behavior
- Toggles on badge click
- Closes when "View All Messages" clicked
- Positioned absolutely below button
- Z-index 50 for proper layering

## User Flow

1. **User receives message** → Push notification sent
2. **Badge updates** → Polls detect new unread message
3. **User clicks badge** → Dropdown shows preview
4. **User clicks "View All"** → Opens full marketplace
5. **User reads message** → Count decrements on next poll

## Styling

### Badge
- `bg-red-500 text-white`
- `text-xs px-1.5 py-0.5`
- `min-w-[20px] h-5`
- Absolute positioning: `-top-2 -right-2`

### Dropdown
- `w-80` fixed width
- `max-h-96` with scroll
- `shadow-xl border` for depth
- `bg-white rounded-lg`

## Performance

- Efficient polling interval (30s)
- Minimal data transfer (count + 5 messages)
- Automatic cleanup on unmount
- No unnecessary re-renders

## Future Enhancements

1. WebSocket integration for instant updates
2. Mark as read from dropdown
3. Filter by listing/sender
4. Sound notifications
5. Browser notification permission
