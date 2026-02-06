# Gulf Coast Charters (GCC)

**Production URL:** https://gulfcoastcharters.vercel.app  
**Port:** 3000 (dev)  
**Framework:** Next.js 14 (Pages Router)  
**Database:** Supabase (PostgreSQL)  
**Deployment:** Vercel

---

## Overview

Gulf Coast Charters is a comprehensive charter fishing booking platform with gamification, weather alerts, real-time GPS tracking, and AI-powered concierge services. The platform connects customers with charter captains, manages bookings, tracks catches, and provides a complete fishing experience ecosystem.

---

## What This Project Does

### Core Features

1. **Charter Booking System**
   - Captain directory with profiles and ratings
   - Vessel listings with availability
   - Multi-day trip booking
   - Stripe payment integration
   - Booking management dashboard

2. **AI Concierge Systems**
   - **Finn Concierge**: Personal vacation concierge with memory system
     - Remembers user preferences, anniversaries, birthdays
     - Proactive booking reminders
     - Weather-based activity suggestions
     - Multi-step booking flow assistance
   - **Fishy Learning Chatbot**: Public AI assistant
     - Context-aware responses (captain/customer)
     - Conversation learning and pattern recognition
     - Intent detection and sentiment analysis

3. **Weather & Marine Data**
   - Real-time weather conditions (Open-Meteo)
   - NOAA buoy data and marine forecasts
   - Weather alerts and notifications
   - Tide charts and water temperature

4. **Gamification System**
   - Points and rewards for bookings, reviews, catches
   - Achievement badges and leaderboards
   - Avatar customization system
   - Loyalty program integration

5. **Catch Logging & Verification**
   - Photo upload with GPS location
   - AI fish species recognition (planned)
   - Catch history and statistics
   - Social sharing of catches

6. **SMS & Communication**
   - Booking reminders (Sinch/Twilio)
   - SMS notifications for weather alerts
   - SMS campaigns for marketing
   - Phone verification system

7. **Admin Tools**
   - Captain application management
   - Email campaign system (Resend)
   - Scraper for boat listings
   - GPS tracking dashboard
   - User management and analytics

8. **Community Features**
   - Community feed and activity
   - Fishing buddy finder
   - Catch of the day highlights
   - Social sharing system

---

## Tools & Technologies

### Frontend
- **Next.js 14** (Pages Router)
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components
- **Lucide React** icons
- **Leaflet** for maps/GPS tracking

### Backend
- **Supabase** (PostgreSQL database, Auth, Storage)
- **Supabase Edge Functions** (Deno) for serverless functions
- **Next.js API Routes** for server-side logic

### Services & Integrations
- **Stripe** - Payment processing
- **Resend** - Email campaigns
- **Sinch/Twilio** - SMS notifications
- **Open-Meteo** - Weather data
- **NOAA** - Marine data and alerts
- **AI Gateway** - AI chatbot responses (Claude/GPT)
- **Google Custom Search** - Search functionality
- **Amazon Affiliate** - Gear recommendations

### Data Storage
- **Supabase PostgreSQL** - Primary database
- **IndexedDB** - Offline inspection storage (encrypted)
- **Supabase Storage** - File uploads (photos, documents)

---

## Manual Workflows (Automation Opportunities)

### 1. **Booking Management**
- **Current**: Manual confirmation emails, reminder scheduling
- **Automation Opportunity**: Auto-send confirmation emails, schedule SMS reminders, update booking status based on payment

### 2. **Weather Alerts**
- **Current**: Manual weather monitoring and alert sending
- **Automation Opportunity**: Automated weather monitoring, threshold-based alerts, proactive cancellation suggestions

### 3. **Captain Onboarding**
- **Current**: Manual review of captain applications, email communication
- **Automation Opportunity**: Auto-approve based on criteria, automated welcome emails, document collection workflow

### 4. **Scraper Reports**
- **Current**: Manual review of incomplete boat listings
- **Automation Opportunity**: Auto-flag missing data, send follow-up emails to sources, schedule re-scraping

### 5. **Email Campaigns**
- **Current**: Manual campaign creation and sending
- **Automation Opportunity**: Scheduled campaigns, segment-based automation, A/B testing workflows

### 6. **Catch Verification**
- **Current**: Manual review of catch photos and species identification
- **Automation Opportunity**: Auto-verify catches with AI, award points automatically, generate social posts

### 7. **Points & Rewards**
- **Current**: Manual point calculation and reward distribution
- **Automation Opportunity**: Auto-calculate points on actions, trigger reward emails, update leaderboards

### 8. **Customer Support**
- **Current**: Manual response to customer inquiries
- **Automation Opportunity**: Auto-respond to common questions, route tickets, escalate based on keywords

### 9. **Review Management**
- **Current**: Manual review moderation and response
- **Automation Opportunity**: Auto-publish verified reviews, send follow-up emails, flag suspicious reviews

### 10. **Inventory Management**
- **Current**: Manual tracking of boat availability
- **Automation Opportunity**: Auto-update availability based on bookings, sync with external calendars

---

## Quick Start

```bash
cd apps/gulfcoastcharters
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## Key Routes

### Public Pages
- `/` - Homepage
- `/captains` - Captain directory
- `/captains/[id]` - Captain profile
- `/vessels` - Vessel listings
- `/vessels/[id]` - Vessel details
- `/gear` - Gear recommendations
- `/weather` - Weather dashboard
- `/community` - Community feed
- `/bookings` - User bookings
- `/bookings/[id]` - Booking details

### Admin Pages
- `/admin` - Admin dashboard
- `/admin/campaigns` - Email campaigns
- `/admin/scraper` - Boat scraper
- `/admin/scraper-reports` - Scraper reports
- `/admin/gps` - GPS tracking
- `/admin/sms-campaigns` - SMS campaigns

---

## API Routes

Located in `pages/api/`:

### Admin APIs
- `/api/admin/campaigns` - Email campaign management
- `/api/admin/campaigns/[id]/send` - Send campaign
- `/api/admin/scraper/run` - Run boat scraper
- `/api/admin/scraper/reports` - Get scraper reports
- `/api/admin/users` - User management

### Booking APIs
- `/api/bookings/track` - Track bookings for anniversary detection
- `/api/bookings/create` - Create booking from Finn concierge

### Weather & Activities
- `/api/weather/current` - Current weather conditions
- `/api/activities/local` - Local activities

### Other APIs
- `/api/boats` - Boat listings
- `/api/gps/latest` - Latest GPS tracking data
- `/api/gps/push` - Push GPS location
- `/api/send-test-email` - Test email sending

---

## Supabase Edge Functions

Located in `supabase/functions/`:

- `fishy-ai-assistant` - AI chatbot with learning
- `weather-api` - Weather data aggregation
- `weather-alerts` - NWS alert fetching
- `noaa-buoy-data` - Buoy data retrieval
- `stripe-checkout` - Payment processing
- `stripe-webhook` - Payment webhooks
- `sms-booking-reminders` - Booking reminders
- `sms-campaign-manager` - SMS campaigns
- `twilio-sms-service` - SMS notifications
- `booking-reminder-scheduler` - Reminder scheduling
- `points-rewards-system` - Points calculation
- `captain-weather-alerts` - Captain alerts
- `fishing-buddy-finder` - Buddy matching
- `catch-of-the-day` - Daily highlights

---

## Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin)

### Payment
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

### Email
- `RESEND_API_KEY` - Resend API key
- `RESEND_FROM_EMAIL` - From email address
- `RESEND_REPLY_TO` - Reply-to email

### SMS
- `SINCH_API_TOKEN` - Sinch API token
- `SINCH_SERVICE_PLAN_ID` - Sinch service plan
- `SINCH_FROM` - Sinch from number
- `TWILIO_ACCOUNT_SID` - Twilio account SID (optional)
- `TWILIO_AUTH_TOKEN` - Twilio auth token (optional)

### AI Services
- `GATEWAY_API_KEY` - AI Gateway API key (for chatbots)
- `OPENAI_API_KEY` - OpenAI API key (optional)

### Admin
- `GCC_ADMIN_EMAILS` - Comma-separated admin emails
- `GCC_ADMIN_KEY` - Server-to-server admin key

### Other
- `NEXT_PUBLIC_GOOGLE_ADS_CLIENT_ID` - Google Ads
- `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` - Amazon affiliate
- `GOOGLE_CUSTOM_SEARCH_API_KEY` - Google Search
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` - Search engine ID

---

## Database

### Key Tables
- `vessels` - Boat/charter listings
- `captains` - Captain profiles
- `bookings` - Booking records
- `catches` - Catch logs
- `points_transactions` - Points history
- `fishy_conversations` - Chatbot learning data
- `fishy_learning_patterns` - AI patterns
- `sms_campaigns` - SMS campaigns
- `email_campaigns` - Email campaigns

See `supabase/migrations/` for complete schema.

---

## Deployment

- **Platform**: Vercel
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Node Version**: >=20.0.0

Configuration in `vercel.json` includes security headers.

---

## Development Notes

- TypeScript config excludes `supabase/` directory (Deno edge functions)
- Uses Pages Router (not App Router)
- Offline inspection storage uses encrypted IndexedDB
- AI systems use singleton pattern for memory management

---

## Documentation

- `docs/AUDIT_REPORT.md` - System audit
- `docs/DEEP_AUDIT_SUMMARY.md` - Audit summary
- `FEATURES_VERIFICATION_COMPLETE.md` - Feature status
- `PRODUCTION_READY_SUMMARY.md` - Deployment guide
