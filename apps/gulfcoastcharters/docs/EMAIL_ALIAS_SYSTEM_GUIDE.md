# Email Alias Management System Guide

## Overview
The Email Alias Management System allows Pro and Premium subscribers to create multiple email aliases under their custom @gulfcoastcharters.com domain with individual forwarding rules.

## Features

### Alias Limits by Subscription Tier
- **Basic**: 1 alias (the main email)
- **Pro**: Up to 3 aliases
- **Premium**: Up to 10 aliases

### Alias Management Features
- Create custom aliases (e.g., sales@, support@, bookings@)
- Set individual forwarding addresses for each alias
- Enable/disable aliases without deleting them
- View usage statistics (email count, last used)
- Test alias functionality with test emails
- Unique alias validation across all users

## Components

### EmailAliasManager Component
Location: `src/components/EmailAliasManager.tsx`

**Props:**
- `customEmailId`: The ID of the custom email
- `subscriptionTier`: Current subscription tier ('basic' | 'pro' | 'premium')

**Features:**
- CRUD operations for aliases
- Real-time validation
- Usage statistics display
- Test email functionality
- Tier-based limit enforcement

## Edge Function

### email-alias-manager
Endpoint: `https://api.databasepad.com/functions/v1/email-alias-manager`

**Actions:**
- `create`: Create new alias
- `update`: Update existing alias
- `delete`: Delete alias
- `test`: Send test email to alias
- `list`: Get all aliases for user

**Request Format:**
```json
{
  "action": "create",
  "customEmailId": "uuid",
  "aliasAddress": "sales@gulfcoastcharters.com",
  "forwardTo": "user@example.com",
  "userId": "uuid"
}
```

## Database Schema

### email_aliases Table
```sql
CREATE TABLE email_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_email_id UUID NOT NULL REFERENCES custom_emails(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  alias_address TEXT NOT NULL UNIQUE,
  forward_to TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Email Validation Rules

### Alias Address Format
- Must end with `@gulfcoastcharters.com`
- Username must be 3-30 characters
- Only lowercase letters, numbers, hyphens, and underscores
- Cannot start or end with special characters
- Must be unique across all users

### Forward Address Format
- Must be valid email format
- Can be any external email address
- Validated using standard email regex

## Usage Examples

### Creating an Alias
```typescript
const { data, error } = await supabase.functions.invoke('email-alias-manager', {
  body: {
    action: 'create',
    customEmailId: 'abc-123',
    aliasAddress: 'support@gulfcoastcharters.com',
    forwardTo: 'myemail@gmail.com',
    userId: 'user-123'
  }
});
```

### Testing an Alias
```typescript
const { data, error } = await supabase.functions.invoke('email-alias-manager', {
  body: {
    action: 'test',
    aliasAddress: 'support@gulfcoastcharters.com'
  }
});
```

## Integration with Subscription System

The alias manager automatically:
- Checks subscription tier before allowing alias creation
- Displays remaining alias slots
- Prevents creation beyond tier limits
- Updates when subscription tier changes

## User Interface

### Alias Card Display
Each alias shows:
- Alias email address
- Forwarding destination
- Usage count
- Last used timestamp
- Action buttons (Test, Edit, Delete)

### Add Alias Form
- Alias address input with domain suffix
- Forward-to email input
- Real-time validation feedback
- Submit and cancel buttons

## Testing

### Manual Testing
1. Navigate to custom email settings
2. Ensure you have Pro or Premium subscription
3. Click "Add Alias"
4. Enter alias details
5. Click "Test" to send verification email
6. Check forwarding address for test email

### Validation Testing
- Try creating duplicate aliases
- Test invalid email formats
- Attempt to exceed tier limits
- Verify forwarding works correctly

## Error Handling

Common errors and solutions:
- **"Alias already exists"**: Choose different alias name
- **"Maximum aliases reached"**: Upgrade subscription tier
- **"Invalid format"**: Check email format requirements
- **"Forwarding failed"**: Verify forward-to email is valid

## Best Practices

1. **Alias Naming**: Use descriptive names (sales, support, info)
2. **Forwarding**: Use reliable email addresses
3. **Testing**: Always test new aliases before using
4. **Monitoring**: Check usage statistics regularly
5. **Cleanup**: Delete unused aliases to free up slots

## Future Enhancements

Potential features:
- Auto-responder rules per alias
- Email filtering and routing
- Alias groups and categories
- Forwarding to multiple addresses
- Custom signature per alias
- Scheduled alias activation/deactivation

## Support

For issues or questions:
- Check validation requirements
- Test with different email addresses
- Verify subscription tier is active
- Contact support with specific error messages
