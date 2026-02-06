# 🐾 PetReunion - Complete System Overview

## Mission
**"Together We Bring Them Home"** - A free, community-powered platform to reunite lost pets with their families.

---

## Architecture

### Tech Stack
- **Framework:** Next.js 14.2.3 (React 18.2.0)
- **Database:** Supabase (PostgreSQL)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **Port:** 3006 (development)

### Project Structure
```
apps/petreunion/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── report/            # Report pages (lost/found)
│   ├── search/            # Search page
│   ├── page.tsx           # Homepage
│   └── layout.tsx         # Root layout
├── components/            # React components
│   └── HelpBot.tsx        # Chatbot component
├── lib/                   # Utilities
│   ├── facebook-poster.ts # Facebook integration
│   ├── location-parser.ts # Location parsing
│   ├── rate-limit.ts      # Rate limiting
│   ├── scraper-utils.ts   # Scraper utilities
│   └── validation.ts      # Input validation
├── supabase/              # Database schemas
└── chatbot/               # Chatbot knowledge base
```

---

## Core Features

### 1. **Lost Pet Reporting** (`/report/lost`)
**Purpose:** Allow owners to report missing pets

**Features:**
- Form with pet details (name, type, breed, color, size, age, gender)
- Location input (parses "City, State" format)
- Date lost selection
- Description field
- Contact information (name, email, phone)
- **Photo URL field** (text input - NO file upload yet)

**Validation:**
- Required: Pet type, color, date lost, location
- Location must be "City, State" format
- Date cannot be future or >10 years ago
- Email/phone format validation
- Character limits on all fields

**API:** `POST /api/report-lost`
- Stores in `lost_pets` table
- Status: `'lost'`
- Rate limited (10 requests per client)

---

### 2. **Found Pet Reporting** (`/report/found`)
**Purpose:** Allow finders to report found pets

**Features:**
- Similar form to lost pet reporting
- Date found instead of date lost
- Status: `'found'`
- Automatically searches for matching lost pet reports

**API:** `POST /api/report-found`
- Stores in `lost_pets` table
- Status: `'found'`

---

### 3. **Search Functionality** (`/search`)
**Purpose:** Search database for lost/found pets

**Features:**
- Text search (name, breed, color, description, location)
- Filters:
  - Pet type (dog/cat)
  - Status (lost/found/all)
  - Location (state, city)
  - Date range
- Displays pet cards with photos
- **NO image matching** - text-based only

**API:** `GET /api/petreunion/search-for-lost-pet`
- Queries `lost_pets` table
- Returns up to 50 results
- Orders by most recent

---

### 4. **Pet of the Day**
**Purpose:** Feature a different pet daily on Facebook

**Features:**
- SQL function: `get_next_pet_of_day()`
- Selects pet with photo that hasn't been posted today
- Logs posts in `pet_of_day_log` table
- Posts to Facebook via Graph API
- Can be called manually or via cron

**API:** `GET /api/pet-of-the-day`
- Parameters: `?action=post|preview&force=true`
- Returns pet data and Facebook post result

**Cron:** `/api/cron/pet-of-the-day` (for scheduled posts)

**Database:**
- Table: `pet_of_day_log` (tracks daily posts)
- Function: `get_next_pet_of_day()` (returns next pet)
- Requires pets with `photo_url` NOT NULL

---

### 5. **Web Scrapers**
**Purpose:** Automatically collect pet data from external sources

#### A. PetHarbor Scraper (`/api/petreunion/scrape-petharbor`)
- **Status:** Generates simulated pet data
- **Features:**
  - Creates random pets with realistic data
  - Assigns placeholder photos (dog.ceo/thecatapi)
  - Uses duplicate checking before insert
  - Batch processing (100 pets at a time)

#### B. Social Media Scraper (`/api/petreunion/scrape-social-media`)
- **Status:** Simulation only (not real scraping)
- **Platforms:** Facebook, Instagram, TikTok (simulated)
- **Features:**
  - Generates fake pet listings
  - **Does NOT store photos** (sets `photo_url: null`)
  - Marks source platform

#### C. PawBoost Scraper (`/api/petreunion/scrape-pawboost`)
- **Status:** Placeholder (TODO: implement actual scraping)
- **Features:**
  - Infers breed/color/size from description
  - Would scrape PawBoost listings (not implemented)

**All scrapers use:**
- `insertPetsSafely()` - Prevents duplicates
- Checks unique signature: `pet_name + pet_type + location_city + location_state`
- Batch inserts with error handling

---

### 6. **Help Bot** (Chatbot)
**Purpose:** Provide in-app help to users

**Features:**
- Floating chat button on homepage
- Keyword-based responses
- Helps with:
  - Reporting lost/found pets
  - Location format
  - Form errors
  - Search functionality
  - Required fields

**Implementation:**
- Client-side only (no AI/ML)
- Simple keyword matching
- Pre-defined responses

---

## Database Schema

### Main Table: `lost_pets`
**Purpose:** Stores all lost and found pet reports

**Key Fields:**
- `id` (UUID, primary key)
- `pet_name` (TEXT)
- `pet_type` ('dog' | 'cat')
- `breed` (TEXT)
- `color` (TEXT, required)
- `size` ('small' | 'medium' | 'large')
- `age` (TEXT)
- `gender` (TEXT)
- `description` (TEXT)
- `photo_url` (TEXT) - **Currently accepts URLs only, no file upload**
- `status` ('lost' | 'found')
- `location_city` (TEXT)
- `location_state` (TEXT, 2-letter code)
- `location_zip` (TEXT)
- `location_detail` (TEXT)
- `date_lost` (DATE)
- `date_found` (DATE)
- `owner_name` (TEXT)
- `owner_email` (TEXT)
- `owner_phone` (TEXT)
- `source_platform` (TEXT) - For scraped pets
- `source_url` (TEXT)
- `source_post_id` (TEXT)
- `shelter_name` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Constraints:**
- Unique constraint: `pet_name + pet_type + location_city + location_state`
- RLS enabled (public read access)

### Supporting Tables

#### `pet_of_day_log`
- Tracks which pets were featured as "Pet of the Day"
- Fields: `id`, `pet_id`, `posted_date`, `created_at`
- Unique: `(pet_id, posted_date)` - prevents duplicate posts per day

#### `pet_of_the_day`
- Alternative tracking table (for Facebook posts)
- Fields: `id`, `pet_id`, `posted_at`, `facebook_post_id`, `status`
- Tracks Facebook post IDs

---

## API Endpoints

### Public APIs
1. **`POST /api/report-lost`** - Report lost pet
2. **`POST /api/report-found`** - Report found pet
3. **`GET /api/petreunion/search-for-lost-pet`** - Search pets
4. **`GET /api/pet-of-the-day`** - Get/Post pet of the day

### Admin/Scraper APIs
5. **`POST /api/petreunion/scrape-petharbor`** - Scrape PetHarbor
6. **`POST /api/petreunion/scrape-social-media`** - Scrape social media
7. **`POST /api/petreunion/scrape-pawboost`** - Scrape PawBoost
8. **`GET /api/cron/pet-of-the-day`** - Cron job for pet of the day

---

## Key Utilities

### `lib/validation.ts`
- Input sanitization
- Email/phone validation
- Date validation
- Pet type/size validation
- URL validation
- Character length limits

### `lib/location-parser.ts`
- Parses various location formats:
  - "City, State"
  - "City State"
  - "City, ST"
  - "City, State ZIP"
- Converts full state names to abbreviations
- Handles edge cases (multi-word cities, etc.)

### `lib/scraper-utils.ts`
- `checkPetExists()` - Check if pet already in database
- `filterDuplicates()` - Filter duplicate pets from batch
- `insertPetsSafely()` - Insert with duplicate checking
- Uses unique signature matching

### `lib/facebook-poster.ts`
- Posts to Facebook Page via Graph API
- Formats pet information for Facebook
- Handles photo URLs
- Error handling and retry logic

### `lib/rate-limit.ts`
- Rate limiting for API endpoints
- Prevents abuse
- Client-based tracking

---

## Current Data Status

### Database Migration
- **Source:** FREE Supabase project (`nqkbqtiramecvmmpaxzk`)
- **Target:** PRO Supabase project (`rdbuwyefbgnbuhmjrizo`)
- **Recovered:** 10,397 pets
- **Status:** ✅ Complete

### Photo Situation
- **10,397 pets** - All have placeholder photos (random stock photos)
- **0 pets** - Have real photos
- **Photo upload:** NOT implemented (only accepts URL strings)
- **Image matching:** NOT implemented (advertised but missing)

---

## Missing/Incomplete Features

### 🔴 CRITICAL
1. **Photo Upload** - Users can't upload photos, only provide URLs
2. **Image Matching** - Advertised but not implemented
3. **Real Photos** - All pets have placeholder/random photos

### 🟡 HIGH PRIORITY
4. **PawBoost Scraper** - Placeholder only, not implemented
5. **Social Media Scraper** - Simulation only, doesn't extract real photos
6. **Photo Storage** - No Supabase Storage bucket for photos

### 🟢 MEDIUM PRIORITY
7. **Shelter Directory** - Mentioned on homepage but not implemented
8. **Advanced Search** - Basic text search only
9. **User Accounts** - No authentication system
10. **Email Notifications** - No notification system

---

## External Integrations

### Facebook
- **Purpose:** Post "Pet of the Day"
- **API:** Facebook Graph API
- **Required:** `FACEBOOK_PAGE_ACCESS_TOKEN`, `FACEBOOK_PAGE_ID`
- **Status:** Implemented but requires configuration

### Zapier
- **Purpose:** Automate "Pet of the Day" posts
- **Method:** SQL function `get_next_pet_of_day()`
- **Status:** Ready for Zapier integration

---

## Security & Performance

### Security
- **RLS (Row Level Security):** Enabled on all tables
- **Public read access:** Allowed for `lost_pets`
- **Rate limiting:** 10 requests per client for reporting
- **Input sanitization:** All user inputs sanitized
- **SQL injection protection:** Parameterized queries via Supabase

### Performance
- **Pagination:** Search limited to 50 results
- **Batch processing:** Scrapers process in batches of 100
- **Indexes:** On `created_at`, `location_state`, `status`, `pet_type`
- **Duplicate checking:** Prevents unnecessary inserts

---

## Deployment

### Environment Variables
**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Optional:**
- `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
- `FACEBOOK_PAGE_ACCESS_TOKEN` (for Facebook posts)
- `FACEBOOK_PAGE_ID` (for Facebook posts)
- `FACEBOOK_API_VERSION` (default: 'v18.0')

### Vercel Configuration
- **Project:** `petreunion` (in `shataken-sources-projects` team)
- **Root Directory:** `apps/petreunion`
- **Build Command:** `npm run build`
- **Framework:** Next.js

---

## Known Issues

1. **Photos:** All pets have placeholder photos, no real photos stored
2. **Photo Upload:** Not implemented - users must provide URLs
3. **Image Matching:** Advertised but not implemented
4. **Scrapers:** Most are simulations, not real scrapers
5. **Shelter Directory:** Page doesn't exist yet

---

## Future Enhancements

### Phase 1: Photo System
- Implement photo upload to Supabase Storage
- Create `pet-photos` bucket
- Update forms to accept file uploads
- Migrate existing photos (if found)

### Phase 2: Image Matching
- Research image matching solutions (Google Vision, AWS Rekognition, etc.)
- Implement basic image comparison
- Return similarity scores
- Show top matches to users

### Phase 3: Real Scrapers
- Implement actual PetHarbor scraping
- Implement real social media scraping
- Extract and store real photos from sources

### Phase 4: Advanced Features
- User authentication
- Email notifications
- Shelter directory
- Advanced search filters
- Multi-photo support
- Photo editing tools

---

## Summary

**PetReunion** is a **Next.js-based web application** for reuniting lost pets with their families. It provides:

✅ **Working Features:**
- Lost/found pet reporting
- Text-based search
- Pet of the Day (Facebook integration)
- Web scrapers (simulated)
- Help chatbot
- Input validation
- Rate limiting

❌ **Missing Features:**
- Photo upload (only URL input)
- Image matching (advertised but not implemented)
- Real photos (all placeholders)
- Real scrapers (most are simulations)
- Shelter directory

**Current State:**
- 10,397 pets in database
- All have placeholder photos
- System is functional but limited by missing photo features
- Core matching relies on text search only

**Critical Path Forward:**
1. Implement photo upload
2. Find/migrate real photos
3. Implement image matching
4. Enhance scrapers to extract real photos
