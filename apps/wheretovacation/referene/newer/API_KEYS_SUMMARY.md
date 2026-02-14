# API Keys Summary - Charter Boat Scraper

## ✅ Currently Configured

### Google Custom Search
```
GOOGLE_API_KEY=AIzaSyCs8ZLuIjeS572-yulrV9-Oecn2nxiRk1o
GOOGLE_CSE_ID=037e0739512044309
```
**Status:** ✅ Ready to use

### Facebook App Credentials
```
FACEBOOK_APP_ID=1870710053552467
FACEBOOK_APP_SECRET=1afa8b039e6ec29705f8105156e27cd8
FACEBOOK_EMAIL=cochranj@addictware.com
FACEBOOK_PASSWORD=Sm)^8SHE=7Eyp(P
```
**Status:** ⚠️ Needs `FACEBOOK_ACCESS_TOKEN` (generate from app)

## ⚠️ Needs Configuration

### Twitter API
```
TWITTER_BEARER_TOKEN=(generate from Twitter Developer Dashboard)
TWITTER_API_KEY=(optional - for OAuth)
TWITTER_API_SECRET=(optional - for OAuth)
TWITTER_ACCESS_TOKEN=(optional - for posting)
TWITTER_ACCESS_TOKEN_SECRET=(optional - for posting)
```
**Status:** ⚠️ Needs Bearer Token
**Project:** petreunion (ID: 2000381256274690049)
**Instructions:** See `docs/TWITTER_API_SETUP.md`

### Instagram API
```
INSTAGRAM_ACCESS_TOKEN=(needs to be added)
INSTAGRAM_ACCOUNT_ID=(needs to be added)
```
**Status:** ⚠️ Needs credentials

## Current Scraper Status

**Active Sources:**
- ✅ Google Search
- ✅ The Hull Truth Forum
- ✅ Craigslist
- ✅ Known charter websites

**Pending Sources (need API keys):**
- ⚠️ Facebook (needs access token)
- ⚠️ Twitter (needs bearer token)
- ⚠️ Instagram (needs credentials)

## Next Steps

1. **Generate Facebook Access Token:**
   - Use Facebook Graph API Explorer
   - Or generate programmatically using app credentials

2. **Generate Twitter Bearer Token:**
   - Go to Twitter Developer Dashboard
   - Project: petreunion (2000381256274690049)
   - Generate Bearer Token in "Keys and tokens"

3. **Add Instagram Credentials:**
   - Set up Instagram Graph API
   - Get access token and account ID

Once keys are added to `.env.local`, restart the dev server and the scraper will automatically use them.

