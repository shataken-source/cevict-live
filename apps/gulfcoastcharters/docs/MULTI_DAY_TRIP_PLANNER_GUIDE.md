# Multi-Day Fishing Trip Planner Guide

## Overview
The Multi-Day Trip Planner allows customers to book consecutive days with the same captain, add accommodations, plan fishing spots, create packing lists, invite companions, and share itineraries.

## Features Implemented

### 1. Database Schema
Created comprehensive tables for:
- `multi_day_trips` - Main trip details with share tokens
- `trip_accommodations` - Hotel/lodging information
- `trip_fishing_spots` - Planned fishing locations per day
- `trip_packing_lists` - Items to bring with pack status
- `trip_companions` - Invited friends with RSVP status
- `trip_itinerary_items` - Daily schedule and activities

### 2. Edge Function
**Function:** `multi-day-trip-manager`
- Creates trips with unique share tokens
- Sends email invitations to companions
- Manages accommodations, spots, and packing items
- Handles CRUD operations for all trip components

### 3. Frontend Components

#### Main Component
**`MultiDayTripPlanner.tsx`** - Wizard-style trip builder
- Step 1: Trip details and date selection
- Step 2: Tabbed interface for planning
- Save functionality with database integration

#### Sub-Components
**`MultiDayCalendar.tsx`** - Date range picker
- Select consecutive days
- Visual date range display
- Automatic day count calculation

**`AccommodationSelector.tsx`** - Hotel management
- Add multiple hotels with check-in/out dates
- Cost tracking per night
- Booking URL storage
- Notes for each accommodation

**`FishingSpotPlanner.tsx`** - Location planning
- Day-by-day spot organization
- Target species tracking
- GPS coordinates (optional)
- Notes for each location

**`PackingListManager.tsx`** - Gear checklist
- Categorized items (Fishing Gear, Clothing, etc.)
- Quantity tracking
- Check-off functionality
- Progress indicator

**`CompanionInviter.tsx`** - Trip sharing
- Email-based invitations
- RSVP status tracking (invited/accepted/declined)
- Remove companions
- Automatic email notifications

## Usage

### For Customers

1. **Access the Planner**
   - Navigate to `/plan-trip` or click "Plan Trip" in navigation
   - Must be logged in

2. **Create Trip**
   - Enter trip title and description
   - Select start and end dates on calendar
   - Confirm date range

3. **Plan Details**
   - **Fishing Spots Tab**: Add locations for each day
     - Name the spot
     - List target species
     - Add fishing notes
   
   - **Hotels Tab**: Add accommodations
     - Hotel name and address
     - Check-in/out dates
     - Cost per night
     - Booking URL
   
   - **Packing List Tab**: Create checklist
     - Add items by category
     - Set quantities
     - Check off as you pack
   
   - **Companions Tab**: Invite friends
     - Enter email addresses
     - Track RSVP status
     - Remove invitations

4. **Save Trip**
   - Click "Save Trip" to store in database
   - Invitations sent automatically
   - Share token generated for sharing

### For Companions

1. **Receive Invitation**
   - Email notification with trip details
   - Click link to view itinerary

2. **View Trip**
   - See all planned spots and accommodations
   - View packing list
   - RSVP to invitation

## Future Enhancements

### Weather Integration
Add weather forecasts for each day:
```typescript
// In trip planner, fetch weather for each day
const weatherData = await supabase.functions.invoke('weather-api', {
  body: { 
    location: tripLocation,
    dates: [startDate, endDate]
  }
});
```

### Tide Charts
Display tide information for fishing spots:
```typescript
// Fetch tide data from NOAA
const tideData = await supabase.functions.invoke('noaa-buoy-data', {
  body: {
    latitude: spot.latitude,
    longitude: spot.longitude,
    date: tripDate
  }
});
```

### Automated Reminders
Set up reminders leading up to trip:
```typescript
// Create reminder schedule
const reminders = [
  { days_before: 7, message: "Trip in 1 week! Check your packing list" },
  { days_before: 3, message: "Trip in 3 days! Confirm accommodations" },
  { days_before: 1, message: "Trip tomorrow! Weather forecast attached" }
];
```

### Shared Itinerary View
Create public page for companions:
```typescript
// Route: /trip/:shareToken
// Display read-only view of trip details
// Allow companions to add items to packing list
// Show weather and tide forecasts
```

### Captain Availability Check
Verify captain is available for all selected dates:
```typescript
// Check captain's blocked dates
const { data: blockedDates } = await supabase
  .from('captain_blocked_dates')
  .select('*')
  .eq('captain_id', captainId)
  .gte('date', startDate)
  .lte('date', endDate);
```

### Cost Calculator
Automatic trip cost calculation:
```typescript
const totalCost = 
  (dailyCharterRate * totalDays) +
  accommodations.reduce((sum, acc) => sum + acc.cost, 0) +
  additionalExpenses;
```

### Photo Album
Add trip photo sharing:
```typescript
// After trip, upload photos
// Tag companions in photos
// Create shareable album
```

## Database Queries

### Get User's Trips
```sql
SELECT * FROM multi_day_trips
WHERE user_id = auth.uid()
ORDER BY start_date DESC;
```

### Get Trip Details with All Components
```sql
SELECT 
  t.*,
  json_agg(DISTINCT a.*) as accommodations,
  json_agg(DISTINCT s.*) as spots,
  json_agg(DISTINCT p.*) as packing_items,
  json_agg(DISTINCT c.*) as companions
FROM multi_day_trips t
LEFT JOIN trip_accommodations a ON a.trip_id = t.id
LEFT JOIN trip_fishing_spots s ON s.trip_id = t.id
LEFT JOIN trip_packing_lists p ON p.trip_id = t.id
LEFT JOIN trip_companions c ON c.trip_id = t.id
WHERE t.id = $1
GROUP BY t.id;
```

### Update Packing Item Status
```sql
UPDATE trip_packing_lists
SET packed = true
WHERE id = $1;
```

## Email Templates

### Companion Invitation
```html
<h2>You're Invited to a Fishing Trip!</h2>
<p>{{inviter_name}} has invited you to join a {{total_days}}-day fishing adventure.</p>
<p><strong>Dates:</strong> {{start_date}} to {{end_date}}</p>
<p><strong>Location:</strong> {{location}}</p>
<a href="{{trip_url}}">View Trip Details & RSVP</a>
```

### Trip Reminder (7 days before)
```html
<h2>Your Trip is Coming Up!</h2>
<p>Your {{total_days}}-day fishing trip starts in 7 days on {{start_date}}.</p>
<h3>Packing List Progress: {{packed_percentage}}%</h3>
<p>{{unpacked_items}} items still need to be packed.</p>
<a href="{{trip_url}}">Review Trip Details</a>
```

## API Endpoints

### Create Trip
```typescript
POST /multi-day-trip-manager
Body: {
  action: 'create',
  tripData: {
    title: string,
    description: string,
    captain_id: string,
    start_date: Date,
    end_date: Date,
    total_days: number
  }
}
```

### Invite Companion
```typescript
POST /multi-day-trip-manager
Body: {
  action: 'invite',
  tripId: string,
  companionEmail: string
}
```

### Add Item (Accommodation/Spot/Packing)
```typescript
POST /multi-day-trip-manager
Body: {
  action: 'addItem',
  tripId: string,
  itemData: {
    table: 'trip_accommodations' | 'trip_fishing_spots' | 'trip_packing_lists',
    data: {...}
  }
}
```

## Testing

1. **Create a Test Trip**
   - Log in as a customer
   - Navigate to `/plan-trip`
   - Create trip with 3 days
   - Add 2 fishing spots
   - Add 1 hotel
   - Add 5 packing items
   - Invite 1 companion

2. **Verify Database**
   ```sql
   SELECT * FROM multi_day_trips WHERE user_id = auth.uid();
   SELECT * FROM trip_accommodations WHERE trip_id = 'your-trip-id';
   ```

3. **Test Email Invitations**
   - Ensure SendGrid API key is configured
   - Invite a companion
   - Check email delivery

## Troubleshooting

### Dates Not Saving
- Ensure dates are in ISO format
- Check timezone handling
- Verify date range validation

### Companions Not Receiving Emails
- Verify SendGrid API key in Supabase secrets
- Check email template formatting
- Review edge function logs

### Packing List Not Updating
- Check RLS policies allow updates
- Verify user authentication
- Review browser console for errors

## Next Steps

1. Add weather forecasts for each trip day
2. Implement tide chart integration
3. Create automated reminder system
4. Build public shared itinerary page
5. Add cost calculator
6. Integrate with captain availability
7. Add trip photo album feature
8. Create trip summary PDF export
