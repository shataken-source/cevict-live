# Enhanced Vessel Management System
## Supporting All Watercraft: Charter Fishing + Inland Waterway Boats

---

## 🚤 Vessel Types Supported

### Charter Fishing (Original)
- Sport Fishing Boats
- Deep Sea Fishing
- Inshore Fishing
- Bay Boats
- Center Consoles

### Inland Waterway Boats (NEW)
- **PWC (Personal Watercraft)**
  - Jet Skis
  - Sea-Doos
  - WaveRunners
  
- **Pontoon Boats**
  - Party Pontoons
  - Fishing Pontoons
  - Luxury Pontoons
  
- **Ski Boats**
  - Wakeboard Boats
  - Water Ski Boats
  - Surf Boats
  
- **Other Recreation**
  - Deck Boats
  - Bowriders
  - Cruisers
  - Sailboats
  - Kayaks/Canoes
  - Paddle Boards (SUP)

---

## 📊 Database Schema Updates

### New Vessels Table

```sql
-- Enhanced vessels table supporting all watercraft types
CREATE TABLE vessels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Owner Information
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  captain_id UUID REFERENCES users(id), -- Can be different from owner
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  vessel_type VARCHAR(100) NOT NULL, -- See VESSEL_TYPES enum
  category VARCHAR(50) NOT NULL, -- 'charter_fishing', 'inland_waterway', 'recreation'
  
  -- Vessel Details
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  length_feet DECIMAL(5,2),
  capacity INTEGER, -- Max passengers
  
  -- Features & Amenities
  amenities JSONB DEFAULT '[]', -- ["bathroom", "kitchen", "sound_system", "cooler"]
  equipment JSONB DEFAULT '[]', -- ["fishing_rods", "life_jackets", "snorkel_gear"]
  
  -- Location & Availability
  home_marina VARCHAR(255),
  home_latitude DECIMAL(10, 8),
  home_longitude DECIMAL(11, 8),
  operating_area VARCHAR(255), -- "Gulf Coast, AL", "Lake Martin, AL"
  
  -- Pricing
  hourly_rate DECIMAL(10, 2),
  half_day_rate DECIMAL(10, 2), -- 4 hours
  full_day_rate DECIMAL(10, 2), -- 8 hours
  weekly_rate DECIMAL(10, 2),
  deposit_required DECIMAL(10, 2),
  
  -- Requirements
  requires_captain BOOLEAN DEFAULT false,
  requires_license BOOLEAN DEFAULT false,
  minimum_age INTEGER DEFAULT 18,
  
  -- Insurance & Safety
  insurance_verified BOOLEAN DEFAULT false,
  safety_inspection_date DATE,
  uscg_certified BOOLEAN DEFAULT false,
  
  -- Media
  photos TEXT[], -- Array of photo URLs
  videos TEXT[], -- Array of video URLs
  virtual_tour_url TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, maintenance, inactive
  verified BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Search optimization
  search_vector tsvector
);

-- Vessel types enum
CREATE TYPE vessel_type_enum AS ENUM (
  -- Charter Fishing
  'sport_fishing',
  'deep_sea_fishing',
  'inshore_fishing',
  'bay_boat',
  'center_console',
  
  -- PWC
  'jet_ski',
  'sea_doo',
  'waverunner',
  
  -- Pontoon
  'party_pontoon',
  'fishing_pontoon',
  'luxury_pontoon',
  
  -- Ski/Wake
  'wakeboard_boat',
  'ski_boat',
  'surf_boat',
  
  -- Other
  'deck_boat',
  'bowrider',
  'cruiser',
  'sailboat',
  'kayak',
  'canoe',
  'paddleboard',
  'yacht'
);

-- Indexes for performance
CREATE INDEX idx_vessels_owner ON vessels(owner_id);
CREATE INDEX idx_vessels_type ON vessels(vessel_type);
CREATE INDEX idx_vessels_category ON vessels(category);
CREATE INDEX idx_vessels_location ON vessels(home_latitude, home_longitude);
CREATE INDEX idx_vessels_status ON vessels(status, verified);
CREATE INDEX idx_vessels_search ON vessels USING GIN(search_vector);

-- Full-text search
CREATE FUNCTION vessels_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.vessel_type, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.make, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.model, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vessels_search_update
  BEFORE INSERT OR UPDATE ON vessels
  FOR EACH ROW EXECUTE FUNCTION vessels_search_trigger();
```

### Vessel Availability Schedule

```sql
CREATE TABLE vessel_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
  
  -- Recurring availability
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  start_time TIME,
  end_time TIME,
  
  -- Specific date overrides
  specific_date DATE,
  available BOOLEAN DEFAULT true,
  
  -- Seasonal
  season_start DATE,
  season_end DATE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vessel_availability ON vessel_availability(vessel_id, specific_date);
CREATE INDEX idx_vessel_availability_dow ON vessel_availability(vessel_id, day_of_week);
```

### Enhanced Bookings Table

```sql
-- Add columns to existing bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vessel_id UUID REFERENCES vessels(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(50) DEFAULT 'charter_fishing';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rental_duration_hours DECIMAL(5,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requires_captain BOOLEAN DEFAULT true;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS equipment_included JSONB DEFAULT '[]';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS add_ons JSONB DEFAULT '[]';

-- Booking types: 'charter_fishing', 'boat_rental', 'pwc_rental', 'guided_tour', 'party_cruise'
```

### Vessel Reviews

```sql
CREATE TABLE vessel_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  user_id UUID REFERENCES users(id),
  
  -- Ratings (1-5)
  overall_rating DECIMAL(2,1) CHECK (overall_rating >= 1 AND overall_rating <= 5),
  cleanliness_rating DECIMAL(2,1),
  accuracy_rating DECIMAL(2,1),
  communication_rating DECIMAL(2,1),
  value_rating DECIMAL(2,1),
  
  -- Review
  title VARCHAR(255),
  comment TEXT,
  
  -- Media
  photos TEXT[],
  
  -- Response
  owner_response TEXT,
  owner_response_date TIMESTAMP,
  
  -- Status
  verified_booking BOOLEAN DEFAULT false,
  flagged BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vessel_reviews ON vessel_reviews(vessel_id, overall_rating);
CREATE INDEX idx_vessel_reviews_user ON vessel_reviews(user_id);
```

---

## 🎨 Frontend Components

### VesselCard Component

```jsx
import React from 'react';
import { Star, MapPin, Users, Clock, Anchor } from 'lucide-react';

const VesselCard = ({ vessel }) => {
  const getVesselIcon = (type) => {
    const icons = {
      'sport_fishing': '🎣',
      'jet_ski': '🚤',
      'pontoon': '⛵',
      'wakeboard_boat': '🏄',
      'yacht': '🛥️',
      'kayak': '🛶',
      'paddleboard': '🏄‍♂️'
    };
    return icons[type] || '⚓';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      {/* Image Gallery */}
      <div className="relative h-64 bg-gradient-to-br from-blue-400 to-blue-600">
        {vessel.photos?.[0] ? (
          <img 
            src={vessel.photos[0]} 
            alt={vessel.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-8xl">
            {getVesselIcon(vessel.vessel_type)}
          </div>
        )}
        
        {/* Featured Badge */}
        {vessel.featured && (
          <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full font-semibold text-sm">
            ⭐ Featured
          </div>
        )}
        
        {/* Category Tag */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
          {vessel.category.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      <div className="p-6">
        {/* Title & Type */}
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-1">
            {vessel.name}
          </h3>
          <p className="text-gray-600">
            {vessel.make} {vessel.model} • {vessel.year}
          </p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {vessel.length_feet}'
            </div>
            <div className="text-xs text-gray-500">Length</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5 mr-1" />
              {vessel.capacity}
            </div>
            <div className="text-xs text-gray-500">Passengers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500 flex items-center justify-center">
              <Star className="w-5 h-5 mr-1 fill-current" />
              {vessel.averageRating || 'New'}
            </div>
            <div className="text-xs text-gray-500">
              {vessel.reviewCount || 0} reviews
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center text-gray-600 mb-4">
          <MapPin className="w-4 h-4 mr-2" />
          <span className="text-sm">{vessel.operating_area}</span>
        </div>

        {/* Amenities Preview */}
        {vessel.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {vessel.amenities.slice(0, 3).map((amenity, i) => (
              <span 
                key={i}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
              >
                {amenity}
              </span>
            ))}
            {vessel.amenities.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{vessel.amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Pricing */}
        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                ${vessel.hourly_rate}
                <span className="text-base font-normal text-gray-500">/hr</span>
              </div>
              {vessel.half_day_rate && (
                <div className="text-sm text-gray-600">
                  ${vessel.half_day_rate} half day • ${vessel.full_day_rate} full day
                </div>
              )}
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Book Now
            </button>
          </div>
        </div>

        {/* Requirements */}
        {(vessel.requires_captain || vessel.requires_license) && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2 text-xs">
              {vessel.requires_captain && (
                <span className="flex items-center text-gray-600">
                  <Anchor className="w-3 h-3 mr-1" />
                  Captain Included
                </span>
              )}
              {vessel.requires_license && (
                <span className="flex items-center text-gray-600">
                  <Clock className="w-3 h-3 mr-1" />
                  Boating License Required
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VesselCard;
```

### Vessel Search & Filter

```jsx
import React, { useState } from 'react';
import { Search, Filter, MapPin, Calendar } from 'lucide-react';

const VesselSearch = () => {
  const [filters, setFilters] = useState({
    category: 'all',
    vesselType: 'all',
    location: '',
    date: '',
    passengers: 1,
    priceRange: [0, 1000],
    amenities: []
  });

  const categories = [
    { id: 'all', name: 'All Watercraft', icon: '⚓' },
    { id: 'charter_fishing', name: 'Charter Fishing', icon: '🎣' },
    { id: 'inland_waterway', name: 'Inland Waterway', icon: '🚤' },
    { id: 'recreation', name: 'Recreation', icon: '🏄' }
  ];

  const vesselTypes = {
    charter_fishing: [
      { id: 'sport_fishing', name: 'Sport Fishing' },
      { id: 'deep_sea_fishing', name: 'Deep Sea' },
      { id: 'inshore_fishing', name: 'Inshore' },
      { id: 'bay_boat', name: 'Bay Boat' }
    ],
    inland_waterway: [
      { id: 'jet_ski', name: 'Jet Ski / PWC' },
      { id: 'pontoon', name: 'Pontoon Boat' },
      { id: 'wakeboard_boat', name: 'Wakeboard Boat' },
      { id: 'ski_boat', name: 'Ski Boat' }
    ],
    recreation: [
      { id: 'deck_boat', name: 'Deck Boat' },
      { id: 'cruiser', name: 'Cruiser' },
      { id: 'sailboat', name: 'Sailboat' },
      { id: 'kayak', name: 'Kayak/Canoe' },
      { id: 'paddleboard', name: 'Paddleboard' }
    ]
  };

  const amenities = [
    'Bathroom',
    'Kitchen',
    'Sound System',
    'Cooler',
    'Fishing Equipment',
    'Snorkel Gear',
    'Life Jackets',
    'Tubes/Floats',
    'GPS/Fish Finder',
    'Shade/Bimini Top'
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Quick Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by boat name, type, or location..."
            className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilters({...filters, category: cat.id})}
            className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-colors ${
              filters.category === cat.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="mr-2">{cat.icon}</span>
            {cat.name}
          </button>
        ))}
      </div>

      {/* Detailed Filters */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Vessel Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vessel Type
          </label>
          <select
            value={filters.vesselType}
            onChange={(e) => setFilters({...filters, vesselType: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            {filters.category !== 'all' && vesselTypes[filters.category]?.map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Location
          </label>
          <input
            type="text"
            placeholder="City, Marina, Lake..."
            value={filters.location}
            onChange={(e) => setFilters({...filters, location: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date
          </label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({...filters, date: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Passengers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Passengers
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={filters.passengers}
            onChange={(e) => setFilters({...filters, passengers: e.target.value})}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Amenities Filter */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Filter className="w-4 h-4 inline mr-1" />
          Amenities
        </label>
        <div className="flex flex-wrap gap-2">
          {amenities.map(amenity => (
            <button
              key={amenity}
              onClick={() => {
                const selected = filters.amenities.includes(amenity);
                setFilters({
                  ...filters,
                  amenities: selected
                    ? filters.amenities.filter(a => a !== amenity)
                    : [...filters.amenities, amenity]
                });
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.amenities.includes(amenity)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {amenity}
            </button>
          ))}
        </div>
      </div>

      {/* Search Button */}
      <div className="mt-6">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-semibold text-lg transition-colors">
          Search Vessels
        </button>
      </div>
    </div>
  );
};

export default VesselSearch;
```

---

## 🎯 Beneficial Features for Users & Captains

### For Users

1. **Instant Booking Confirmation**
```javascript
// Auto-confirm bookings for verified vessels
const instantBookingEnabled = vessel.verified && vessel.instant_booking;
```

2. **Save Favorites**
```sql
CREATE TABLE user_favorites (
  user_id UUID REFERENCES users(id),
  vessel_id UUID REFERENCES vessels(id),
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, vessel_id)
);
```

3. **Trip Insurance Option**
```javascript
const tripInsurance = {
  coverage: 'cancellation, weather, damage',
  cost: bookingTotal * 0.08,
  provider: 'Boat Insurance Co'
};
```

4. **Group Booking Discount**
```javascript
if (booking.passengers >= 6) {
  discount = 0.15; // 15% off for groups of 6+
}
```

### For Captains/Owners

1. **Calendar Sync**
```javascript
// Sync with Google Calendar, iCal
import { syncToGoogleCalendar } from './calendar-sync';

await syncToGoogleCalendar(vessel.id, availability);
```

2. **Automated Pricing**
```javascript
// Dynamic pricing based on demand
const dynamicPrice = basePric * (
  demandMultiplier * 
  seasonalMultiplier * 
  weatherMultiplier
);
```

3. **Fleet Management Dashboard**
```javascript
// Manage multiple vessels from one dashboard
const fleet = vessels.filter(v => v.owner_id === currentUser.id);
```

4. **Automated Reminders**
```javascript
// Send reminders to users 24hr before trip
// Send maintenance reminders to captains
```

---

## 📱 Mobile App Features

```javascript
// React Native features
const mobileFeatures = {
  offlineMode: true, // View bookings offline
  pushNotifications: true, // Booking confirmations
  gprsTracking: true, // Real-time location during trip
  digitalWaiver: true, // Sign waivers on phone
  mobilePayment: true, // Apple Pay, Google Pay
  instantMessaging: true // Chat with captain/renter
};
```

---

## 💡 Next Steps

1. **Deploy vessel management system**
2. **Create vessel listing forms**
3. **Build search & filter UI**
4. **Implement booking flow for each type**
5. **Add cross-platform integration** (see next file)

This system now supports ALL watercraft types while maintaining the charter fishing focus!
