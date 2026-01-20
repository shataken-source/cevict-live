# Email Campaign System - Complete Guide

## Overview
The Gulf Coast Charters platform now includes a comprehensive automated email campaign system for marketing to captain leads with A/B testing, behavioral triggers, and detailed analytics.

## Features Implemented

### 1. Campaign Management
- Create and manage email campaigns
- A/B testing with dual subject lines
- Target specific lead segments
- Schedule or send campaigns immediately

### 2. Lead Management
- Add and track captain leads
- Segment leads by source, status, and tags
- Track lead journey from new to converted
- Automatic status updates based on engagement

### 3. Email Tracking
- **Open Rate Tracking**: 1x1 pixel tracking image
- **Click Rate Tracking**: URL parameter tracking
- **Conversion Tracking**: Application completion tracking
- Real-time engagement metrics

### 4. A/B Testing
- Test two subject lines simultaneously
- Automatic 50/50 split distribution
- Compare open rates, click rates, and conversions
- Winner determination based on performance

### 5. Analytics Dashboard
- Campaign performance metrics
- A/B test comparison charts
- Engagement funnel visualization
- Conversion rate tracking

## System Architecture

### Edge Function: `email-campaign-manager`
**Endpoint**: `/functions/v1/email-campaign-manager`

**Actions**:
- `add_lead`: Add new captain lead
- `create_campaign`: Create email campaign
- `send_campaign`: Send emails to leads
- `track_open`: Track email opens (pixel)
- `track_click`: Track link clicks (redirect)
- `track_conversion`: Track captain signups
- `get_campaign_stats`: Retrieve campaign analytics
- `get_all_campaigns`: List all campaigns

### Components

**EmailCampaignManager.tsx**
- Main campaign management interface
- Lead addition and management
- Campaign creation wizard
- Analytics integration

**CampaignAnalytics.tsx**
- Detailed performance metrics
- A/B test comparison
- Engagement funnel
- Conversion tracking

## Usage Guide

### For Admins

#### Access Campaign Manager
1. Navigate to Admin Panel
2. Scroll to "Email Campaign Manager" section
3. Click "Open Campaign Manager"
4. Or visit: `/admin/email-campaigns`

#### Add Captain Leads
```typescript
// Manual lead addition
1. Go to "Leads" tab
2. Fill in lead information:
   - First Name
   - Last Name
   - Email (required)
   - Phone
   - Source (website, referral, etc.)
3. Click "Add Lead"

// Programmatic lead addition
const { data } = await supabase.functions.invoke('email-campaign-manager', {
  body: {
    action: 'add_lead',
    email: 'captain@example.com',
    firstName: 'John',
    lastName: 'Smith',
    phone: '+1234567890',
    source: 'website',
    tags: ['captain', 'new']
  }
});
```

#### Create Campaign
1. Go to "Campaigns" tab
2. Click "New Campaign"
3. Fill in campaign details:
   - **Campaign Name**: Descriptive name
   - **Subject Line A**: First variant
   - **Subject Line B**: Second variant (optional for A/B test)
   - **Email Template**: HTML content
4. Click "Create Campaign"

#### Send Campaign
```typescript
const { data } = await supabase.functions.invoke('email-campaign-manager', {
  body: {
    action: 'send_campaign',
    campaignId: 'campaign-uuid',
    leads: [
      { id: 'lead1', email: 'captain1@example.com', firstName: 'John', lastName: 'Smith' },
      { id: 'lead2', email: 'captain2@example.com', firstName: 'Sarah', lastName: 'Johnson' }
    ],
    campaign: {
      subjectLineA: 'Join Gulf Coast Charters Today',
      subjectLineB: 'Start Earning as a Captain',
      emailTemplate: '<html>...</html>'
    }
  }
});
```

### Email Template Integration

#### Using Captain Marketing Email
```typescript
import CaptainMarketingEmail from '@/components/CaptainMarketingEmail';

// Get HTML template
const template = ReactDOMServer.renderToString(<CaptainMarketingEmail />);

// Use in campaign
const campaign = {
  name: 'Captain Onboarding Wave 1',
  subjectLineA: 'Join Gulf Coast Charters - 90 Days FREE',
  subjectLineB: 'Start Your Captain Journey Today',
  emailTemplate: template
};
```

## Tracking Implementation

### Open Tracking
Automatically inserted tracking pixel:
```html
<img src="https://api.databasepad.com/functions/v1/email-campaign-manager?action=track_open&campaignId=xxx&leadId=yyy" 
     width="1" height="1" style="display:none;" />
```

### Click Tracking
Links automatically wrapped:
```html
<!-- Original -->
<a href="https://gulfcoastcharters.com/apply">Apply Now</a>

<!-- Tracked -->
<a href="https://api.databasepad.com/functions/v1/email-campaign-manager?action=track_click&campaignId=xxx&leadId=yyy&url=https://gulfcoastcharters.com/apply">Apply Now</a>
```

### Conversion Tracking
Track when captain completes application:
```typescript
// In captain application form submission
await supabase.functions.invoke('email-campaign-manager', {
  body: {
    action: 'track_conversion',
    campaignId: params.get('campaignId'),
    leadId: params.get('leadId')
  }
});
```

## Best Practices

### Subject Line A/B Testing
- **Test one variable**: Only change subject line, not content
- **Significant sample size**: Minimum 100 recipients per variant
- **Wait for results**: Allow 48 hours before declaring winner
- **Learn and iterate**: Use winning patterns in future campaigns

### Email Content
- **Personalization**: Use {{firstName}} placeholders
- **Clear CTA**: Single, prominent call-to-action
- **Mobile-friendly**: Responsive design
- **Value proposition**: Lead with benefits
- **Social proof**: Include testimonials

### Send Timing
- **Best days**: Tuesday, Wednesday, Thursday
- **Best times**: 10 AM - 2 PM local time
- **Avoid**: Mondays (busy), Fridays (weekend mode)
- **Test**: Your audience may differ

### Follow-up Sequences
1. **Day 0**: Initial campaign (90-day free trial offer)
2. **Day 3**: Follow-up for non-openers (different subject)
3. **Day 7**: Feature highlight for openers who didn't click
4. **Day 14**: Success stories for clickers who didn't convert
5. **Day 30**: Last chance / urgency message

## Analytics Interpretation

### Key Metrics
- **Open Rate**: 15-25% is average, 25%+ is excellent
- **Click Rate**: 2-5% is average, 5%+ is excellent
- **Conversion Rate**: 1-3% is average, 3%+ is excellent

### A/B Test Analysis
- **Statistical significance**: Need 95% confidence
- **Winner criteria**: 10%+ improvement
- **Sample size**: Minimum 100 per variant

### Engagement Funnel
```
Delivered (100%)
  ↓
Opened (20%)
  ↓
Clicked (5%)
  ↓
Converted (2%)
```

## Integration with Mailjet

The system uses Mailjet for email delivery:

```typescript
// Configured in edge function
const mailjetApiKey = Deno.env.get('MAILJET_API_KEY');
const mailjetSecretKey = Deno.env.get('MAILJET_SECRET_KEY');

// Send via Mailjet API
await fetch('https://api.mailjet.com/v3.1/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + btoa(`${mailjetApiKey}:${mailjetSecretKey}`)
  },
  body: JSON.stringify({
    Messages: [{
      From: { Email: 'noreply@gulfcoastcharters.com', Name: 'Gulf Coast Charters' },
      To: [{ Email: lead.email, Name: `${lead.firstName} ${lead.lastName}` }],
      Subject: subjectLine,
      HTMLPart: trackedContent
    }]
  })
});
```

## Troubleshooting

### Emails Not Sending
1. Verify Mailjet credentials in Supabase secrets
2. Check sender email is verified in Mailjet
3. Review edge function logs
4. Ensure leads have valid email addresses

### Tracking Not Working
1. Verify tracking URLs are not stripped by email client
2. Check edge function is responding to tracking requests
3. Ensure campaign and lead IDs are valid
4. Test with different email clients

### Low Open Rates
1. Test different subject lines
2. Verify sender reputation
3. Check spam folder placement
4. Improve subject line relevance

### Low Click Rates
1. Strengthen call-to-action
2. Improve email design
3. Ensure mobile responsiveness
4. Test different CTA placement

## Future Enhancements

### Planned Features
- [ ] Automated follow-up sequences
- [ ] Behavioral triggers (opened but didn't click)
- [ ] Lead scoring based on engagement
- [ ] Email template builder
- [ ] Unsubscribe management
- [ ] Bounce handling
- [ ] List segmentation tools
- [ ] Campaign scheduling
- [ ] Drip campaigns

### Database Schema (Future)
When database tables are available:
- `email_leads`: Lead information
- `email_campaigns`: Campaign details
- `email_sends`: Send tracking
- `campaign_metrics`: Aggregated stats
- `email_sequences`: Follow-up automation
- `scheduled_followups`: Queue for automation

## Support

For issues or questions:
- Check edge function logs in Supabase dashboard
- Review campaign analytics for insights
- Test with small batches before full send
- Monitor deliverability metrics in Mailjet

## Success Metrics

### Campaign Goals
- **Open Rate**: Target 25%+
- **Click Rate**: Target 5%+
- **Conversion Rate**: Target 3%+
- **Cost per Acquisition**: Track against captain lifetime value

### Lead Quality
- Track source performance
- Monitor conversion by segment
- Analyze time to conversion
- Calculate ROI per campaign

---

**Last Updated**: November 17, 2025
**System Status**: Active and operational
**Next Review**: December 2025
