# Captain Weather Integration Guide

## Overview
Real-time marine weather data and alerts have been integrated into the Captain Mobile Dashboard with offline caching and push notifications.

## Features Implemented

### 1. CaptainWeatherDashboard Component
**Location:** `src/components/CaptainWeatherDashboard.tsx`

**Features:**
- Current marine conditions (temp, wind, waves, visibility, humidity)
- 24-hour forecast with hourly updates
- Safety level assessment (Safe/Caution/Dangerous)
- Offline caching of latest weather data
- Auto-refresh every 30 minutes when online
- Manual refresh button

**Usage:**
```tsx
<CaptainWeatherDashboard latitude={30.3935} longitude={-86.4958} />
```

### 2. WeatherAlertSystem Component
**Location:** `src/components/WeatherAlertSystem.tsx`

**Features:**
- Active weather alerts display
- Severity badges (Extreme/Severe/Moderate)
- Push notification support
- Affected bookings tracking
- Enable/disable notifications toggle

### 3. Mobile Dashboard Integration
The weather tab has been added to the Mobile Captain Dashboard with 6 tabs:
- **Bookings** - View and manage bookings
- **Weather** - Marine weather and alerts
- **Docs** - Offline document access
- **GPS** - Waypoint management
- **Emergency** - Emergency contacts
- **Feedback** - Suggestion box

## Offline Capabilities

### Weather Data Caching
Weather data is automatically cached in localStorage:
- Key: `cached_weather`
- Timestamp: `weather_timestamp`
- Auto-loads cached data when offline
- Displays "Cached data" indicator when offline

### Service Worker Integration
The PWA service worker caches:
- Weather component assets
- Icon files for offline display
- Last fetched weather data

## Push Notifications

### Notification Permission
Users must grant notification permission to receive weather alerts:
1. Click "Enable" button in WeatherAlertSystem
2. Browser prompts for permission
3. Once granted, severe weather alerts trigger notifications

### Notification Triggers
Notifications are sent for:
- **Severe** weather alerts
- **Extreme** weather alerts
- Alerts affecting scheduled bookings

### Notification Content
- Title: Alert event name
- Body: Alert description (truncated to 100 chars)
- Icon: App icon (`/icon-192.png`)
- Persistent: Requires user interaction to dismiss

## API Integration

### Supabase Edge Function
**Function:** `marine-weather`

**Endpoint:** `/functions/v1/marine-weather`

**Request:**
```json
{
  "latitude": 30.3935,
  "longitude": -86.4958
}
```

**Response:**
```json
{
  "current": {
    "temp": 75,
    "windSpeed": 12,
    "windDirection": 180,
    "waveHeight": 2,
    "visibility": 10,
    "humidity": 65,
    "conditions": "partly cloudy"
  },
  "forecast": [...],
  "alerts": [...],
  "timestamp": "2025-11-19T01:56:00Z"
}
```

### Data Sources
1. **OpenWeatherMap API** - Current conditions and forecast
2. **NOAA API** - Marine-specific data and alerts
3. **Weather.gov** - Official weather alerts

## Setup Instructions

### 1. Environment Variables
Add to `.env`:
```
OPENWEATHER_API_KEY=your_api_key_here
```

Get API key from: https://openweathermap.org/api

### 2. Deploy Edge Function
```bash
supabase functions deploy marine-weather
```

### 3. Enable Notifications in PWA
Update `public/sw.js` to handle notification clicks:
```javascript
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/captain/mobile-dashboard?tab=weather')
  );
});
```

## Safety Level Logic

### Safe (Green)
- Wind speed < 15 mph
- Wave height < 4 ft

### Caution (Yellow)
- Wind speed 15-25 mph
- Wave height 4-6 ft

### Dangerous (Red)
- Wind speed > 25 mph
- Wave height > 6 ft

## Testing

### Test Offline Mode
1. Open captain dashboard
2. Navigate to Weather tab
3. Turn off internet connection
4. Verify cached data displays
5. Turn on internet
6. Click refresh to update

### Test Notifications
1. Enable notifications in Weather Alert System
2. Simulate severe weather alert (via Supabase function)
3. Verify notification appears
4. Click notification to open dashboard

### Test Data Refresh
1. Check timestamp on weather card
2. Wait 30 minutes or click refresh
3. Verify timestamp updates
4. Check new forecast data

## Troubleshooting

### Weather Data Not Loading
- Check internet connection
- Verify API keys in environment
- Check browser console for errors
- Ensure Supabase function is deployed

### Notifications Not Working
- Check browser notification permission
- Verify HTTPS connection (required for notifications)
- Check if notifications are blocked in browser settings
- Test with `Notification.requestPermission()`

### Offline Mode Issues
- Clear localStorage and reload
- Check service worker registration
- Verify cache storage in DevTools
- Ensure PWA is installed

## Future Enhancements

1. **Tide Information** - Add tide charts and predictions
2. **Buoy Data** - Integrate NOAA buoy observations
3. **Radar Images** - Display weather radar overlay
4. **Historical Data** - Show past weather conditions
5. **Custom Alerts** - Let captains set custom thresholds
6. **Multi-Location** - Track weather for multiple ports
7. **Email Alerts** - Send weather updates via email
8. **SMS Alerts** - Text message severe weather warnings

## Related Files
- `src/components/CaptainWeatherDashboard.tsx`
- `src/components/WeatherAlertSystem.tsx`
- `src/components/MobileCaptainDashboard.tsx`
- `supabase/functions/marine-weather/index.ts`
- `public/manifest.json`
- `public/sw.js`
