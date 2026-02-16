# WeatherAPI Sports API Data

## API Endpoint
```
http://api.weatherapi.com/v1/sports.json?key=YOUR_API_KEY&q={location}
```

## Query Parameters
- `key` (required): Your API key
- `q` (required): Location query - can be city name, coordinates, stadium name, etc.

## Response Structure

### Root Object
```json
{
  "cricket": [...],
  "football": [...],
  "golf": [...]
}
```

## Sports Events Data

### Football (Soccer/American Football)
Each event contains:
- `stadium`: Venue name
- `country`: Country code
- `region`: State/Region
- `tournament`: League/Tournament name
- `match`: Teams playing (e.g., "Team A vs Team B")
- `start`: ISO 8601 start time
- `weather`: Current weather conditions at venue

### Weather Data per Event
- `temp_c`: Temperature in Celsius
- `temp_f`: Temperature in Fahrenheit
- `wind_mph`: Wind speed in mph
- `wind_kph`: Wind speed in km/h
- `wind_degree`: Wind direction in degrees
- `wind_dir`: Wind direction text (N, NE, E, etc.)
- `humidity`: Humidity percentage
- `cloud`: Cloud cover percentage
- `feelslike_c`: Feels like temperature (Celsius)
- `feelslike_f`: Feels like temperature (Fahrenheit)
- `condition`: Weather condition object
  - `text`: Condition text (e.g., "Partly cloudy", "Sunny")
  - `icon`: Icon URL
  - `code`: Condition code

---

## Denver - Empower Field at Mile High

### Stadium Info
- **Name**: Empower Field at Mile High
- **Location**: Denver, Colorado
- **Elevation**: 5,280 feet (1 mile above sea level)
- **Coordinates**: 39.7439° N, 105.0201° W
- **Teams**: Denver Broncos (NFL), Colorado Rapids (MLS)
- **Capacity**: 76,125

### Sample API Query
```
http://api.weatherapi.com/v1/sports.json?key=YOUR_KEY&q=Denver
```

### Sample Response for Denver
```json
{
  "football": [
    {
      "stadium": "Empower Field at Mile High",
      "country": "USA",
      "region": "Colorado",
      "tournament": "NFL",
      "match": "Denver Broncos vs Kansas City Chiefs",
      "start": "2026-02-16T18:00:00-07:00",
      "weather": {
        "temp_c": 7,
        "temp_f": 45,
        "wind_mph": 8,
        "wind_kph": 13,
        "wind_degree": 270,
        "wind_dir": "W",
        "humidity": 35,
        "cloud": 25,
        "feelslike_c": 5,
        "feelslike_f": 41,
        "condition": {
          "text": "Partly cloudy",
          "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png",
          "code": 1003
        }
      }
    }
  ]
}
```

### Weather Impact at Mile High
- **High altitude effects**: Thinner air affects ball trajectory (NFL balls travel ~10% farther)
- **Temperature swings**: Can drop 20-30°F from day to night
- **Wind**: Prevailing winds from west/southwest can affect kicking game
- **Winter games**: Potential for snow, cold conditions late season
- **UV exposure**: Higher due to elevation

---

## New Orleans - Caesars Superdome

### Stadium Info
- **Name**: Caesars Superdome
- **Location**: New Orleans, Louisiana
- **Coordinates**: 29.9509° N, 90.0814° W
- **Teams**: New Orleans Saints (NFL)
- **Capacity**: 73,208
- **Type**: Indoor domed stadium (climate controlled)

### Sample API Query
```
http://api.weatherapi.com/v1/sports.json?key=YOUR_KEY&q=New%20Orleans
```

### Sample Response for New Orleans
```json
{
  "football": [
    {
      "stadium": "Caesars Superdome",
      "country": "USA",
      "region": "Louisiana",
      "tournament": "NFL",
      "match": "New Orleans Saints vs Atlanta Falcons",
      "start": "2026-02-16T12:00:00-06:00",
      "weather": {
        "temp_c": 18,
        "temp_f": 64,
        "wind_mph": 6,
        "wind_kph": 10,
        "wind_degree": 135,
        "wind_dir": "SE",
        "humidity": 78,
        "cloud": 40,
        "feelslike_c": 18,
        "feelslike_f": 64,
        "condition": {
          "text": "Partly cloudy",
          "icon": "//cdn.weatherapi.com/weather/64x64/day/116.png",
          "code": 1003
        }
      }
    }
  ]
}
```

### Weather Impact at Caesars Superdome
- **Indoor venue**: Weather has minimal impact on game conditions inside dome
- **External conditions**: Important for fan comfort, tailgating, travel to/from stadium
- **Hurricane season**: Games may be rescheduled/dome used as shelter (Aug-Oct)
- **High humidity**: Affects outdoor pre-game activities
- **Heat index**: Summer games can be oppressive outdoors even if dome is cool

---

## Additional Sports Returned

### Cricket
```json
{
  "cricket": [
    {
      "stadium": "Lord's Cricket Ground",
      "country": "United Kingdom",
      "region": "London",
      "tournament": "Test Match",
      "match": "England vs Australia",
      "start": "2026-02-16T11:00:00+00:00",
      "weather": {
        "temp_c": 12,
        "temp_f": 54,
        "wind_mph": 15,
        "humidity": 65,
        "condition": {
          "text": "Overcast",
          "icon": "//cdn.weatherapi.com/weather/64x64/day/122.png",
          "code": 1009
        }
      }
    }
  ]
}
```

### Golf
```json
{
  "golf": [
    {
      "stadium": "Augusta National Golf Club",
      "country": "USA",
      "region": "Georgia",
      "tournament": "The Masters",
      "match": "Round 1",
      "start": "2026-04-09T08:00:00-04:00",
      "weather": {
        "temp_c": 22,
        "temp_f": 72,
        "wind_mph": 5,
        "humidity": 45,
        "condition": {
          "text": "Sunny",
          "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png",
          "code": 1000
        }
      }
    }
  ]
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 1000 | API key not provided |
| 1002 | API key invalid |
| 1003 | Parameter 'q' not provided |
| 1006 | No matching location found |
| 1007 | API key has exceeded calls per month quota |
| 1008 | API key has been disabled |
| 1009 | Internal application error |

---

## Implementation Notes

### React Hook Example
```typescript
const useVenueWeather = (venue: string) => {
  const [weather, setWeather] = useState(null);
  
  useEffect(() => {
    fetch(`https://api.weatherapi.com/v1/sports.json?key=${API_KEY}&q=${venue}`)
      .then(res => res.json())
      .then(data => setWeather(data));
  }, [venue]);
  
  return weather;
};
```

### Key Venues to Track
- Denver: Empower Field at Mile High
- New Orleans: Caesars Superdome
- Green Bay: Lambeau Field (cold weather games)
- Miami: Hard Rock Stadium (heat/humidity)
- Seattle: Lumen Field (rain/wind)
- Arizona: State Farm Stadium (retractable roof)

### Weather Impact Metrics
- **Temperature**: Affects player fatigue, hydration needs
- **Wind**: Impacts passing/kicking games
- **Humidity**: Affects heat index, player comfort
- **Precipitation**: Field conditions, ball handling
- **Elevation**: Ball trajectory, player breathing
