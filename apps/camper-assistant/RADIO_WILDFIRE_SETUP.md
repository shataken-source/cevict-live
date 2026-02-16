# Radio & Wildfire Monitoring - API Setup Guide

## Overview
The WildReady app now includes real-time radio station discovery and wildfire monitoring for camping safety.

## APIs Implemented

### 1. Radio Browser API (Free)
- **Cost**: Completely free
- **Coverage**: 30,000+ stations worldwide
- **Endpoint**: `/api/radio?zip={zipcode}`
- **Source**: https://www.radio-browser.info/

### 2. NASA FIRMS Wildfire API (Free with key)
- **Cost**: Free (requires API key)
- **Coverage**: Global satellite fire detection
- **Endpoint**: `/api/wildfire?lat={lat}&lon={lon}&radius=100`
- **Source**: https://firms.modaps.eosdis.nasa.gov/

### 3. NWS Weather Alerts API (Free)
- **Cost**: Free, no key required
- **Coverage**: US weather alerts including fire weather
- **Endpoint**: `/api/weather-alerts?lat={lat}&lon={lon}`
- **Source**: https://api.weather.gov/

---

## Setup Instructions

### Radio Stations (No Setup Required)
The Radio Browser API works immediately - no API key needed!

**Features:**
- Searches by state derived from ZIP code
- Returns real streaming radio stations
- Shows genre, location, and stream quality
- Includes popular stations (sorted by votes)

### Wildfire Monitoring (Optional Setup)

#### Step 1: Get NASA FIRMS API Key (Optional but Recommended)

1. Visit: https://firms.modaps.eosdis.nasa.gov/api/
2. Click "Get a MAP Key"
3. Fill out the form (takes ~24 hours for approval)
4. Once approved, you'll receive an email with your API key

#### Step 2: Add API Key to Environment

Add to `.env.local`:
```env
NASA_FIRMS_API_KEY=your_nasa_api_key_here
```

#### Step 3: Restart Server

```bash
npm run dev
```

**Without API key**: Uses realistic mock fire data for demonstration

---

## API Response Formats

### Radio Stations API
```json
{
  "stations": [
    {
      "id": "uuid",
      "name": "K Yellowstone Radio",
      "genre": "Public Radio",
      "location": "Wyoming, US",
      "url": "https://stream.url/...",
      "logo": "https://logo.url/...",
      "bitrate": 128,
      "isPopular": true
    }
  ],
  "source": "radio-browser",
  "count": 12
}
```

### Wildfire API
```json
{
  "fires": [
    {
      "id": "fire-0",
      "lat": 44.5,
      "lon": -110.2,
      "distance": 45,
      "direction": "NW",
      "intensity": "moderate",
      "threat": "high",
      "confidence": "nominal",
      "detected": "2024-02-16 14:30"
    }
  ],
  "count": 5,
  "source": "nasa-firms",
  "updated": "2024-02-16T20:50:00Z"
}
```

### Weather Alerts API
```json
{
  "alerts": [
    {
      "id": "NWS-1",
      "title": "Red Flag Warning",
      "headline": "Red Flag Warning issued for dry conditions",
      "description": "Critical fire weather conditions...",
      "severity": "severe",
      "isFireRelated": true,
      "category": "fire",
      "area": "Yellowstone, WY/MT",
      "expires": "2024-02-17T08:00:00Z"
    }
  ],
  "count": 2,
  "fireAlerts": 1,
  "weatherAlerts": 1,
  "updated": "2024-02-16T20:50:00Z"
}
```

---

## UI Components

### 1. Local Radio Stations Card
- Shows real radio stations from Radio Browser API
- Displays genre badges (News, Country, Rock, etc.)
- Shows location and stream quality
- "Popular" badge for highly-voted stations

### 2. Active Wildfire Monitor
- Pulsing orange indicator when monitoring
- Lists active fires within 100km radius
- Color-coded threat levels:
  - 🔴 **Critical**: < 50km with high confidence
  - 🟠 **High**: < 100km or < 50km nominal
  - 🟡 **Moderate**: < 200km
  - ⚪ **Low**: > 200km
- Shows direction, distance, intensity
- Summary of high-priority fires

### 3. Weather Alerts Card
- NWS weather alerts including fire weather
- Fire-related alerts highlighted with 🔥 icon
- Severity badges (critical, severe, moderate, minor)
- Shows affected area and expiration time

---

## Regional Data

### ZIP Code Mappings
The app includes coordinate mappings for common camping areas:

| ZIP Prefix | Location | Coordinates |
|------------|----------|-------------|
| 821 | Yellowstone, WY | 44.5, -110.0 |
| 259 | West Virginia | 38.5, -80.5 |
| 902 | Los Angeles, CA | 34.0, -118.2 |
| 377 | Smoky Mountains, TN | 35.7, -83.5 |

---

## Safety Features

### Fire Weather Alerts
- Red Flag Warnings
- Fire Weather Watches
- Burn Ban notifications
- Air Quality alerts from smoke

### Wildfire Distance Tracking
- Shows nearest fires with distance
- Direction indicator (N, NE, E, SE, S, SW, W, NW)
- Confidence level from satellite detection
- Last detection timestamp

### Emergency Preparedness
- NOAA Weather Radio reminder
- Evacuation readiness prompts
- "Stay informed" messaging

---

## Cost Summary

| Feature | API | Cost |
|---------|-----|------|
| Radio Stations | Radio Browser | **FREE** |
| Wildfire Data | NASA FIRMS | **FREE** (key required) |
| Weather Alerts | NWS | **FREE** |
| TV Guide | Schedules Direct | $25/year |

**Total**: $25/year for full real-time data (TV Guide only)

---

## Troubleshooting

### No radio stations showing
- Check ZIP code is valid (5 digits)
- Verify internet connection
- Some remote areas have fewer stations (expected)

### Wildfire data showing as "mock"
- NASA FIRMS API key not configured
- Add key to `.env.local` and restart
- Or continue using realistic sample data

### Weather alerts not loading
- NWS API requires valid US coordinates
- Some areas may have no active alerts (good news!)
- Check browser console for errors

### All APIs slow
- Radio Browser: ~1-2 seconds (normal)
- NASA FIRMS: ~2-3 seconds (normal)
- NWS: ~1 second (normal)
- Loading spinners indicate activity

---

## Future Enhancements

- 🔊 **Stream radio directly** in the app
- 🗺️ **Interactive fire map** with GIS visualization
- 📱 **Push notifications** for new fire alerts
- 🎙️ **NOAA Weather Radio streaming**
- 📍 **GPS-based auto-location** (no ZIP needed)
- 🔥 **Active fire perimeter maps** from NIFC

---

## API Limits

- **Radio Browser**: No known limits (be respectful)
- **NASA FIRMS**: 1000 requests/day (more than enough)
- **NWS Weather**: No limits, but cache for 5 minutes

---

## Support

For issues with:
- **Radio Browser**: https://www.radio-browser.info/
- **NASA FIRMS**: https://earthdata.nasa.gov/
- **NWS**: https://www.weather.gov/documentation/services-web-api

---

## Testing

Test ZIP codes for different regions:
- **82190** - Yellowstone (WY/MT)
- **25965** - West Virginia
- **90210** - Los Angeles (high fire risk)
- **37738** - Great Smoky Mountains
- **80424** - Breckenridge, CO

---

## Security Notes

- API keys stored in `.env.local` (never committed)
- All API calls server-side (keys not exposed to client)
- User location data not stored
- CORS-compliant API routes
