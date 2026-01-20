# Cross-Platform Integration
## GulfCoastCharters.com ↔ WhereToVacation.com

---

## 🎯 Integration Overview

**GulfCoastCharters.com** - Watercraft rentals & charter fishing  
**WhereToVacation.com** - Vacation destinations, accommodations, attractions

### Integration Benefits:
- ✅ Cross-sell opportunities (book boat + vacation home)
- ✅ Unified user accounts (single sign-on)
- ✅ Shared reviews & ratings
- ✅ Package deals (accommodation + activities)
- ✅ Consolidated booking management
- ✅ Shared loyalty points system

---

## 🔌 API Integration Architecture

### Shared User System (SSO)

```sql
-- Shared Users Table (synchronized across platforms)
CREATE TABLE shared_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  
  -- Profile
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  
  -- Preferences
  preferred_activities JSONB DEFAULT '[]', -- ['fishing', 'watersports', 'beach', 'hiking']
  budget_range VARCHAR(50), -- 'budget', 'moderate', 'luxury'
  travel_style VARCHAR(50), -- 'family', 'couples', 'adventure', 'relaxation'
  
  -- Unified Loyalty Points
  total_points INTEGER DEFAULT 0,
  points_gcc INTEGER DEFAULT 0, -- Gulf Coast Charters
  points_wtv INTEGER DEFAULT 0, -- Where To Vacation
  loyalty_tier VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  
  -- Platform-specific data
  gcc_user_data JSONB DEFAULT '{}', -- Charter preferences, fishing experience
  wtv_user_data JSONB DEFAULT '{}', -- Travel preferences, accommodation preferences
  
  -- Verification
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Platform Sessions
CREATE TABLE platform_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES shared_users(id),
  platform VARCHAR(20), -- 'gcc', 'wtv'
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🏖️ WhereToVacation.com Data Model

### Vacation Destinations

```sql
CREATE TABLE vacation_destinations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Info
  name TEXT NOT NULL, -- "Gulf Shores, Alabama"
  slug TEXT UNIQUE NOT NULL, -- "gulf-shores-al"
  region VARCHAR(100), -- "Gulf Coast"
  state VARCHAR(50),
  country VARCHAR(50) DEFAULT 'USA',
  
  -- Location
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  timezone VARCHAR(50),
  
  -- Description
  description TEXT,
  highlights TEXT[], -- ["White sand beaches", "Family friendly", "Water sports"]
  best_time_to_visit TEXT, -- "May-September"
  
  -- Activities Available (links to GCC)
  available_activities JSONB DEFAULT '[]', -- ['charter_fishing', 'jet_ski', 'pontoon', etc.]
  
  -- Media
  photos TEXT[] DEFAULT '{}',
  primary_photo TEXT,
  video_url TEXT,
  
  -- Metrics
  popularity_score INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2),
  total_reviews INTEGER DEFAULT 0,
  
  -- Status
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Accommodations
CREATE TABLE accommodations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id UUID REFERENCES vacation_destinations(id),
  
  -- Basic Info
  name TEXT NOT NULL,
  type VARCHAR(50), -- 'hotel', 'vacation_rental', 'condo', 'resort', 'campground'
  
  -- Details
  description TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  max_guests INTEGER,
  
  -- Amenities
  amenities JSONB DEFAULT '[]', -- Pool, WiFi, Kitchen, Beach access, etc.
  
  -- Pricing
  nightly_rate DECIMAL(10, 2),
  weekly_rate DECIMAL(10, 2),
  cleaning_fee DECIMAL(10, 2),
  
  -- Location
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_to_beach_miles DECIMAL(4, 2),
  distance_to_marina_miles DECIMAL(4, 2), -- Important for GCC integration!
  
  -- Photos
  photos TEXT[] DEFAULT '{}',
  
  -- Availability
  available_for_booking BOOLEAN DEFAULT true,
  min_stay_nights INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Attractions
CREATE TABLE attractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id UUID REFERENCES vacation_destinations(id),
  
  name TEXT NOT NULL,
  category VARCHAR(50), -- 'restaurant', 'museum', 'park', 'beach', 'shopping', 'nightlife'
  description TEXT,
  
  -- Location
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Details
  price_range VARCHAR(20), -- '$', '$$', '$$$', '$$$$'
  hours_of_operation JSONB,
  website TEXT,
  phone TEXT,
  
  photos TEXT[] DEFAULT '{}',
  rating DECIMAL(3, 2),
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎁 Package Deals

### Vacation + Activity Packages

```sql
CREATE TABLE vacation_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Package Info
  name TEXT NOT NULL, -- "Gulf Shores Beach & Fishing Package"
  description TEXT,
  
  -- Components
  destination_id UUID REFERENCES vacation_destinations(id),
  accommodation_id UUID REFERENCES accommodations(id),
  
  -- GCC Activities Included
  included_activities JSONB DEFAULT '[]',
  /* Example:
  [
    {
      "type": "charter_fishing",
      "duration": "half_day",
      "quantity": 1,
      "description": "4-hour inshore fishing charter"
    },
    {
      "type": "jet_ski",
      "duration": "hourly",
      "quantity": 2,
      "hours": 2,
      "description": "2 jet skis for 2 hours"
    }
  ]
  */
  
  -- Pricing
  accommodation_nights INTEGER,
  base_price DECIMAL(10, 2),
  package_discount_percent INTEGER, -- Save 15%!
  final_price DECIMAL(10, 2),
  
  -- Availability
  available_seasons TEXT[], -- ['spring', 'summer', 'fall']
  min_guests INTEGER DEFAULT 1,
  max_guests INTEGER,
  
  -- Photos
  photos TEXT[] DEFAULT '{}',
  
  -- Popular?
  is_featured BOOLEAN DEFAULT false,
  bookings_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 Integration APIs

### 1. Cross-Platform Search

**Search vacations WITH activities**

```javascript
POST /api/v1/integrated-search

Request:
{
  // Destination
  destination: "Gulf Shores, AL",
  check_in: "2024-12-15",
  check_out: "2024-12-20",
  guests: 4,
  
  // Accommodation preferences
  accommodation_type: "vacation_rental",
  max_nightly_rate: 300,
  min_bedrooms: 2,
  required_amenities: ["pool", "beach_access"],
  
  // Activity preferences (GCC)
  desired_activities: [
    {
      type: "charter_fishing",
      date: "2024-12-16",
      duration: "full_day",
      participants: 4
    },
    {
      type: "jet_ski",
      date: "2024-12-17",
      quantity: 2,
      hours: 2
    }
  ]
}

Response:
{
  success: true,
  packages: [
    {
      // Accommodation
      accommodation: {
        id: "uuid",
        name: "Beachfront Condo - Sleeps 6",
        nightly_rate: 250,
        total_accommodation: 1250, // 5 nights
        photos: [...]
      },
      
      // Available activities from GCC
      available_activities: [
        {
          vessel_id: "uuid",
          vessel_name: "Reel Deal",
          activity_type: "charter_fishing",
          date: "2024-12-16",
          duration: "full_day",
          price: 1400,
          captain: {...}
        },
        {
          vessel_id: "uuid",
          vessel_name: "Yamaha VX #1 & #2",
          activity_type: "jet_ski",
          date: "2024-12-17",
          quantity: 2,
          hours: 2,
          price: 198 // $99 each
        }
      ],
      
      // Package pricing
      pricing: {
        accommodation_subtotal: 1250,
        activities_subtotal: 1598,
        package_total: 2848,
        package_discount: 284, // 10% package discount
        final_total: 2564,
        savings: 284
      },
      
      // Distance/convenience
      accommodation_to_marina: 0.8 // miles
    }
  ],
  total_results: 12
}
```

---

### 2. Unified Booking

**Book complete vacation package**

```javascript
POST /api/v1/integrated-booking

Request:
{
  user_id: "uuid",
  
  // Accommodation booking (WTV)
  accommodation_id: "uuid",
  check_in: "2024-12-15",
  check_out: "2024-12-20",
  guests: 4,
  
  // Activity bookings (GCC)
  activities: [
    {
      vessel_id: "uuid",
      date: "2024-12-16",
      duration: "full_day",
      participants: 4
    },
    {
      vessel_id: "uuid",
      date: "2024-12-17",
      activity_type: "jet_ski",
      quantity: 2,
      hours: 2
    }
  ],
  
  // Payment
  payment_method: "card_xxx",
  
  // Loyalty points
  use_points: 1000, // Apply 1000 points = $10 discount
}

Response:
{
  success: true,
  booking: {
    confirmation_code: "GCWV-2024-54321",
    
    // Accommodation
    accommodation_booking: {
      id: "uuid",
      platform: "wtv",
      status: "confirmed",
      check_in: "2024-12-15",
      check_out: "2024-12-20",
      total: 1250
    },
    
    // Activities
    activity_bookings: [
      {
        id: "uuid",
        platform: "gcc",
        status: "confirmed",
        date: "2024-12-16",
        activity: "Charter Fishing - Full Day",
        total: 1400
      },
      {
        id: "uuid",
        platform: "gcc",
        status: "confirmed",
        date: "2024-12-17",
        activity: "2 Jet Skis - 2 Hours",
        total: 198
      }
    ],
    
    // Summary
    total_paid: 2554, // $2564 - $10 points
    points_earned: 256, // 10% back
    new_points_balance: 256
  }
}
```

---

### 3. Loyalty Points System

**Unified across both platforms**

```javascript
// Points earning
GCC Bookings:
- Charter fishing: 10% back in points
- Watercraft rental: 8% back in points
- Package deal: 12% back in points

WTV Bookings:
- Accommodation: 5% back in points
- Package deal: 8% back in points

// Points redemption (1 point = $0.01)
- 1000 points = $10 off any booking
- 5000 points = $50 off + priority customer service
- 10000 points = $100 off + early access to deals

// Loyalty tiers
Bronze (0-999 points): Standard benefits
Silver (1000-4999): 5% bonus points
Gold (5000-9999): 10% bonus points, priority support
Platinum (10000+): 15% bonus points, exclusive deals, concierge service
```

---

### 4. Shared Reviews & Ratings

```javascript
POST /api/v1/shared-review

Request:
{
  user_id: "uuid",
  review_type: "destination", // or 'accommodation', 'vessel', 'package'
  entity_id: "uuid",
  platform: "wtv", // or 'gcc'
  
  rating: 5,
  title: "Perfect family vacation!",
  content: "Amazing week in Gulf Shores. The condo was perfect and the fishing charter was incredible!",
  
  // Optional: linked bookings
  related_bookings: [
    { platform: "wtv", booking_id: "uuid" },
    { platform: "gcc", booking_id: "uuid" }
  ],
  
  photos: ["https://...", "https://..."]
}

// This review appears on:
// - WTV destination page
// - GCC captain/vessel page
// - User's unified profile
```

---

## 🌐 Embedded Widgets

### GCC Widget on WTV Destination Pages

```html
<!-- Embedded on wheretovacation.com/destinations/gulf-shores-al -->

<div class="gcc-activities-widget">
  <h3>🎣 Book Activities in Gulf Shores</h3>
  
  <div class="activity-cards">
    <!-- Charter Fishing -->
    <div class="activity-card">
      <img src="charter-fishing.jpg" />
      <h4>Charter Fishing</h4>
      <p>Half day from $800</p>
      <a href="https://gulfcoastcharters.com/search?location=gulf-shores&type=charter">
        Browse Charters
      </a>
    </div>
    
    <!-- Jet Skis -->
    <div class="activity-card">
      <img src="jetski.jpg" />
      <h4>Jet Ski Rentals</h4>
      <p>From $99/hour</p>
      <a href="https://gulfcoastcharters.com/search?location=gulf-shores&type=jetski">
        Rent Now
      </a>
    </div>
    
    <!-- Pontoon -->
    <div class="activity-card">
      <img src="pontoon.jpg" />
      <h4>Pontoon Boats</h4>
      <p>From $449/half-day</p>
      <a href="https://gulfcoastcharters.com/search?location=gulf-shores&type=pontoon">
        View Boats
      </a>
    </div>
  </div>
</div>

<script src="https://gulfcoastcharters.com/widgets/activities.js"></script>
<script>
  GCCWidget.init({
    destination: 'gulf-shores-al',
    checkIn: userSelectedCheckIn,
    checkOut: userSelectedCheckOut
  });
</script>
```

---

### WTV Widget on GCC Vessel Pages

```html
<!-- Embedded on gulfcoastcharters.com/vessels/reel-deal -->

<div class="wtv-accommodations-widget">
  <h3>🏖️ Where to Stay Near This Marina</h3>
  
  <div class="accommodation-cards">
    <!-- Nearby vacation rentals -->
    <div class="accommodation-card">
      <img src="beachfront-condo.jpg" />
      <h4>Beachfront Condo</h4>
      <p>0.5 miles from marina • $250/night</p>
      <a href="https://wheretovacation.com/gulf-shores/beachfront-condo">
        Book Now
      </a>
    </div>
  </div>
  
  <a href="https://wheretovacation.com/gulf-shores" class="view-all">
    View All Accommodations in Gulf Shores →
  </a>
</div>

<script src="https://wheretovacation.com/widgets/accommodations.js"></script>
<script>
  WTVWidget.init({
    marinaLocation: { lat: 30.2736, lon: -87.5928 },
    maxDistance: 5 // miles
  });
</script>
```

---

## 📊 Shared Analytics Dashboard

### Unified Business Intelligence

```javascript
// Cross-platform insights
{
  // User journey
  "conversion_funnel": {
    "wtv_search": 10000,       // Started on WTV
    "wtv_to_gcc": 3000,         // Clicked GCC widget
    "gcc_added": 1500,          // Added activity to cart
    "package_booked": 800       // Booked complete package
  },
  
  // Revenue attribution
  "revenue_by_source": {
    "wtv_direct": 150000,       // Just accommodation
    "gcc_direct": 250000,       // Just activities
    "cross_platform": 400000    // Combined package
  },
  
  // Top combinations
  "popular_packages": [
    {
      "accommodation": "Beachfront Condos",
      "activity": "Charter Fishing",
      "bookings": 234,
      "avg_value": 2800
    }
  ]
}
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Month 1)
- [ ] Shared user authentication system
- [ ] Unified loyalty points database
- [ ] Basic API endpoints
- [ ] SSO between platforms

### Phase 2: Search Integration (Month 2)
- [ ] Cross-platform search API
- [ ] Activity availability checking
- [ ] Package pricing engine
- [ ] Distance/convenience calculations

### Phase 3: Booking Integration (Month 3)
- [ ] Unified booking API
- [ ] Payment processing (split payments)
- [ ] Confirmation emails (both platforms)
- [ ] Calendar synchronization

### Phase 4: Widgets & Embedding (Month 4)
- [ ] GCC widget for WTV
- [ ] WTV widget for GCC
- [ ] Real-time availability
- [ ] Mobile responsive

### Phase 5: Advanced Features (Month 5-6)
- [ ] Package builder tool
- [ ] Shared reviews system
- [ ] Unified analytics dashboard
- [ ] Loyalty tier benefits
- [ ] Concierge service

---

## 💡 Example User Journeys

### Journey 1: Vacation Planner
1. User visits **WhereToVacation.com**
2. Searches for "Gulf Shores beach vacation"
3. Finds beachfront condo for $1,250/week
4. Sees **GCC widget** with activities
5. Adds charter fishing trip (+$1,400)
6. Adds jet ski rental (+$198)
7. Gets **10% package discount** ($285 off)
8. Books everything in **one transaction**
9. Earns **256 loyalty points**
10. Receives **combined confirmation** with itinerary

### Journey 2: Fishing Enthusiast
1. User visits **GulfCoastCharters.com**
2. Books offshore fishing charter for next month
3. Sees **WTV widget** asking "Where are you staying?"
4. Finds nearby accommodation (0.5 miles from marina)
5. Books condo through GCC interface
6. Gets **package discount**
7. Manages both bookings in **one dashboard**

---

## 🎯 Business Benefits

### For Customers:
- ✅ One-stop shopping for complete vacation
- ✅ Package discounts (save 10-15%)
- ✅ Unified loyalty points
- ✅ Single customer service contact
- ✅ Coordinated booking management

### For Business:
- ✅ Increased average order value (+45%)
- ✅ Higher conversion rates (+30%)
- ✅ Cross-sell opportunities
- ✅ Shared customer acquisition costs
- ✅ Stronger brand ecosystem
- ✅ Better data insights

---

**Two platforms, one seamless vacation experience! 🏖️🎣**
