# Multi-Day Fishing Trip Planner Guide

## Overview
The Multi-Day Trip Planner allows customers to book consecutive days with the same captain, add accommodations, plan fishing spots, create packing lists, invite companions, and share itineraries.

## Features Implemented

### 1. Database Schema
Migration `20240124_multi_day_trips.sql`:
- `multi_day_trips` - Main trip (user_id, title, start_date, end_date, description, share_token)
- `trip_accommodations` - Hotel/lodging (trip_id, name, address, check_in/out, cost, booking_url)
- `trip_fishing_spots` - Per-day spots (trip_id, day_number, name, lat/lng, target_species, notes)
- `trip_packing_lists` - Items (trip_id, category, item_name, quantity, is_packed)
- `trip_companions` - Invited (trip_id, email, name, status)
- `trip_itinerary_items` - Daily schedule (trip_id, day_number, time, activity, location, notes)

### 2. Edge Function
**Function:** `multi-day-trip-manager`
- **create**: Auth required. Inserts trip then accommodations, spots, packing items, companions from body. Returns `{ tripId, shareToken }`.

### 3. Frontend
- **Route:** `/plan-trip` → `MultiDayTripPlanner`
- **Components:** MultiDayCalendar, AccommodationSelector, FishingSpotPlanner, PackingListManager, CompanionInviter, TripWeatherForecast, HourlyWeatherDisplay, WeatherAlertNotifier
- **Save:** Sends `action: 'create'`, `tripData`, `accommodations`, `spots`, `packingItems`, `companions` to the edge function.

## Usage

### For Customers
1. Go to `/plan-trip` (logged in).
2. Step 1: Title, description, then pick date range on calendar.
3. Step 2: Use tabs to add fishing spots, hotels, packing list, companions (and view weather).
4. Click **Save Trip** to persist trip and all sub-items.

### For Companions
- Invitation email and shared itinerary view (`/trip/:shareToken`) are not implemented in-app; share token is returned on create for future use.

## Future Enhancements (not implemented)
- Weather/tide in planner, automated reminders, public `/trip/:shareToken` page, captain availability check, cost calculator, photo album, companion email send from edge function.

## API

### Create Trip
```typescript
POST multi-day-trip-manager
Body: {
  action: 'create',
  tripData: { title, description, start_date, end_date, total_days, captain_id?, latitude?, longitude? },
  accommodations?: [...],
  spots?: [{ day_number, spot_name, latitude?, longitude?, target_species?, notes? }],
  packingItems?: [{ category, item_name, quantity, packed? }],
  companions?: [{ email, name?, status? }]
}
Response: { tripId, shareToken, success: true }
```

## Troubleshooting
- **Dates not saving:** Send ISO date strings or Date objects; function normalizes to YYYY-MM-DD.
- **Companion emails:** Not sent by this function; add Resend/SendGrid in function or separate job if needed.
- **Packing list:** UI uses `packed`; table column is `is_packed` (function maps).

---

## Implementation status (no-BS)

**Tables:** `20240124_multi_day_trips.sql` – all six tables and RLS exist.

**Edge function:** `multi-day-trip-manager` – single action `create`. Gets user from Bearer token; inserts `multi_day_trips` (share_token generated); then bulk-inserts `trip_accommodations`, `trip_fishing_spots`, `trip_packing_lists`, `trip_companions` from body. No invite email sent; no `invite` or `addItem` actions yet.

**UI:** `MultiDayTripPlanner` at `/plan-trip` sends `tripData`, `accommodations`, `spots`, `packingItems`, `companions` on Save so one create persists the full trip. Loading an existing trip (e.g. list my trips, edit trip) is not implemented; only create is wired.

**Not implemented:** Companion invitation emails, public shared itinerary route, weather/tide/reminders in backend, captain availability, cost calc, photo album. Add as needed.
