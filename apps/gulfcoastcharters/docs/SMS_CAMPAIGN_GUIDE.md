# SMS Campaign System Guide

## Overview
The SMS Campaign System allows admins to send bulk text messages to mailing list subscribers who opted in for SMS communications. It includes message templates, scheduling, delivery tracking, link shortening, and comprehensive analytics.

## Features
- **Bulk SMS Sending**: Send messages to all SMS-opted subscribers
- **Message Templates**: Pre-built templates for common campaigns
- **Scheduling**: Schedule campaigns for future delivery
- **Link Shortening**: Automatically shorten URLs for tracking
- **Delivery Tracking**: Monitor sent, delivered, and failed messages
- **Click Tracking**: Track link clicks with shortened URLs
- **Opt-Out Management**: Automatic opt-out handling (STOP keyword)
- **Campaign Analytics**: Detailed metrics on delivery and engagement

## Access
- Navigate to Admin Panel → SMS Campaign Manager
- Or visit: `/admin/sms-campaigns`
- Requires admin level access (user level 1)

## Creating an SMS Campaign

### 1. Campaign Setup
```
Campaign Name: Captain Recruitment - January
Message: Join Gulf Coast Charters! Apply now: https://gulfcoast.com/apply
Target Audience: All SMS Subscribers
Schedule: Immediate or Future Date/Time
```

### 2. Message Best Practices
- Keep messages under 160 characters for single SMS
- Include clear call-to-action
- Add unsubscribe option (auto-appended)
- Use shortened links for tracking
- Personalize when possible

### 3. Template Usage
Pre-built templates available:
- **Captain Recruitment**: Invite captains to join
- **Special Offer**: Promotional campaigns
- **Event Announcement**: Community events

## Link Tracking

### Automatic URL Shortening
- System detects URLs in messages
- Creates shortened tracking links
- Format: `https://gulfcoast.com/l/{linkId}`
- Tracks clicks per recipient

### Click Analytics
- Total clicks per link
- Unique clicks (per recipient)
- Click-through rate
- Link performance comparison

## Campaign Analytics

### Key Metrics
1. **Delivery Rate**: % of messages successfully delivered
2. **Click Rate**: % of recipients who clicked links
3. **Opt-Out Rate**: % of recipients who unsubscribed
4. **Engagement Rate**: Overall interaction percentage

### Performance Dashboard
- Total sent/delivered/failed counts
- Real-time delivery status
- Link performance breakdown
- Opt-out tracking
- Engagement funnel

## Sinch SMS Integration

### Configuration
The system uses Sinch SMS API with these credentials:
- `SINCH_API_TOKEN`: Authentication token
- `SINCH_SERVICE_PLAN_ID`: Service plan identifier
- `SINCH_PHONE_NUMBER`: Sender phone number

### API Endpoint
```
POST https://us.sms.api.sinch.com/xms/v1/{servicePlanId}/batches
Authorization: Bearer {apiToken}
```

### Message Format
```json
{
  "from": "+1234567890",
  "to": ["+1987654321"],
  "body": "Your message\n\nReply STOP to unsubscribe"
}
```

## Opt-Out Handling

### STOP Keyword
- Recipients can reply "STOP" to opt out
- System automatically processes opt-outs
- Updates subscriber status in database
- Prevents future messages to opted-out users

### Compliance
- All messages include opt-out instructions
- Opt-out requests processed immediately
- Compliant with TCPA regulations
- Maintains opt-out history

## Scheduling Campaigns

### Immediate Send
- Select "Send Now" for instant delivery
- Processes all eligible subscribers
- Real-time delivery tracking

### Scheduled Send
- Choose future date/time
- Campaign status: "Scheduled"
- Automatic send at specified time
- Can cancel before send time

## Target Audience Options

### Audience Segments
1. **All SMS Subscribers**: Everyone who opted in
2. **Captains Only**: Captain accounts with SMS consent
3. **Customers Only**: Customer accounts with SMS consent

### Filtering
- Only sends to subscribers with `sms_consent: true`
- Excludes opted-out users
- Validates phone numbers

## Message Templates

### Creating Templates
```javascript
{
  name: 'Template Name',
  text: 'Your message with {{variables}} and links'
}
```

### Using Templates
1. Navigate to "Templates" tab
2. Browse available templates
3. Click "Use Template"
4. Customize message as needed
5. Send or schedule campaign

## Testing

### Test Campaign
```javascript
// Send to test number first
const testCampaign = {
  name: 'Test Campaign',
  message: 'Test message',
  recipients: [{ phone: '+1234567890', sms_consent: true }]
};
```

### Verification
1. Send test to your own number
2. Verify message delivery
3. Test link clicks
4. Test STOP response
5. Check analytics update

## Troubleshooting

### Messages Not Sending
- Verify Sinch credentials configured
- Check phone number format (+1234567890)
- Ensure recipients have SMS consent
- Verify service plan active

### Low Delivery Rate
- Check phone number validity
- Verify carrier compatibility
- Review message content for spam triggers
- Check Sinch account balance

### Links Not Tracking
- Ensure URLs properly formatted
- Verify link shortening active
- Check tracking endpoint accessible
- Review analytics data flow

### Opt-Outs Not Processing
- Verify STOP keyword detection
- Check database update permissions
- Review opt-out webhook configuration
- Ensure status updates propagating

## Best Practices

### Message Content
- Clear, concise messaging
- Strong call-to-action
- Relevant to recipient
- Professional tone
- Include brand name

### Timing
- Send during business hours (9 AM - 8 PM)
- Avoid weekends for business messages
- Consider time zones
- Space out campaigns (not daily)

### Frequency
- Maximum 2-3 messages per week
- Monitor opt-out rates
- Respect user preferences
- Quality over quantity

### Compliance
- Always include opt-out option
- Honor opt-out requests immediately
- Keep records of consent
- Follow TCPA guidelines
- Respect Do Not Call lists

## Analytics Interpretation

### Good Performance
- Delivery Rate: >95%
- Click Rate: >20%
- Opt-Out Rate: <5%
- Engagement Rate: >25%

### Warning Signs
- Delivery Rate: <90%
- Click Rate: <10%
- Opt-Out Rate: >10%
- High bounce rate

### Optimization
- A/B test message content
- Test different send times
- Segment audiences
- Personalize messages
- Improve targeting

## Integration with Mailing List

### Subscriber Sync
- SMS campaigns use mailing list subscribers
- Only contacts with `sms_consent: true`
- Real-time subscriber updates
- Automatic opt-out sync

### Data Flow
1. User subscribes via mailing list form
2. Opts in for SMS communications
3. Added to SMS campaign audience
4. Receives targeted campaigns
5. Can opt out anytime

## Support
For issues or questions:
- Check Sinch API status
- Review campaign logs
- Verify subscriber data
- Contact Sinch support for delivery issues
- Review analytics for insights
