# TV Guide - Schedules Direct Setup

## Overview
The TV Guide feature now supports real OTA (Over-The-Air) channel data via **Schedules Direct** API. This provides accurate, up-to-date channel listings for any US ZIP code.

## Setup Instructions

### 1. Sign Up for Schedules Direct

1. Visit: https://www.schedulesdirect.org/
2. Create an account ($25/year subscription)
3. Generate an API token from your account dashboard

### 2. Add API Key to Environment

Add the following to your `.env.local` file:

```env
SCHEDULES_DIRECT_API_KEY=your_api_token_here
```

### 3. Restart Development Server

```bash
npm run dev
```

## How It Works

### API Endpoint
- **Route**: `/api/tv-guide?zip=82190`
- **Method**: GET
- **Response**: JSON with channels array

### Data Flow
1. User enters ZIP code in TV Guide
2. Component calls `/api/tv-guide?zip={zip}`
3. API queries Schedules Direct for OTA lineups
4. Returns real channel data with program information
5. Component displays "Live Data" badge when real data is used

### Fallback Behavior
If no API key is configured or the API fails:
- Returns mock/sample data appropriate for the ZIP code region
- Shows "Sample Data" badge
- Still provides useful channel estimates based on regional patterns

## Features

### Real Data (with API key)
- ✅ Accurate channel listings by ZIP
- ✅ Current program titles
- ✅ Network affiliations (CBS, NBC, ABC, etc.)
- ✅ Signal strength estimates
- ✅ Station logos (when available)

### Sample Data (without API key)
- ✅ Region-appropriate channels
- ✅ Major networks included
- ✅ Realistic program titles
- ✅ Signal strength indicators

## API Response Format

```json
{
  "channels": [
    {
      "number": "2.1",
      "name": "KTVQ",
      "affiliate": "CBS",
      "type": "network",
      "signal": "good",
      "show": "Evening News 6:00 PM",
      "logo": "https://..."
    }
  ],
  "source": "schedules-direct",
  "count": 16
}
```

## Regional Channel Data

The API includes region-specific mock data for areas without real API access:

- **82190 (Yellowstone)**: Montana/Idaho channels (KTVQ, KULR, etc.)
- **25965 (West Virginia)**: Regional WV channels
- **90210 (Los Angeles)**: LA area channels
- **Other ZIPs**: Generic major networks

## Cost

- **Schedules Direct**: $25/year for unlimited API calls
- **Alternative**: Use sample data for free (less accurate)

## Troubleshooting

### "No channels found" error
- Check ZIP code is valid (5 digits)
- Verify API key is set correctly
- Check Schedules Direct subscription is active

### "Sample Data" showing instead of "Live Data"
- API key not configured in `.env.local`
- Server needs restart after adding key
- Schedules Direct API may be down

### Slow loading
- Schedules Direct API can be slow (~2-3 seconds)
- Loading spinner shows during fetch

## Future Enhancements

- Cache channel data for 24 hours
- Add program schedules (time-based)
- Channel logos from API
- Favorite channels feature
- Signal strength based on tower distance
