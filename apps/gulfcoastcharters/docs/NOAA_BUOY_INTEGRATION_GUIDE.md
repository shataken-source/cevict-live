# NOAA Buoy Data Integration Guide

## Overview
Real-time NOAA buoy data integration for Gulf Coast charter bookings, providing actual wave heights, water temperature, and sea conditions from nearby buoys.

## Features Implemented

### 1. Real-Time Buoy Data
- **Live observations** from 10 Gulf Coast NOAA buoys
- Wave height, water temperature, wind speed/direction
- Atmospheric pressure, visibility, air temperature
- Updates every 5 minutes from NOAA servers

### 2. Buoy Locations Covered
- **42001** - Mid Gulf (Central Gulf of Mexico)
- **42002** - West Gulf (West Gulf of Mexico)
- **42003** - East Gulf (East Gulf of Mexico)
- **42012** - Orange Beach, AL
- **42019** - Freeport, TX
- **42020** - Corpus Christi, TX
- **42035** - Galveston, TX
- **42036** - West Tampa, FL
- **42039** - Pensacola, FL (Default)
- **42040** - Luke Offshore, LA

### 3. Interactive Buoy Map
- Visual display of all Gulf Coast buoy locations
- Click to select and view detailed buoy data
- GPS coordinates and location names
- Direct links to NOAA station pages

### 4. Marine Alerts Integration
- **Small Craft Advisories** from NOAA
- **Marine Weather Warnings**
- **Gale Warnings** for Gulf waters
- Real-time alert updates from weather.gov API

### 5. NOAA Links & Resources
- Direct links to NOAA marine forecasts
- Small Craft Advisory information
- Marine zone forecasts
- Historical buoy data access

## Components

### BuoyDataDisplay.tsx
Displays real-time data from selected buoy:
- Wave height in feet
- Water temperature in Fahrenheit
- Wind speed in knots
- Visibility in nautical miles
- Marine alerts and warnings

### BuoyMap.tsx
Interactive map showing all Gulf Coast buoys:
- Grid layout of buoy locations
- Click to select buoy
- GPS coordinates display
- Links to NOAA station pages

### ComprehensiveWeatherDisplay.tsx (Updated)
Now includes tabbed interface with:
- **Weather & Tides** - Standard weather forecast
- **NOAA Buoys** - Real-time buoy data
- **Marine Forecast** - Marine conditions

## Edge Function

### noaa-buoy-data
Fetches real-time data from NOAA National Data Buoy Center:
- Parses NOAA text data format
- Handles missing values (MM)
- Fetches marine alerts from weather.gov
- Returns structured JSON data

## Usage

### In Charter Details Page
```typescript
import ComprehensiveWeatherDisplay from '@/components/ComprehensiveWeatherDisplay';

<ComprehensiveWeatherDisplay
  latitude={charter.latitude}
  longitude={charter.longitude}
  location={charter.location}
/>
```

### Standalone Buoy Display
```typescript
import BuoyDataDisplay from '@/components/BuoyDataDisplay';

<BuoyDataDisplay buoyId="42039" />
```

## Data Sources

### NOAA National Data Buoy Center
- **URL**: https://www.ndbc.noaa.gov/
- **Data Format**: Real-time text files updated hourly
- **Coverage**: Gulf of Mexico and coastal waters

### NOAA Weather Service API
- **URL**: https://api.weather.gov/
- **Alerts**: Marine warnings and advisories
- **Format**: JSON GeoJSON format

## Safety Features

1. **Automatic Condition Monitoring**
   - Wave height thresholds
   - Wind speed warnings
   - Visibility alerts

2. **Marine Alert Display**
   - Small Craft Advisories highlighted
   - Gale warnings prominently displayed
   - Direct access to NOAA instructions

3. **Historical Context**
   - Compare current to typical conditions
   - Trend analysis for informed decisions

## Benefits for Charter Operations

1. **Captain Decision Making**
   - Real-time sea conditions before departure
   - Actual measurements vs forecasts
   - Multiple buoy comparison for route planning

2. **Customer Safety**
   - Transparent condition reporting
   - Automatic alerts for dangerous conditions
   - Informed booking decisions

3. **Operational Efficiency**
   - Reduce unnecessary cancellations
   - Optimize departure times
   - Better route planning with multiple buoy data

## Future Enhancements

- Historical trend charts (7-day, 30-day)
- Buoy data comparison tool
- Custom alert thresholds per captain
- Integration with booking modification system
- SMS alerts for rapid condition changes

## Testing

1. Visit any charter detail page
2. Navigate to "NOAA Buoys" tab
3. Select different buoys from the map
4. Verify real-time data displays
5. Check for active marine alerts

## Support

For issues with NOAA data:
- Check NOAA buoy status: https://www.ndbc.noaa.gov/
- Verify buoy is operational
- Review edge function logs in Supabase

## Links

- NOAA Buoy Center: https://www.ndbc.noaa.gov/
- Marine Forecasts: https://www.weather.gov/marine
- Small Craft Advisories: https://www.weather.gov/safety/marine-sca
