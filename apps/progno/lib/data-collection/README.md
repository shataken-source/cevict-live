# 📡 Claude Effect Data Collection

## Configuration

All data feeds are configured through environment variables and the keys store.

### Required API Keys

Add these to your `.env` file or use the keys store:

```env
# Phase 1: Sentiment Field
TWITTER_BEARER_TOKEN=your_bearer_token
# OR
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret

NEWS_API_KEY=your_newsapi_key

# Phase 3: Information Asymmetry Index
ODDS_API_KEY=your_odds_api_key  # Already configured

# Phase 4: Chaos Sensitivity Index
OPENWEATHER_API_KEY=your_openweather_key
```

### Using Keys Store

You can also add keys via the keys store:

```typescript
import { addKey } from '../app/keys-store';

addKey('Twitter Bearer Token', 'your_token');
addKey('News API Key', 'your_key');
addKey('OpenWeather API Key', 'your_key');
```

---

## Phase 1: Sentiment Field

### Twitter/X Collection
- Uses Twitter API v2
- Collects tweets from players, coaches, beat reporters
- Searches by team name and hashtags

### News Collection
- Uses NewsAPI.org
- Falls back to RSS feeds if API not available
- Collects articles about teams

### Press Conferences
- Manual entry for Phase 1
- Will integrate transcript APIs in Phase 2

---

## Phase 2: Narrative Momentum

### Schedule Data
- Uses existing Odds API integration
- Detects rivalries, trap games, must-win scenarios

### Roster Data
- Uses existing roster data sources
- Tracks player movements, contract years

---

## Phase 3: Information Asymmetry Index

### Line Movement Tracking
- Tracks opening vs current lines
- Detects reverse line movement
- Identifies sharp money indicators

### Bet Splits
- Would integrate Action Network or VSiN
- Currently placeholder

---

## Phase 4: Chaos Sensitivity Index

### Weather Collection
- Uses OpenWeatherMap API
- Gets current weather and forecasts
- Tracks wind, precipitation, temperature

### Injury Collection
- Would scrape from official sources
- Detects cluster injuries (OL, DB, DL)

### Referee Data
- Uses internal database
- Tracks crew tendencies

---

## Usage

```typescript
import { DataCollectionManager, DataCollectionConfig } from './lib/data-collection/collectors';
import { loadDataFeedConfig } from './lib/data-collection/config';

const feedConfig = loadDataFeedConfig();

const config: DataCollectionConfig = {
  phase1: {
    enabled: feedConfig.twitter.enabled || feedConfig.news.enabled,
    sources: {
      twitter: feedConfig.twitter.enabled,
      instagram: feedConfig.instagram.enabled,
      news: feedConfig.news.enabled,
      pressConferences: feedConfig.pressConferences.enabled,
    },
    refreshInterval: 15, // minutes
  },
  phase2: {
    enabled: true,
    sources: {
      schedule: feedConfig.schedule.enabled,
      roster: feedConfig.roster.enabled,
      news: feedConfig.news.enabled,
      social: feedConfig.twitter.enabled,
    },
    refreshInterval: 60,
  },
  phase3: {
    enabled: feedConfig.oddsAPI.enabled,
    sources: {
      oddsApi: feedConfig.oddsAPI.enabled,
      lineMovement: feedConfig.oddsAPI.trackLineMovement,
      betSplits: feedConfig.betSplits.enabled,
    },
    refreshInterval: 5,
  },
  phase4: {
    enabled: feedConfig.weather.enabled || feedConfig.injuries.enabled,
    sources: {
      weather: feedConfig.weather.enabled,
      injuries: feedConfig.injuries.enabled,
      referee: feedConfig.referee.enabled,
      schedule: feedConfig.schedule.enabled,
    },
    refreshInterval: 30,
  },
};

const manager = new DataCollectionManager(config);
const results = await manager.collectAll();
```

---

## 🐘 ROLL TIDE!

Once API keys are configured, data collection will automatically enhance predictions with Claude Effect!

