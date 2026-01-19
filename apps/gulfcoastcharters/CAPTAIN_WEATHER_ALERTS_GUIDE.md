# Captain Weather Alert System - Visual Storm Warnings

## Overview
The Captain Weather Alert System provides real-time visual storm warnings on captain profiles and search results with severity-based color indicators.

## Features

### 1. Visual Storm Warning Badges
- **Yellow Badge**: Weather Watch or Moderate conditions
- **Orange Badge**: Weather Warning
- **Red Badge**: Severe or Extreme weather conditions
- Animated pulse effect for visibility
- Automatic updates every 5 minutes

### 2. Captain Profile Integration
- Prominent weather alert displayed at top of profile page
- Full alert details including:
  - Event type (hurricane, tropical storm, etc.)
  - Severity level
  - Affected date range
  - Start and end dates

### 3. Search Results Integration
- Compact weather badges on captain cards
- Quick visual identification of affected captains
- Maintains card layout and design

### 4. Filter by Weather Status
- `hideWeatherAffected` filter option in CharterGrid
- Allows customers to find captains not in storm path
- Integrated with existing filter system

## Component Usage

### CaptainWeatherBadge Component
```tsx
import CaptainWeatherBadge from '@/components/CaptainWeatherBadge';

// Compact mode (for cards)
<CaptainWeatherBadge 
  captainId="captain-123" 
  location="Destin, FL"
  compact={true}
/>

// Full mode (for profile pages)
<CaptainWeatherBadge 
  captainId="captain-123" 
  location="Destin, FL"
  compact={false}
/>
```

### Props
- `captainId` (required): Captain's unique identifier
- `location` (optional): Captain's location for weather lookup
- `compact` (boolean): Display mode - true for small badge, false for full alert

## Backend Integration

### Edge Function: captain-weather-alerts
**Endpoint**: `check_captain_weather`

**Request**:
```json
{
  "action": "check_captain_weather",
  "captain_id": "uuid",
  "location": "Destin, FL"
}
```

**Response**:
```json
{
  "alert": {
    "severity": "severe",
    "event": "Hurricane Warning",
    "start_date": "2024-11-20T00:00:00Z",
    "end_date": "2024-11-22T00:00:00Z"
  }
}
```

### Severity Levels
1. **Extreme/Severe**: Red badge, high priority
2. **Warning**: Orange badge, medium priority
3. **Watch/Moderate**: Yellow badge, low priority
4. **Advisory**: Blue badge, informational

## Automatic Updates
- Weather data refreshes every 5 minutes
- Uses React useEffect with cleanup
- Prevents memory leaks on component unmount
- Real-time severity indicator updates

## Customer Experience

### Finding Safe Captains
1. Navigate to search results
2. Weather badges automatically appear on affected captains
3. Use filter to show only captains not in storm path
4. View full weather details on captain profile

### Visual Indicators
- **Pulsing Badge**: Active weather alert
- **Color Coding**: Severity at a glance
- **Date Range**: Plan around weather windows
- **Alternative Captains**: Easy discovery of safe options

## Database Schema

### Weather Alerts Table
```sql
CREATE TABLE weather_alerts (
  id UUID PRIMARY KEY,
  captain_id UUID REFERENCES captains(id),
  severity TEXT,
  event TEXT,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Testing

### Manual Testing
1. Create test weather alert for captain
2. View captain profile - alert should appear at top
3. View captain in search results - compact badge visible
4. Toggle weather filter - captain should hide/show
5. Wait 5 minutes - alert should auto-refresh

### Test Data
```sql
INSERT INTO weather_alerts (captain_id, severity, event, start_date, end_date, location)
VALUES (
  'captain-uuid',
  'severe',
  'Hurricane Warning',
  NOW(),
  NOW() + INTERVAL '3 days',
  'Destin, FL'
);
```

## Best Practices

### For Captains
- Keep location information accurate
- Monitor weather dashboard regularly
- Update availability during severe weather
- Communicate with customers proactively

### For Customers
- Check weather badges before booking
- Use date range to plan trips
- Consider alternative captains during alerts
- Contact captain for weather-related questions

## Related Files
- `src/components/CaptainWeatherBadge.tsx` - Main component
- `src/components/CharterCard.tsx` - Search result integration
- `src/components/CaptainProfilePage.tsx` - Profile page integration
- `src/components/CharterGrid.tsx` - Filter integration
- `supabase/functions/captain-weather-alerts/index.ts` - Backend API

## Future Enhancements
- Push notifications for severe weather
- Historical weather impact on bookings
- Weather-based pricing adjustments
- Integration with NOAA real-time data
- Automatic booking rescheduling options
