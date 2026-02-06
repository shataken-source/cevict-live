# Where To Vacation (WTV)

**Production URL:** https://www.wheretovcation.com  
**Port:** 3003 (dev)  
**Framework:** Next.js 14 (App Router)  
**Database:** Supabase (PostgreSQL)  
**Deployment:** Vercel

---

## Overview

Where To Vacation is a vacation planning and booking platform that helps users find and book vacation rentals, hotels, activities, and destination guides. It serves as the sister site to Gulf Coast Charters, focusing on accommodations and vacation planning while integrating with GCC for complete vacation packages.

---

## What This Project Does

### Core Features

1. **Vacation Rental Listings**
   - Search and filter vacation rentals
   - Detailed rental pages with photos, amenities, reviews
   - Availability calendar
   - Booking system with Stripe integration

2. **AI Concierge Systems**
   - **Finn Concierge**: Personal vacation concierge with memory
     - Remembers user preferences and special dates
     - Proactive booking suggestions
     - Weather-based activity recommendations
     - Multi-step booking assistance
   - **Fishy Learning Chatbot**: Public AI assistant
     - Context-aware vacation planning help
     - Conversation learning and improvement
     - Intent detection for booking assistance

3. **Destination Guides**
   - Comprehensive destination information
   - Attractions, restaurants, activities
   - Best time to visit recommendations
   - Photo galleries and videos

4. **Integrated Search**
   - Unified search across rentals and GCC boats
   - Cross-platform package deals
   - Activity recommendations
   - Location-based suggestions

5. **Vacation Packages**
   - Create custom vacation packages
   - Combine rentals + charters + activities
   - Package pricing and discounts
   - Save and share packages

6. **Booking Management**
   - Booking history and tracking
   - Payment processing (Stripe)
   - Booking confirmations
   - Cancellation management

7. **User Profiles**
   - Saved favorites
   - Booking history
   - Preferences and settings
   - Loyalty points (shared with GCC)

---

## Tools & Technologies

### Frontend
- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** icons

### Backend
- **Supabase** (PostgreSQL database, Auth, Storage)
- **Supabase Edge Functions** (Deno) for serverless functions
- **Next.js API Routes** (App Router) for server-side logic

### Services & Integrations
- **Stripe** - Payment processing
- **AI Gateway** - AI chatbot responses (Claude/GPT)
- **GCC Integration** - Cross-platform boat listings and packages
- **Supabase Auth** - User authentication (SSO with GCC)

### Data Storage
- **Supabase PostgreSQL** - Primary database
- **Supabase Storage** - File uploads (photos)

---

## Manual Workflows (Automation Opportunities)

### 1. **Booking Management**
- **Current**: Manual confirmation emails, status updates
- **Automation Opportunity**: Auto-send confirmations, update status based on payment, send pre-arrival emails

### 2. **Vacation Package Creation**
- **Current**: Manual package assembly and pricing
- **Automation Opportunity**: Auto-suggest packages based on preferences, dynamic pricing, availability checking

### 3. **Destination Content**
- **Current**: Manual content updates for destinations
- **Automation Opportunity**: Auto-update from external APIs, scrape attraction data, sync with review sites

### 4. **Customer Communication**
- **Current**: Manual responses to inquiries
- **Automation Opportunity**: Auto-respond to common questions, send booking reminders, follow-up emails

### 5. **Availability Management**
- **Current**: Manual calendar updates
- **Automation Opportunity**: Sync with external booking systems, auto-update based on bookings, block dates automatically

### 6. **Review Collection**
- **Current**: Manual review requests
- **Automation Opportunity**: Auto-send review requests post-stay, follow-up reminders, incentive emails

### 7. **Price Management**
- **Current**: Manual price updates
- **Automation Opportunity**: Dynamic pricing based on demand, seasonal adjustments, competitor monitoring

### 8. **Content Moderation**
- **Current**: Manual review of listings and content
- **Automation Opportunity**: Auto-flag suspicious content, verify listing accuracy, moderate reviews

### 9. **Cross-Platform Integration**
- **Current**: Manual coordination with GCC for packages
- **Automation Opportunity**: Auto-sync availability, real-time package pricing, unified booking flow

### 10. **Marketing Campaigns**
- **Current**: Manual email campaigns
- **Automation Opportunity**: Segment-based campaigns, abandoned booking recovery, personalized recommendations

---

## Quick Start

```bash
cd apps/wheretovacation
npm install
npm run dev
# Runs on http://localhost:3003
```

---

## Project Structure

```
apps/wheretovacation/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── bookings/      # Booking endpoints
│   │   ├── gcc/           # GCC integration
│   │   ├── packages/      # Package management
│   │   └── rentals/       # Rental listings
│   ├── auth/              # Authentication pages
│   ├── bookings/          # Booking pages
│   ├── destination/       # Destination guides
│   ├── packages/          # Package pages
│   ├── rentals/           # Rental pages
│   ├── reviews/           # Guest reviews & ratings
│   ├── search/            # Search pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── FinnConcierge.tsx  # AI concierge
│   ├── FishyAIChat.tsx    # AI chatbot
│   └── ...
├── lib/                   # Utilities
│   ├── finnAI.ts          # Finn AI memory system
│   ├── supabase.ts        # Supabase helpers
│   └── ...
├── supabase/
│   ├── functions/         # Edge functions
│   │   └── fishy-ai-assistant/  # AI chatbot
│   └── migrations/        # Database migrations
└── docs/                  # Documentation
```

---

## API Routes

### Booking APIs
- `POST /api/bookings/create` - Create booking from Finn concierge
- `POST /api/bookings/track` - Track bookings for learning
- `POST /api/bookings/create-checkout` - Create Stripe checkout
- `GET /api/bookings/verify` - Verify booking status

### Package APIs
- `POST /api/packages/create` - Create vacation package

### Rental APIs
- `GET /api/rentals` - Get rental listings
- `GET /api/rentals/[id]` - Get rental details

### GCC Integration
- `GET /api/gcc/boats` - Proxy GCC boat listings

### Search
- `POST /api/integrated-search` - Unified search (rentals + boats)

---

## Supabase Edge Functions

- `fishy-ai-assistant` - AI chatbot with learning capabilities

---

## Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin)

### Payment
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

### GCC Integration (Optional)
- `NEXT_PUBLIC_GCC_BASE_URL` - GCC base URL for integration
- `GCC_BASE_URL` - Server-side GCC URL

### AI Services
- `GATEWAY_API_KEY` - AI Gateway API key (for chatbots)

---

## Database

### Key Tables
- `destinations` - Destination information
- `accommodations` - Vacation rental listings
- `vacation_packages` - User-created packages
- `attractions` - Points of interest
- `fishy_conversations` - Chatbot learning data
- `fishy_learning_patterns` - AI patterns

See `supabase/migrations/` for complete schema.

---

## Integration with Gulf Coast Charters

WTV integrates with GCC for:
- **Shared Authentication** - Single sign-on
- **Cross-Platform Packages** - Rentals + charters
- **Unified Search** - Search both platforms
- **Loyalty Points** - Shared points system
- **Booking Coordination** - Synchronized availability

See `docs/CROSS_PLATFORM_INTEGRATION.md` for details.

---

## Deployment

- **Platform**: Vercel
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Node Version**: >=20.0.0

Configuration in `vercel.json`.

---

## Development Notes

- Uses App Router (not Pages Router)
- AI systems use singleton pattern for memory
- Client components marked with `'use client'`
- Supabase client handles SSR/CSR automatically

---

## Documentation

- `docs/AUDIT_REPORT.md` - System audit
- `docs/DEEP_AUDIT_SUMMARY.md` - Audit summary
- `docs/CROSS_PLATFORM_INTEGRATION.md` - GCC integration guide
