# Captain Marketing Email Guide

## Overview
The Captain Marketing Email is a comprehensive email template designed to attract new captains to the platform by showcasing all available features and providing a compelling signup incentive.

## Features Highlighted in Email

### 1. Fleet & Vessel Management
- Digital boat profiles
- Equipment inventory tracking
- Fuel consumption logs
- Maintenance scheduling
- Document storage

### 2. Real-Time Weather & Safety Alerts
- Live NOAA buoy data from 10 Gulf Coast stations
- Custom alert thresholds
- Automated SMS & email notifications
- Small Craft Advisories
- Historical weather trends

### 3. Booking & Calendar Management
- Live availability calendar
- Accept/decline booking requests
- Automated confirmations and reminders
- Customer communication tools
- Booking modifications

### 4. Revenue & Earnings Tracking
- Real-time earnings dashboard
- Revenue analytics
- Automatic payout processing
- Tax-ready financial reports
- Performance metrics

### 5. Compliance & Certification Management
- License and certification tracking
- Expiration reminders
- Coast Guard inspection records
- Insurance verification
- Compliance dashboard

### 6. Modern Tools & Technology
- QR codes for vessel inspections
- Real-time customer messaging
- Digital signature capture
- Mobile-friendly dashboard
- Email marketing tools

## Current Incentive Offer

**Special Promotion:**
- First 90 days FREE
- $0 booking fees during trial period
- Promo code: CAPTAIN2025
- Valid through December 31st, 2025

**Regular Pricing:**
- $49/month after trial
- Unlimited bookings
- All features included
- Cancel anytime

## How to Use This Email

### For Email Campaigns (Mailjet, SendGrid, etc.)

1. **Export as HTML:**
```javascript
import { renderToString } from 'react-dom/server';
import { CaptainMarketingEmail } from './components/CaptainMarketingEmail';

const htmlContent = renderToString(<CaptainMarketingEmail />);
```

2. **Send via Mailjet:**
```javascript
const mailjet = require('node-mailjet').connect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

const request = mailjet
  .post('send', { version: 'v3.1' })
  .request({
    Messages: [
      {
        From: {
          Email: 'captains@gulfcoastcharters.com',
          Name: 'Gulf Coast Charter Platform'
        },
        To: [
          {
            Email: 'captain@example.com',
            Name: 'Captain Name'
          }
        ],
        Subject: 'Captain, Your Command Center Awaits - 90 Days FREE',
        HTMLPart: htmlContent
      }
    ]
  });
```

3. **Send via SendGrid:**
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'captain@example.com',
  from: 'captains@gulfcoastcharters.com',
  subject: 'Captain, Your Command Center Awaits - 90 Days FREE',
  html: htmlContent,
};

await sgMail.send(msg);
```

### For Preview/Testing

Create a preview page in your admin panel:

```tsx
// src/pages/EmailPreview.tsx
import { CaptainMarketingEmail } from '@/components/CaptainMarketingEmail';

export default function EmailPreview() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Captain Marketing Email Preview</h1>
        <CaptainMarketingEmail />
      </div>
    </div>
  );
}
```

## Email Campaign Strategy

### Target Audiences

1. **New Captain Leads**
   - Captains who viewed the platform but didn't sign up
   - Send within 24 hours of initial visit
   - Subject: "Captain, Your Command Center Awaits - 90 Days FREE"

2. **Inactive Captains**
   - Captains who signed up but haven't completed onboarding
   - Send 3 days after signup
   - Subject: "Still setting up? Here's everything waiting for you..."

3. **Competitor Captains**
   - Captains using other platforms
   - Highlight unique features (weather alerts, compliance tracking)
   - Subject: "Switch to Gulf Coast Charters - Get 90 Days FREE"

4. **Local Captain Associations**
   - Partner with captain associations for bulk outreach
   - Offer extended trial or group discounts
   - Subject: "Exclusive Offer for [Association Name] Members"

### Email Sequence

**Day 0:** Send initial marketing email with 90-day offer
**Day 3:** Follow-up: "Questions about getting started?"
**Day 7:** Feature spotlight: "See how weather alerts keep captains safe"
**Day 14:** Urgency: "Your 90-day free trial is waiting"
**Day 21:** Final reminder: "Last chance for 90 days FREE"

## Customization Options

### Update Incentive Offer
Edit the incentive banner section:
```tsx
<div style={{ backgroundColor: '#fbbf24', padding: '20px', textAlign: 'center' }}>
  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#78350f' }}>
    🎉 NEW OFFER: [Your Custom Offer]
  </p>
  <p style={{ fontSize: '14px', color: '#92400e' }}>
    [Expiration Date or Terms]
  </p>
</div>
```

### Update Pricing
Edit the pricing section:
```tsx
<p style={{ fontSize: '32px', fontWeight: 'bold', color: '#0e7490' }}>
  $[YOUR_PRICE]/month
</p>
```

### Add/Remove Features
Each feature block follows this structure:
```tsx
<div style={{ marginBottom: '25px', borderLeft: '4px solid #0ea5e9', paddingLeft: '15px' }}>
  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px' }}>
    [Icon] Feature Name
  </h3>
  <ul style={{ margin: '0', paddingLeft: '20px', color: '#475569', lineHeight: '1.8' }}>
    <li>Feature benefit 1</li>
    <li>Feature benefit 2</li>
  </ul>
</div>
```

## A/B Testing Recommendations

### Test Variables:
1. **Subject Lines:**
   - "Captain, Your Command Center Awaits"
   - "Manage Your Charter Business Like a Pro"
   - "90 Days FREE - Everything You Need to Run Charters"

2. **Incentive Amounts:**
   - 90 days free vs 60 days free
   - $0 booking fees vs 50% off first 6 months
   - Free premium features vs extended trial

3. **CTA Button Text:**
   - "Start Your Free 90-Day Trial"
   - "Claim Your Free Trial"
   - "Get Started Free"

## Analytics Tracking

Add UTM parameters to CTA links:
```tsx
<a href={`${baseUrl}/apply-captain?utm_source=email&utm_medium=marketing&utm_campaign=captain_signup_2025`}>
  Start Your Free 90-Day Trial
</a>
```

Track:
- Email open rate
- Click-through rate
- Conversion rate (email → signup)
- Trial-to-paid conversion rate

## Legal Compliance

- Include unsubscribe link in footer
- Add physical mailing address
- Comply with CAN-SPAM Act
- Honor opt-out requests within 10 business days

## Best Practices

1. **Send Time:** Tuesday-Thursday, 9-11 AM local time
2. **From Name:** Use personal name + company (e.g., "Sarah from Gulf Coast Charters")
3. **Preview Text:** "Run your charter business like a pro with our all-in-one platform"
4. **Mobile Optimization:** Email is fully responsive
5. **Plain Text Version:** Always include for spam filter compliance

## Success Metrics

Target benchmarks:
- Open Rate: 25-30%
- Click Rate: 3-5%
- Conversion Rate: 1-2%
- Trial-to-Paid: 20-30%

## Support

For questions about email campaigns:
- Technical: support@gulfcoastcharters.com
- Marketing: marketing@gulfcoastcharters.com
- Sales: captains@gulfcoastcharters.com
