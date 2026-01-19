# Cross-Platform Integration
## GulfCoastCharters.com ↔️ WhereToVacation.com

---

## 🎯 Integration Vision

Create a seamless ecosystem where:
- **WhereToVacation.com** (vacation planning/booking) ↔️ **GulfCoastCharters.com** (boat rentals/charters)
- Users can book vacation rentals AND boat experiences in one transaction
- Data flows bidirectionally for bookings, reviews, and user profiles
- Shared loyalty program and community features

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────┐      ┌─────────────────────────────────┐
│   WhereToVacation.com           │      │   GulfCoastCharters.com         │
│   (Vacation Rentals)            │◄────►│   (Boat Rentals/Charters)       │
├─────────────────────────────────┤      ├─────────────────────────────────┤
│ • Vacation home listings        │      │ • Vessel listings               │
│ • Hotel/condo bookings          │      │ • Charter fishing trips         │
│ • Activity packages             │      │ • PWC/pontoon rentals           │
│ • Destination guides            │      │ • Captain services              │
│ • Restaurant recommendations    │      │ • Equipment rentals             │
└─────────────────────────────────┘      └─────────────────────────────────┘
                 │                                        │
                 └────────────┬───────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Integration Layer  │
                    │   (Shared API)      │
                    ├─────────────────────┤
                    │ • User Management   │
                    │ • Booking Sync      │
                    │ • Payment Processing│
                    │ • Reviews/Ratings   │
                    │ • Loyalty Program   │
                    │ • Recommendations   │
                    └─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Shared Database    │
                    │   (PostgreSQL)      │
                    ├─────────────────────┤
                    │ • Users (SSO)       │
                    │ • Bookings          │
                    │ • Reviews           │
                    │ • Points/Rewards    │
                    └─────────────────────┘
```

---

## 🔐 Unified Authentication (SSO)

### Single Sign-On Implementation

Users create ONE account that works across both platforms.

```sql
-- Shared users table
CREATE TABLE shared_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Authentication
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  
  -- Profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  
  -- Preferences
  home_location VARCHAR(255),
  preferred_currency VARCHAR(3) DEFAULT 'USD',
  notification_preferences JSONB DEFAULT '{}',
  
  -- Platform activity
  gcc_active BOOLEAN DEFAULT false, -- Active on GulfCoastCharters
  wtv_active BOOLEAN DEFAULT false, -- Active on WhereToVacation
  
  -- Loyalty
  total_points INTEGER DEFAULT 0,
  loyalty_tier VARCHAR(50) DEFAULT 'bronze',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  email_verified BOOLEAN DEFAULT false,
  
  -- Platform tracking
  primary_platform VARCHAR(20), -- 'gcc' or 'wtv'
  signup_source VARCHAR(50)
);

-- Platform-specific profiles
CREATE TABLE gcc_profiles (
  user_id UUID PRIMARY KEY REFERENCES shared_users(id),
  is_captain BOOLEAN DEFAULT false,
  vessel_count INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  average_rating DECIMAL(2,1),
  specialties TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wtv_profiles (
  user_id UUID PRIMARY KEY REFERENCES shared_users(id),
  is_property_owner BOOLEAN DEFAULT false,
  property_count INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  average_rating DECIMAL(2,1),
  travel_preferences JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### JWT Token Structure

```javascript
// Shared JWT token payload
const tokenPayload = {
  userId: 'uuid',
  email: 'user@example.com',
  platforms: {
    gcc: {
      active: true,
      isCaptain: false,
      permissions: ['book', 'review']
    },
    wtv: {
      active: true,
      isOwner: true,
      permissions: ['book', 'list_property', 'review']
    }
  },
  loyaltyTier: 'gold',
  points: 2450,
  iat: 1700000000,
  exp: 1700086400
};
```

---

## 📦 Unified Booking System

### Cross-Platform Booking

Users can book BOTH vacation rental AND boat experience in single checkout.

```sql
CREATE TABLE unified_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User
  user_id UUID REFERENCES shared_users(id),
  
  -- Booking details
  booking_type VARCHAR(50), -- 'package', 'rental_only', 'boat_only'
  
  -- Vacation rental (if applicable)
  wtv_property_id UUID,
  wtv_check_in DATE,
  wtv_check_out DATE,
  wtv_guests INTEGER,
  wtv_total DECIMAL(10,2),
  
  -- Boat experience (if applicable)
  gcc_vessel_id UUID,
  gcc_trip_date TIMESTAMP,
  gcc_duration_hours DECIMAL(5,2),
  gcc_passengers INTEGER,
  gcc_total DECIMAL(10,2),
  
  -- Combined pricing
  subtotal DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  
  -- Payment
  payment_status VARCHAR(50),
  payment_intent_id TEXT,
  
  -- Package deals
  is_package BOOLEAN DEFAULT false,
  package_discount_percent DECIMAL(5,2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example: Vacation + Boat Package
INSERT INTO unified_bookings (
  user_id,
  booking_type,
  wtv_property_id,
  wtv_check_in,
  wtv_check_out,
  wtv_guests,
  wtv_total,
  gcc_vessel_id,
  gcc_trip_date,
  gcc_duration_hours,
  gcc_passengers,
  gcc_total,
  is_package,
  package_discount_percent,
  total_amount
) VALUES (
  'user-123',
  'package',
  'beachhouse-456',
  '2025-06-01',
  '2025-06-07',
  6,
  1800.00,
  'vessel-789',
  '2025-06-03 08:00:00',
  4,
  6,
  400.00,
  true,
  15.00, -- 15% package discount
  1870.00 -- ($1800 + $400) * 0.85
);
```

---

## 🎁 Package Deals & Bundles

### Smart Package Recommendations

```javascript
// Automatic package suggestions
const packageDeals = {
  "beach_week_fishing": {
    name: "Beach Week + Fishing Charter",
    includes: [
      { type: 'wtv', category: 'beachfront_rental', nights: 7 },
      { type: 'gcc', category: 'fishing_charter', hours: 4 }
    ],
    discount: 15,
    description: "Save 15% when you book a week-long beach rental with a fishing charter"
  },
  
  "weekend_getaway_pontoon": {
    name: "Weekend Getaway + Pontoon Fun",
    includes: [
      { type: 'wtv', category: 'condo_rental', nights: 2 },
      { type: 'gcc', category: 'pontoon_rental', hours: 8 }
    ],
    discount: 10,
    description: "Weekend special: Beach condo + full-day pontoon rental"
  },
  
  "family_vacation_adventure": {
    name: "Family Vacation Adventure Pack",
    includes: [
      { type: 'wtv', category: 'vacation_home', nights: 7 },
      { type: 'gcc', category: 'fishing_charter', hours: 4 },
      { type: 'gcc', category: 'pwc_rental', hours: 2, quantity: 2 }
    ],
    discount: 20,
    description: "Ultimate family package with home rental, fishing trip, and jet ski fun"
  }
};

// Package recommendation engine
function recommendPackages(booking) {
  if (booking.platform === 'wtv' && booking.nights >= 5) {
    return [
      'beach_week_fishing',
      'family_vacation_adventure'
    ];
  }
  
  if (booking.platform === 'gcc' && booking.vessel_type === 'fishing_charter') {
    return [
      'beach_week_fishing'
    ];
  }
}
```

---

## 🔄 API Integration

### Shared API Endpoints

```javascript
// Base URL for shared services
const SHARED_API_BASE = 'https://api.shared.vacationplatform.com';

// Platform-specific URLs
const GCC_API = 'https://api.gulfcoastcharters.com';
const WTV_API = 'https://api.wheretovacation.com';
```

### Cross-Platform Booking Flow

```javascript
// Example: User books from WhereToVacation and adds boat experience

// 1. User selects vacation rental on WTV
POST /api/wtv/bookings
{
  "propertyId": "beachhouse-456",
  "checkIn": "2025-06-01",
  "checkOut": "2025-06-07",
  "guests": 6
}

// 2. WTV shows boat experience upsell from GCC
GET /api/gcc/vessels/nearby?
  lat=30.2672&
  lon=-87.6431&
  dates=2025-06-01to2025-06-07&
  passengers=6

// 3. User adds fishing charter
POST /api/shared/unified-booking
{
  "userId": "user-123",
  "bookingType": "package",
  "wtv": {
    "propertyId": "beachhouse-456",
    "checkIn": "2025-06-01",
    "checkOut": "2025-06-07",
    "guests": 6
  },
  "gcc": {
    "vesselId": "vessel-789",
    "tripDate": "2025-06-03T08:00:00Z",
    "duration": 4,
    "passengers": 6
  },
  "applyPackageDiscount": true
}

// 4. System creates unified booking
Response:
{
  "bookingId": "unified-abc123",
  "wtvBookingId": "wtv-xyz",
  "gccBookingId": "gcc-def",
  "subtotal": 2200.00,
  "packageDiscount": 330.00,
  "total": 1870.00,
  "pointsEarned": 187,
  "confirmations": {
    "vacation": "WTV-12345",
    "boat": "GCC-67890"
  }
}
```

---

## 🌟 Unified Loyalty Program

### Points System Across Platforms

```sql
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES shared_users(id),
  
  -- Transaction details
  transaction_type VARCHAR(50),
  points INTEGER,
  platform VARCHAR(20), -- 'gcc', 'wtv', 'both'
  
  -- Source
  source_type VARCHAR(50), -- 'booking', 'review', 'referral', 'milestone'
  source_id UUID,
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Earn points on both platforms
CREATE OR REPLACE FUNCTION award_booking_points(
  p_user_id UUID,
  p_amount DECIMAL,
  p_platform VARCHAR
) RETURNS INTEGER AS $$
DECLARE
  points INTEGER;
BEGIN
  -- 1 point per $10 spent
  points := FLOOR(p_amount / 10);
  
  -- Bonus points for package deals
  IF EXISTS (
    SELECT 1 FROM unified_bookings 
    WHERE user_id = p_user_id 
    AND is_package = true
  ) THEN
    points := points * 1.5; -- 50% bonus for packages
  END IF;
  
  INSERT INTO loyalty_transactions (
    user_id, transaction_type, points, platform, source_type
  ) VALUES (
    p_user_id, 'booking', points, p_platform, 'booking'
  );
  
  UPDATE shared_users 
  SET total_points = total_points + points
  WHERE id = p_user_id;
  
  RETURN points;
END;
$$ LANGUAGE plpgsql;
```

### Points Earning Examples

```javascript
const pointsEarning = {
  // WhereToVacation
  "wtv_booking": {
    base: "$10 spent = 1 point",
    bonus: {
      "7+ nights": "2x points",
      "returning_guest": "+50 points",
      "early_bird": "+25 points (30+ days advance)"
    }
  },
  
  // GulfCoastCharters
  "gcc_booking": {
    base: "$10 spent = 1 point",
    bonus: {
      "full_day_charter": "2x points",
      "group_booking": "+100 points (6+ passengers)",
      "repeat_captain": "+50 points"
    }
  },
  
  // Package Deals
  "package_booking": {
    base: "$10 spent = 1.5 points (50% bonus)",
    bonus: {
      "mega_package": "+200 points (rental + 2+ activities)"
    }
  },
  
  // Engagement
  "review_posted": "+25 points",
  "photo_shared": "+10 points",
  "referral": "+500 points (when friend books)"
};
```

### Loyalty Tiers

```javascript
const loyaltyTiers = {
  bronze: {
    threshold: 0,
    benefits: [
      "Earn points on bookings",
      "Email support",
      "Newsletter access"
    ]
  },
  
  silver: {
    threshold: 1000,
    benefits: [
      "All Bronze benefits",
      "5% discount on packages",
      "Priority email support",
      "Early access to new listings"
    ]
  },
  
  gold: {
    threshold: 2500,
    benefits: [
      "All Silver benefits",
      "10% discount on packages",
      "Phone support",
      "Free upgrade when available",
      "Birthday bonus: 100 points"
    ]
  },
  
  platinum: {
    threshold: 5000,
    benefits: [
      "All Gold benefits",
      "15% discount on packages",
      "24/7 concierge support",
      "Guaranteed upgrade",
      "Exclusive listings access",
      "Complimentary cancellation insurance"
    ]
  }
};
```

---

## 📊 Unified Reviews System

Users can review BOTH vacation rental AND boat experience.

```sql
CREATE TABLE unified_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reviewer
  user_id UUID REFERENCES shared_users(id),
  booking_id UUID REFERENCES unified_bookings(id),
  
  -- Platform
  platform VARCHAR(20), -- 'wtv', 'gcc', 'both'
  
  -- WTV property review
  wtv_property_id UUID,
  wtv_cleanliness INTEGER,
  wtv_accuracy INTEGER,
  wtv_location INTEGER,
  wtv_value INTEGER,
  wtv_comment TEXT,
  
  -- GCC vessel review
  gcc_vessel_id UUID,
  gcc_condition INTEGER,
  gcc_captain_rating INTEGER,
  gcc_experience INTEGER,
  gcc_value INTEGER,
  gcc_comment TEXT,
  
  -- Overall
  overall_rating DECIMAL(2,1),
  would_recommend BOOLEAN,
  
  -- Photos
  photos TEXT[],
  
  -- Status
  verified_booking BOOLEAN DEFAULT true,
  published BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔔 Cross-Platform Notifications

```javascript
// Notification when user books on one platform
async function sendCrossPlatformRecommendation(booking) {
  if (booking.platform === 'wtv') {
    // User booked vacation rental, suggest boat activities
    await sendEmail({
      to: booking.user.email,
      subject: "Make your vacation unforgettable!",
      template: "boat_activity_upsell",
      data: {
        userName: booking.user.firstName,
        destination: booking.property.location,
        dates: [booking.checkIn, booking.checkOut],
        recommendedActivities: await getBoatActivitiesNear(
          booking.property.location,
          booking.checkIn,
          booking.checkOut
        )
      }
    });
  }
  
  if (booking.platform === 'gcc') {
    // User booked boat, suggest accommodations
    await sendEmail({
      to: booking.user.email,
      subject: "Need a place to stay?",
      template: "accommodation_upsell",
      data: {
        userName: booking.user.firstName,
        tripDate: booking.tripDate,
        recommendedProperties: await getAccommodationsNear(
          booking.marina.location,
          booking.tripDate
        )
      }
    });
  }
}
```

---

## 💳 Unified Payment Processing

```javascript
// Single checkout for multi-platform booking
const createUnifiedPayment = async (booking) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  // Calculate total
  const wtvAmount = booking.wtv?.total || 0;
  const gccAmount = booking.gcc?.total || 0;
  const discount = booking.packageDiscount || 0;
  const total = (wtvAmount + gccAmount) - discount;
  
  // Create payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100), // Convert to cents
    currency: 'usd',
    metadata: {
      bookingId: booking.id,
      wtvBookingId: booking.wtvBookingId,
      gccBookingId: booking.gccBookingId,
      isPackage: booking.isPackage,
      userId: booking.userId
    },
    description: `Vacation Package: ${booking.wtv?.propertyName} + ${booking.gcc?.vesselName}`,
    
    // Split payment between platforms
    transfer_data: booking.isPackage ? {
      destination: 'connected_account_gcc' // If package, split funds
    } : null
  });
  
  return paymentIntent;
};
```

---

## 🎨 Shared UI Components

### Booking Widget (Embeddable)

```jsx
// Embeddable booking widget that works on both platforms
import React from 'react';

const UnifiedBookingWidget = ({ 
  platform, // 'gcc' or 'wtv'
  showUpsells = true,
  enablePackages = true 
}) => {
  const [cart, setCart] = useState({
    wtv: null,
    gcc: null
  });
  
  const packageDiscount = useMemo(() => {
    if (cart.wtv && cart.gcc) {
      return 0.15; // 15% off packages
    }
    return 0;
  }, [cart]);
  
  return (
    <div className="booking-widget">
      {/* Primary booking (WTV or GCC) */}
      <PrimaryBooking platform={platform} onBook={(booking) => {
        setCart(prev => ({
          ...prev,
          [platform]: booking
        }));
      }} />
      
      {/* Cross-sell section */}
      {showUpsells && cart[platform] && (
        <div className="upsell-section">
          <h3>Complete Your Experience</h3>
          {platform === 'wtv' && (
            <BoatActivityUpsell 
              location={cart.wtv.location}
              dates={cart.wtv.dates}
              onAdd={(boat) => setCart(prev => ({...prev, gcc: boat}))}
            />
          )}
          {platform === 'gcc' && (
            <AccommodationUpsell 
              location={cart.gcc.marina}
              date={cart.gcc.tripDate}
              onAdd={(property) => setCart(prev => ({...prev, wtv: property}))}
            />
          )}
        </div>
      )}
      
      {/* Package discount badge */}
      {packageDiscount > 0 && (
        <div className="package-discount-badge">
          🎉 Package Deal: Save {packageDiscount * 100}%!
        </div>
      )}
      
      {/* Cart summary */}
      <CartSummary 
        cart={cart}
        discount={packageDiscount}
        onCheckout={() => processUnifiedBooking(cart)}
      />
    </div>
  );
};
```

---

## 📱 Mobile App Integration

```javascript
// React Native app that works for both platforms
const VacationPlatformApp = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        {/* Vacation Rentals */}
        <Tab.Screen 
          name="Rentals" 
          component={WhereToVacationScreen}
          options={{
            tabBarIcon: '🏠',
            tabBarLabel: 'Places to Stay'
          }}
        />
        
        {/* Boat Experiences */}
        <Tab.Screen 
          name="Boats" 
          component={GulfCoastChartersScreen}
          options={{
            tabBarIcon: '⛵',
            tabBarLabel: 'Boat Activities'
          }}
        />
        
        {/* Packages */}
        <Tab.Screen 
          name="Packages" 
          component={PackageDealsScreen}
          options={{
            tabBarIcon: '🎁',
            tabBarLabel: 'Package Deals',
            tabBarBadge: '15% OFF'
          }}
        />
        
        {/* Profile (unified) */}
        <Tab.Screen 
          name="Profile" 
          component={UnifiedProfileScreen}
          options={{
            tabBarIcon: '👤',
            tabBarLabel: 'My Account'
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
```

---

## 🚀 Deployment Strategy

### Phase 1: Foundation (Month 1-2)
```
✅ Set up shared database
✅ Implement SSO
✅ Create shared API layer
✅ Build unified user profiles
```

### Phase 2: Basic Integration (Month 3-4)
```
✅ Enable cross-platform login
✅ Show boat listings on WTV
✅ Show accommodations on GCC
✅ Basic package bundling
```

### Phase 3: Advanced Features (Month 5-6)
```
✅ Unified loyalty program
✅ Package discount engine
✅ Cross-platform reviews
✅ Smart recommendations
```

### Phase 4: Optimization (Month 7-12)
```
✅ Mobile app launch
✅ Advanced personalization
✅ Predictive booking suggestions
✅ Multi-destination packages
```

---

## 📊 Success Metrics

```javascript
const integrationKPIs = {
  // Cross-platform engagement
  "cross_platform_users": {
    target: "30% of users active on both platforms",
    current: 0,
    tracking: "monthly"
  },
  
  // Package bookings
  "package_conversion": {
    target: "20% of bookings become packages",
    current: 0,
    tracking: "weekly"
  },
  
  // Average order value
  "aov_increase": {
    target: "+40% when booking package vs. single",
    current: 0,
    tracking: "daily"
  },
  
  // User lifetime value
  "ltv_increase": {
    target: "+60% for cross-platform users",
    current: 0,
    tracking: "monthly"
  }
};
```

---

## 🎯 Marketing Integration

### Joint Campaigns

```
"Gulf Coast Getaway Package"
→ 7-night beachfront rental from WTV
→ Fishing charter from GCC
→ Jet ski rental from GCC
→ Save 20% on total

"Weekend Warrior"
→ 2-night condo from WTV
→ Pontoon day rental from GCC
→ Save 10%

"Ultimate Family Vacation"
→ Beach house 7 nights from WTV
→ Fishing trip from GCC
→ 2x PWC rentals from GCC
→ Restaurant vouchers
→ Save 25%
```

---

## ✅ Implementation Checklist

### Technical Setup
- [ ] Set up shared PostgreSQL database
- [ ] Implement JWT-based SSO
- [ ] Create shared API gateway
- [ ] Build unified booking system
- [ ] Set up Stripe Connect for split payments
- [ ] Create cross-platform notification system

### Business Setup
- [ ] Define package deals and discounts
- [ ] Set up loyalty program rules
- [ ] Create partner agreements
- [ ] Design marketing materials
- [ ] Train customer support on both platforms

### Testing
- [ ] Test SSO across platforms
- [ ] Test package bookings end-to-end
- [ ] Verify payment splitting
- [ ] Test loyalty points accrual
- [ ] Load test unified API

---

**Your cross-platform integration is ready to build! 🚀**  
**This creates a powerful ecosystem that increases bookings and user lifetime value.**
