# Marketplace Real-Time Messaging System

## Overview
Real-time buyer-seller messaging within the marketplace with image sharing, typing indicators, read receipts, quick replies, and push notifications.

## Features Implemented

### 1. **Message Threads**
- Unique thread IDs per listing-buyer-seller combination
- Message history with timestamps
- Real-time message updates (3-second polling)
- Auto-scroll to latest messages

### 2. **Image Sharing**
- Upload images in conversations
- Images stored in `review-photos` bucket
- Image preview in chat bubbles
- File selection via button

### 3. **Typing Indicators**
- Real-time typing status
- 5-second expiration (auto-cleanup)
- "Typing..." indicator shown to other party

### 4. **Read Receipts**
- Double checkmark for read messages
- Auto-mark messages as read when viewing thread
- Visual indicator for sender

### 5. **Quick Reply Templates**
- Pre-written common questions:
  - "Is this still available?"
  - "What's your best price?"
  - "Can you ship this?"
  - "When can I pick it up?"
- One-click send

### 6. **Push Notifications**
- Automatic notifications for new messages
- Integrated with push-notification-service
- Includes thread and listing context

## Usage

### Buyer: Message Seller
```typescript
// From listing detail page
<Button onClick={() => setShowMessenger(true)}>
  Message Seller
</Button>
```

### Seller: View Messages
Messages accessible from marketplace dashboard or listing management panel.

### Send Message with Image
1. Click image icon
2. Select image file
3. Type message (optional)
4. Click send

## API Endpoints

### Send Message
```typescript
await supabase.functions.invoke('marketplace-manager', {
  body: {
    action: 'send_message',
    listing_id: 'uuid',
    sender_id: 'uuid',
    receiver_id: 'uuid',
    message_text: 'Hello',
    image_url: 'https://...' // optional
  }
});
```

### Get Messages
```typescript
await supabase.functions.invoke('marketplace-manager', {
  body: {
    action: 'get_messages',
    thread_id: 'listing_seller_buyer'
  }
});
```

### Mark as Read
```typescript
await supabase.functions.invoke('marketplace-manager', {
  body: {
    action: 'mark_read',
    thread_id: 'listing_seller_buyer',
    user_id: 'uuid'
  }
});
```

### Set Typing Status
```typescript
await supabase.functions.invoke('marketplace-manager', {
  body: {
    action: 'set_typing',
    thread_id: 'listing_seller_buyer',
    user_id: 'uuid',
    is_typing: true
  }
});
```

## Component Structure

### MarketplaceMessenger
Main messaging interface component:
- Message list with sender/receiver styling
- Input field with image upload
- Quick reply buttons
- Typing indicator
- Read receipts

### Integration with ListingDetailModal
- "Message Seller" button on listing pages
- Opens messenger in dialog
- Maintains listing context

## Data Storage

Messages stored in Deno KV:
- `['marketplace_messages', message_id]` - Individual messages
- `['thread_messages', thread_id, message_id]` - Thread organization
- `['typing_status', thread_id, user_id]` - Typing indicators (5s TTL)

## Best Practices

1. **Real-time Updates**: Messages refresh every 3 seconds
2. **Image Optimization**: Compress images before upload
3. **Thread Management**: One thread per listing-buyer pair
4. **Notification Delivery**: Push notifications sent on every new message
5. **Privacy**: Only participants can view thread messages

## Future Enhancements

- WebSocket for true real-time updates
- Voice message support
- Message search functionality
- Conversation archiving
- Block/report users
- Attachment support (PDFs, documents)
