# Useful Public APIs for Progno

Based on the public-apis repository (https://github.com/public-apis/public-apis), here are APIs that could benefit the PROGNO prediction system:

## Weather APIs (Free Tier Available)

### 1. OpenWeatherMap
- **URL**: https://openweathermap.org/api
- **Use Case**: Get current weather and 5-day forecasts for game locations
- **Free Tier**: 1,000 calls/day
- **Best For**: Temperature, wind, precipitation data
- **Integration**: Weather impact on NFL/MLB games

### 2. WeatherAPI
- **URL**: https://www.weatherapi.com/
- **Use Case**: Historical weather data, alerts, sports weather
- **Free Tier**: 1 million calls/month
- **Best For**: Hourly forecasts, sports-specific weather
- **Integration**: Pre-game weather analysis

### 3. Visual Crossing Weather
- **URL**: https://www.visualcrossing.com/weather-api
- **Use Case**: Historical weather data back to 1970
- **Free Tier**: 1,000 records/day
- **Best For**: Analyzing past game conditions vs results
- **Integration**: Model training for weather impact

## Sports Data APIs

### 4. API-Football (via API-Sports)
- **URL**: https://www.api-football.com/
- **Use Case**: Live scores, statistics, lineups
- **Pricing**: Free tier available
- **Best For**: Soccer predictions, could expand PROGNO
- **Integration**: New sport addition

### 5. TheSportsDB
- **URL**: https://www.thesportsdb.com/api.php
- **Use Case**: Free sports data including events, results, teams
- **Free Tier**: Yes, with limits
- **Best For**: Team schedules, basic stats
- **Integration**: Schedule validation

### 6. ESPN API (Unofficial)
- **URL**: https://site.api.espn.com/apis/v2/scoreboard
- **Use Case**: Live scores, odds, news
- **Free Tier**: Yes
- **Best For**: Real-time game updates
- **Integration**: Already using, can expand

### 7. Balldontlie (NBA)
- **URL**: https://www.balldontlie.io/
- **Use Case**: NBA stats, games, players
- **Free Tier**: Yes
- **Best For**: NBA-specific predictions
- **Integration**: Enhanced NBA analytics

## Betting/Odds APIs

### 8. The Odds API (Already Integrated)
- **URL**: https://the-odds-api.com/
- **Use Case**: Real-time odds from multiple sportsbooks
- **Best For**: Odds comparison, line movement
- **Integration**: Already in use

### 9. Bet365 API (Requires approval)
- **URL**: https://developer.bet365.com/
- **Use Case**: Live odds, in-play data
- **Best For**: Real-time odds for live betting
- **Integration**: Live betting module

## Injury/News APIs

### 10. NewsAPI
- **URL**: https://newsapi.org/
- **Use Case**: Sports news, injury reports
- **Free Tier**: 100 requests/day
- **Best For**: Breaking injury news
- **Integration**: Auto-adjust predictions on injuries

### 11. Twitter/X API v2
- **URL**: https://developer.twitter.com/en/docs/twitter-api
- **Use Case**: Injury reports, lineup confirmations
- **Free Tier**: 1,500 tweets/month
- **Best For**: Real-time updates from beat reporters
- **Integration**: Injury alerts

## Analytics/ML APIs

### 12. RapidAPI Sports Suite
- **URL**: https://rapidapi.com/category/Sports
- **Use Case**: Various sports APIs in one place
- **Pricing**: Freemium
- **Best For**: Quick experimentation with new data sources
- **Integration**: Rapid prototyping

### 13. SportsRadar
- **URL**: https://developer.sportradar.com/
- **Use Case**: Premium sports data, real-time feeds
- **Pricing**: Paid (trial available)
- **Best For**: Professional-grade data
- **Integration**: High-accuracy models

## Location/Stadium APIs

### 14. GeoNames
- **URL**: http://www.geonames.org/export/web-services.html
- **Use Case**: Geographic data, timezone info
- **Free Tier**: Yes
- **Best For**: Travel distance calculations
- **Integration**: Travel fatigue analysis

### 15. Google Maps API
- **URL**: https://developers.google.com/maps
- **Use Case**: Distance between cities, travel time
- **Free Tier**: $200 credit/month
- **Best For**: Calculating travel impact on performance
- **Integration**: Road trip fatigue factors

## Recommendation Priority

### High Priority (Implement First):
1. **OpenWeatherMap** - Essential for weather analysis
2. **Balldontlie** - Better NBA data than current source
3. **NewsAPI** - Injury news automation

### Medium Priority:
4. **Visual Crossing** - Historical weather for model training
5. **Twitter API** - Real-time injury updates
6. **SportsRadar** - Premium data (when ready to scale)

### Low Priority:
7. **API-Football** - If expanding to soccer
8. **GeoNames** - Nice to have for travel analysis

## Implementation Notes

- All APIs should have fallback mechanisms
- Cache weather data for 1 hour (doesn't change rapidly)
- Cache odds data for 5 minutes (changes frequently)
- Implement rate limit tracking to avoid hitting caps
- Use ScrapingBee as fallback when APIs fail
