# WeatherAPI Weather Maps

## Overview
Weather Maps provide visual weather data overlays for the next 3 days in 1-hour intervals. **No API key required - free to use!**

## Map Types

### 1. Temperature Map (Tmp2m)
- **URL Pattern**: `https://weathermaps.weatherapi.com/tmp2m/tiles/{yyyyMMdd}/{HH}/{z}/{x}/{y}.png`
- **Demo**: https://weathermaps.weatherapi.com/tmp2m/tiles/map.html
- **Shows**: Temperature at 2 meters above ground level
- **Colors**: Blue (cold) → Green → Yellow → Red (hot)

### 2. Precipitation Map (Precip)
- **URL Pattern**: `https://weathermaps.weatherapi.com/precip/tiles/{yyyyMMdd}/{HH}/{z}/{x}/{y}.png`
- **Demo**: https://weathermaps.weatherapi.com/precip/tiles/map.html
- **Shows**: Rain/snow precipitation intensity
- **Colors**: Light green → Dark green → Blue → Purple (heaviest)

### 3. Pressure Map (Pressure)
- **URL Pattern**: `https://weathermaps.weatherapi.com/pressure/tiles/{yyyyMMdd}/{HH}/{z}/{x}/{y}.png`
- **Demo**: https://weathermaps.weatherapi.com/pressure/tiles/map.html
- **Shows**: Atmospheric pressure (isobars)
- **Colors**: Gradient showing high/low pressure systems

### 4. Wind Map (Wind)
- **URL Pattern**: `https://weathermaps.weatherapi.com/wind/tiles/{yyyyMMdd}/{HH}/{z}/{x}/{y}.png`
- **Demo**: https://weathermaps.weatherapi.com/wind/tiles/map.html
- **Shows**: Wind speed and direction
- **Colors**: Calm (light) → Moderate → Strong (dark/intense)

---

## Tile Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `{yyyyMMdd}` | UTC Date | `20260216` (Feb 16, 2026) |
| `{HH}` | UTC Hour (24hr format) | `14` (2 PM UTC) |
| `{z}` | Zoom Level (0-18) | `5` |
| `{x}` | X Tile Coordinate | `8` |
| `{y}` | Y Tile Coordinate | `12` |

---

## Example URLs

### Temperature Map - Current Hour
```
https://weathermaps.weatherapi.com/tmp2m/tiles/20260216/14/5/8/12.png
```

### Precipitation Map - 3 Hours Ahead
```
https://weathermaps.weatherapi.com/precip/tiles/20260216/17/6/16/24.png
```

### Pressure Map - Tomorrow Same Time
```
https://weathermaps.weatherapi.com/pressure/tiles/20260217/14/5/8/12.png
```

---

## React Component Implementation

### Basic Map Viewer
```tsx
import React, { useState, useEffect } from 'react';

interface WeatherMapProps {
  mapType: 'tmp2m' | 'precip' | 'pressure' | 'wind';
  lat: number;
  lng: number;
  zoom?: number;
}

const WeatherMap: React.FC<WeatherMapProps> = ({ 
  mapType = 'tmp2m', 
  lat = 39.7439, 
  lng = -105.0201, 
  zoom = 6 
}) => {
  const [tiles, setTiles] = useState<string[]>([]);
  const [currentHour, setCurrentHour] = useState(0);

  // Get UTC time formatted for API
  const getUTCTime = (hoursAhead: number = 0) => {
    const date = new Date();
    date.setUTCHours(date.getUTCHours() + hoursAhead);
    return {
      date: date.toISOString().slice(0, 10).replace(/-/g, ''),
      hour: String(date.getUTCHours()).padStart(2, '0')
    };
  };

  // Convert lat/lng to tile coordinates (simplified)
  const latLngToTile = (lat: number, lng: number, zoom: number) => {
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const latRad = lat * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
  };

  useEffect(() => {
    const { date, hour } = getUTCTime(currentHour);
    const center = latLngToTile(lat, lng, zoom);
    
    // Generate 3x3 tile grid around center
    const newTiles: string[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const url = `https://weathermaps.weatherapi.com/${mapType}/tiles/${date}/${hour}/${zoom}/${center.x + dx}/${center.y + dy}.png`;
        newTiles.push(url);
      }
    }
    setTiles(newTiles);
  }, [mapType, lat, lng, zoom, currentHour]);

  return (
    <div className="weather-map">
      <div className="controls">
        <select value={mapType} onChange={(e) => setMapType(e.target.value as any)}>
          <option value="tmp2m">Temperature</option>
          <option value="precip">Precipitation</option>
          <option value="pressure">Pressure</option>
          <option value="wind">Wind</option>
        </select>
        <input 
          type="range" 
          min="0" 
          max="72" 
          value={currentHour}
          onChange={(e) => setCurrentHour(Number(e.target.value))}
        />
        <span>+{currentHour}h</span>
      </div>
      <div className="tile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 256px)' }}>
        {tiles.map((url, i) => (
          <img key={i} src={url} alt={`Weather tile ${i}`} width="256" height="256" />
        ))}
      </div>
    </div>
  );
};

export default WeatherMap;
```

---

## Sports Venue Weather Map Examples

### Denver Broncos - Empower Field at Mile High
```
Temperature: https://weathermaps.weatherapi.com/tmp2m/tiles/{date}/{hour}/10/210/397.png
Precipitation: https://weathermaps.weatherapi.com/precip/tiles/{date}/{hour}/10/210/397.png
Wind: https://weathermaps.weatherapi.com/wind/tiles/{date}/{hour}/10/210/397.png
```
- **Lat/Lng**: 39.7439° N, 105.0201° W
- **Tile (z10)**: x=210, y=397

### New Orleans Saints - Caesars Superdome
```
Temperature: https://weathermaps.weatherapi.com/tmp2m/tiles/{date}/{hour}/10/241/407.png
Precipitation: https://weathermaps.weatherapi.com/precip/tiles/{date}/{hour}/10/241/407.png
Wind: https://weathermaps.weatherapi.com/wind/tiles/{date}/{hour}/10/241/407.png
```
- **Lat/Lng**: 29.9509° N, 90.0814° W
- **Tile (z10)**: x=241, y=407

---

## Map Legends

### Temperature (°F)
| Color | Range |
|-------|-------|
| Dark Blue | < 20°F |
| Light Blue | 20-32°F |
| Cyan | 32-50°F |
| Green | 50-70°F |
| Yellow | 70-85°F |
| Orange | 85-100°F |
| Red | > 100°F |

### Precipitation (inches/hour)
| Color | Intensity |
|-------|-----------|
| Light Green | < 0.1 in/hr |
| Green | 0.1-0.25 in/hr |
| Blue | 0.25-0.5 in/hr |
| Purple | > 0.5 in/hr |

### Wind (mph)
| Color | Speed |
|-------|-------|
| Light | < 10 mph |
| Moderate | 10-20 mph |
| Strong | 20-30 mph |
| Intense | > 30 mph |

### Pressure (mb)
| Color | Range |
|-------|-------|
| Red/Pink | Low Pressure (< 1000 mb) |
| Yellow/Green | Normal (1000-1020 mb) |
| Blue | High Pressure (> 1020 mb) |

---

## Integration with Sports API

Combine with `/sports.json` to show weather maps for game locations:

```typescript
const getVenueWeatherMap = (stadium: string, mapType: string = 'tmp2m') => {
  // First get sports data to find venue coordinates
  const sportsData = await fetch(
    `https://api.weatherapi.com/v1/sports.json?key=${API_KEY}&q=${stadium}`
  );
  
  // Then generate map tiles for that location
  // ...coordinate conversion logic...
  
  return {
    venue: stadium,
    mapType,
    tiles: generatedTileUrls,
    forecast: sportsData.football[0].weather
  };
};
```

---

## Usage Limits
- **No API key required**
- **Free for commercial and non-commercial use**
- **Rate limits**: Standard browser caching applies
- **3-day forecast** available (72 hours of hourly tiles)

---

## Demo Links
- **Temperature**: https://weathermaps.weatherapi.com/tmp2m/tiles/map.html
- **Precipitation**: https://weathermaps.weatherapi.com/precip/tiles/map.html
- **Pressure**: https://weathermaps.weatherapi.com/pressure/tiles/map.html
- **Wind**: https://weathermaps.weatherapi.com/wind/tiles/map.html
