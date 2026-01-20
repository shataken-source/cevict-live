# Social Media Sharing & Referral System Guide

## Overview
This guide covers the social media sharing integration for the referral system, including one-click sharing buttons and Open Graph meta tags for rich link previews.

## Features Implemented

### 1. Social Sharing Buttons
**Component:** `src/components/SocialShareButtons.tsx`

Provides one-click sharing to:
- **Facebook** - Share to timeline with custom text and referral link
- **Twitter** - Tweet with referral message and link
- **LinkedIn** - Share to professional network
- **WhatsApp** - Send direct message with referral link

**Auto-Generated Share Text:**
```
A friend invited you to join Gulf Coast Charters! 
Get $10 off your first fishing charter booking. 
Use code: [REFERRAL_CODE]
```

### 2. Enhanced Open Graph Meta Tags
**Component:** `src/components/SEO.tsx`

Includes:
- `og:title` - Dynamic title for shared links
- `og:description` - Compelling description
- `og:image` - 1200x630 image for rich previews
- `og:site_name` - Gulf Coast Charters
- `og:url` - Canonical URL with referral code
- `og:type` - Website type
- `twitter:card` - Large image card
- `twitter:site` - @GulfCharters handle

### 3. Referral Meta Tag Utilities
**File:** `src/utils/referralMetaTags.ts`

Functions:
- `generateReferralMetaTags(referralCode, userName)` - Creates OG tags
- `generateReferralStructuredData(referralCode)` - Schema.org JSON-LD

### 4. Dynamic Meta Tag Injection
**File:** `src/pages/Index.tsx`

Detects referral codes in URL (`?ref=CODE`) and automatically:
- Generates custom meta tags
- Injects structured data
- Optimizes for social sharing

## Usage

### For Users
1. Navigate to Community → Referrals tab
2. Copy referral code or share URL
3. Click social media button to share
4. Friends click link and get $10 off
5. You earn $25 when they book

### Share URL Format
```
https://gulfcoastcharters.com?ref=[REFERRAL_CODE]
```

### Social Platform Behavior

**Facebook:**
- Opens share dialog
- Shows rich preview with image
- Pre-fills post with referral text

**Twitter:**
- Opens tweet composer
- Includes referral message and link
- 280 character optimized

**LinkedIn:**
- Professional network sharing
- Great for B2B referrals
- Rich preview card

**WhatsApp:**
- Direct messaging
- Mobile-optimized
- Instant sharing

## Testing Social Sharing

### 1. Facebook Sharing Debugger
```
https://developers.facebook.com/tools/debug/
```
Paste your referral URL to see preview

### 2. Twitter Card Validator
```
https://cards-dev.twitter.com/validator
```
Validate Twitter card appearance

### 3. LinkedIn Post Inspector
```
https://www.linkedin.com/post-inspector/
```
Check LinkedIn preview

## Customization

### Change Share Text
Edit `src/components/SocialShareButtons.tsx`:
```typescript
const shareText = `Your custom message with ${referralCode}`;
```

### Update Social Images
1. Create 1200x630px image
2. Save as `/public/og-referral.jpg`
3. Update in `referralMetaTags.ts`

### Add More Platforms
Add buttons in `SocialShareButtons.tsx`:
```typescript
<Button
  onClick={() => handleShare('Platform', 'https://platform.com/share?url=...')}
  className="bg-[#COLOR]"
>
  <Icon className="h-4 w-4 mr-2" />
  Platform
</Button>
```

## Analytics Tracking

Track social shares by adding UTM parameters:
```typescript
const shareUrl = `${window.location.origin}?ref=${referralCode}&utm_source=social&utm_medium=${platform}`;
```

## Best Practices

1. **Image Optimization**
   - Use 1200x630px for OG images
   - Keep file size under 300KB
   - Use compelling visuals

2. **Share Text**
   - Keep under 280 characters
   - Include clear value proposition
   - Add referral code prominently

3. **Testing**
   - Test on all platforms before launch
   - Check mobile and desktop views
   - Verify link tracking works

4. **Legal Compliance**
   - Follow platform terms of service
   - Include disclosure if required
   - Respect user privacy

## Troubleshooting

### Meta Tags Not Updating
- Clear social platform cache
- Use debugging tools above
- Check SEO component mounting

### Share Buttons Not Working
- Verify popup blockers disabled
- Check browser console for errors
- Test URL encoding

### Images Not Showing
- Ensure image is publicly accessible
- Check image dimensions (1200x630)
- Verify HTTPS protocol

## Future Enhancements

- [ ] Track which platform generates most referrals
- [ ] A/B test different share messages
- [ ] Add Pinterest and Reddit sharing
- [ ] Create dynamic OG images per user
- [ ] Implement share incentives (bonus points)
