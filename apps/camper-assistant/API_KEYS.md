# Camper Assistant API Keys Required

## 🌤️ WEATHER APIS (Free - No Key Needed)

### Open-Meteo (PRIMARY - FREE)
- **URL**: https://open-meteo.com/
- **Cost**: FREE - No API key required
- **Rate Limit**: Unlimited for non-commercial use
- **Features**: 
  - Global weather forecast (7 days)
  - Hourly data
  - Temperature, precipitation, wind, humidity
  - UV index
  - Camping-friendly (no signup!)
- **Get Key**: None needed - just use it!

---

## 🌤️ WEATHER APIS (API Key Required)

### 1. OpenWeatherMap (Popular)
- **URL**: https://openweathermap.org/api
- **Cost**: Free tier: 1,000 calls/day
- **Features**: Current weather, 5-day forecast, air pollution, UV index
- **Get Key**: 
  1. Go to https://home.openweathermap.org/users/sign_up
  2. Sign up (free)
  3. Go to "My API Keys"
  4. Copy your key
- **Add to**: `.env.local` as `OPENWEATHER_API_KEY`

### 2. OpenUV (UV Index - Essential for campers!)
- **URL**: https://www.openuv.io
- **Cost**: Free tier: 50 requests/day
- **Features**: Real-time UV index, safe exposure times, sun protection advice
- **Get Key**:
  1. Go to https://www.openuv.io
  2. Sign up
  3. Go to Dashboard
  4. Get API key
- **Add to**: `.env.local` as `OPENUV_API_KEY`

### 3. Storm Glass (Marine Weather)
- **URL**: https://stormglass.io/
- **Cost**: Free tier: 10 requests/day
- **Features**: Marine weather for boaters, tide data, wave height
- **Get Key**:
  1. Go to https://stormglass.io/
  2. Sign up
  3. Get API key from dashboard
- **Add to**: `.env.local` as `STORMGLASS_API_KEY`

### 4. AQICN (Air Quality)
- **URL**: https://aqicn.org/api/
- **Cost**: Free tier available
- **Features**: Air quality index, pollen, pollution data
- **Get Key**:
  1. Go to https://aqicn.org/api/
  2. Request token
- **Add to**: `.env.local` as `AQICN_API_KEY`

---

## 🏕️ CAMPSITE APIS

### 1. Recreation.gov RIDB (FREE)
- **URL**: https://ridb.recreation.gov/
- **Cost**: FREE
- **Features**: 120,000+ federal recreation areas, campgrounds, permits
- **Get Key**:
  1. Go to https://ridb.recreation.gov/
  2. Sign up
  3. Request API access
- **Add to**: `.env.local` as `RIDB_API_KEY`

### 2. National Park Service (NPS)
- **URL**: https://www.nps.gov/subjects/digitalstrategy/developer-guidance.htm
- **Cost**: FREE
- **Features**: National park data, alerts, campgrounds, visitor centers
- **Get Key**:
  1. Go to https://developer.nps.gov/api-key.html
  2. Fill out form
  3. Get key via email
- **Add to**: `.env.local` as `NPS_API_KEY`

---

## 🍳 RECIPE APIS

### 1. Edamam (BEST for camping recipes!)
- **URL**: https://developer.edamam.com/
- **Cost**: Free tier: 10,000 calls/month
- **Features**: 
  - Recipe search by ingredient
  - Nutrition analysis
  - Meal planning
  - Filters: vegan, gluten-free, dairy-free, etc.
- **Get Key**:
  1. Go to https://developer.edamam.com/
  2. Sign up
  3. Create new app
  4. Get **App ID** and **App Key**
- **Add to**: `.env.local`:
  - `EDAMAM_APP_ID`
  - `EDAMAM_APP_KEY`

### 2. Spoonacular
- **URL**: https://spoonacular.com/food-api
- **Cost**: Free tier: 150 requests/day
- **Features**: Recipes, ingredients, meal planning, wine pairing
- **Get Key**:
  1. Go to https://spoonacular.com/food-api
  2. Sign up
  3. Get API key
- **Add to**: `.env.local` as `SPOONACULAR_API_KEY`

---

## 🐦 WILDLIFE APIS (Optional)

### 1. eBird (Bird Watching)
- **URL**: https://ebird.org/data/download
- **Cost**: FREE but API key required
- **Features**: Bird observations, species lists, recent sightings
- **Get Key**:
  1. Go to https://ebird.org/api/keygen
  2. Sign in
  3. Request API key
- **Add to**: `.env.local` as `EBIRD_API_KEY`

### 2. FishWatch
- **URL**: https://www.fishwatch.gov/developers
- **Cost**: FREE
- **Features**: Fish species info, sustainability, nutrition
- **Get Key**: None needed for basic use

---

## 🏥 HEALTH APIS (First Aid Enhancement)

### 1. ApiMedic (Symptom Checker)
- **URL**: https://apimedic.com/
- **Cost**: Free tier available
- **Features**: Symptom checking, diagnosis suggestions
- **Get Key**:
  1. Go to https://apimedic.com/
  2. Sign up
  3. Get API credentials
- **Add to**: `.env.local` as `APIMEDIC_API_KEY`

---

## 📍 GEOCODING APIS

### 1. Geoapify
- **URL**: https://www.geoapify.com/
- **Cost**: Free tier: 3,000 credits/day
- **Features**: Geocoding, reverse geocoding, places API
- **Get Key**:
  1. Go to https://www.geoapify.com/
  2. Sign up
  3. Create project
  4. Get API key
- **Add to**: `.env.local` as `GEOAPIFY_API_KEY`

---

## 🎯 PRIORITY LIST (Get These First!)

### Tier 1 - Essential (Free/No Key):
1. ✅ **Open-Meteo** - Weather (NO KEY - USE NOW!)

### Tier 2 - Highly Recommended (Free):
2. **OpenWeatherMap** - Better weather data
3. **OpenUV** - Sun protection (critical for campers!)
4. **RIDB** - Campsite finder data
5. **NPS** - National parks data
6. **Edamam** - Recipe search

### Tier 3 - Nice to Have:
7. **Spoonacular** - More recipes
8. **Storm Glass** - If you boat/kayak
9. **eBird** - If you birdwatch
10. **Geoapify** - Better location search

---

## 📝 Example .env.local File

```bash
# Weather APIs
OPENWEATHER_API_KEY=your_key_here
OPENUV_API_KEY=your_key_here
STORMGLASS_API_KEY=your_key_here

# Campsite APIs
RIDB_API_KEY=your_key_here
NPS_API_KEY=your_key_here

# Recipe APIs
EDAMAM_APP_ID=your_app_id
EDAMAM_APP_KEY=your_app_key
SPOONACULAR_API_KEY=your_key_here

# Wildlife
EBIRD_API_KEY=your_key_here

# Health
APIMEDIC_API_KEY=your_key_here

# Geocoding
GEOAPIFY_API_KEY=your_key_here
```

---

## 🚀 Quick Start

**RIGHT NOW - No keys needed:**
- Open-Meteo weather is ready to use!

**This week:**
1. Sign up for OpenWeatherMap (free)
2. Sign up for OpenUV (free)
3. Sign up for RIDB (free)

**Next week:**
4. Edamam for recipes
5. NPS for national parks

Want me to start integrating Open-Meteo (no key needed) right now?
