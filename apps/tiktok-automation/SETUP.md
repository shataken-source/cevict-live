# TikTok Automation - Setup Guide

**Complete setup instructions for TikTok automation system**

---

## Prerequisites

1. **Node.js** (v18 or higher)
2. **ffmpeg** - For video generation
   - Download: https://ffmpeg.org/download.html
   - Or install via package manager:
     - Windows: `choco install ffmpeg` or `winget install ffmpeg`
     - Mac: `brew install ffmpeg`
     - Linux: `apt-get install ffmpeg`
3. **OpenAI API Key** - For AI content generation
4. **TikTok Account** - For posting content

---

## Step 1: Install Dependencies

```powershell
cd C:\cevict-live\apps\tiktok-automation\node
npm install
npx playwright install chromium
```

**Dependencies installed:**
- `playwright` - Browser automation
- `openai` - AI content generation
- `fluent-ffmpeg` - Video generation
- `node-cron` - Scheduling

---

## Step 2: Configure

### 2.1 Create Config File

```powershell
cd C:\cevict-live\apps\tiktok-automation
Copy-Item config\config.example.json config\config.json
```

Edit `config/config.json`:
```json
{
  "project": {
    "timezone": "America/Chicago",
    "paths": {
      "videosDailyDir": "../videos/daily",
      "logsDir": "../logs",
      "stateDir": "../state"
    }
  },
  "accounts": [
    {
      "id": "primary",
      "username": "your_actual_tiktok_username",
      "cookiesFile": "../state/cookies/primary.cookies.json",
      "repliedStateFile": "../state/replied/primary.replied.json",
      "schedule": {
        "dailyPostTimeCST": "09:00",
        "hourlyReplies": true,
        "qaEveryHours": 2
      },
      "videoFolder": "../videos/daily/primary"
    }
  ],
  "petreunion": {
    "latestApiUrl": "https://petreunion.com/api/latest",
    "maxStoriesPerRun": 5
  },
  "tiktok": {
    "headless": false,
    "slowMoMs": 50,
    "navigationTimeoutMs": 60000
  }
}
```

### 2.2 Create Secrets File

```powershell
Copy-Item config\secrets.example.json config\secrets.json
```

Edit `config/secrets.json`:
```json
{
  "openai": {
    "apiKey": "sk-your-openai-api-key-here"
  },
  "supabase": {
    "url": "https://your-project.supabase.co",
    "serviceRoleKey": "your-service-role-key"
  }
}
```

**Or use vault path:**
```powershell
$env:TIKTOK_AUTOMATION_SECRETS_PATH = "C:\Cevict_Vault\tiktok-automation.secrets.json"
```

---

## Step 3: Login to TikTok

**First-time login (manual):**

```powershell
cd C:\cevict-live\apps\tiktok-automation\node
node cli/login.js --account primary
```

**What happens:**
1. Browser opens to TikTok login page
2. You log in manually
3. System detects login and saves cookies
4. Cookies saved to `state/cookies/primary.cookies.json`

**Future runs:** Cookies are loaded automatically, no need to log in again (until they expire).

---

## Step 4: Generate Video from PetReunion Story

```powershell
node cli/generateVideo.js --account primary
```

**What happens:**
1. Fetches latest PetReunion stories
2. Uses AI to generate video script
3. Generates caption + hashtags
4. Creates video using ffmpeg (text overlay or image-based)
5. Saves video to `videos/daily/primary/`

**Output:**
- Video file: `video-2026-01-19T12-00-00.mp4`
- Story data: `story-2026-01-19T12-00-00.json`

---

## Step 5: Post Video

```powershell
node cli/post.js --account primary --video "videos/daily/primary/video-2026-01-19T12-00-00.mp4"
```

**What happens:**
1. Opens TikTok upload page
2. Uploads video file
3. Enters caption
4. Clicks post button
5. Waits for upload to complete

---

## Step 6: Reply to Comments

```powershell
node cli/reply.js --account primary --video "https://www.tiktok.com/@username/video/1234567890"
```

**What happens:**
1. Fetches comments from video
2. Filters out already-replied comments
3. Uses AI to generate replies
4. Posts replies with rate limiting
5. Tracks replied comments to prevent duplicates

---

## Step 7: Run Scheduler (Automated)

```powershell
node cli/scheduler.js
```

**What it does:**
- **Daily posts:** Posts at configured time (e.g., 9:00 AM CST)
- **Hourly replies:** Checks and replies to comments every hour
- **Q&A:** Handles Q&A every N hours (e.g., every 2 hours)

**To stop:** Press `Ctrl+C`

---

## Troubleshooting

### "Config file not found"
- Make sure `config/config.json` exists
- Copy from `config/config.example.json`

### "Secrets file not found"
- Create `config/secrets.json` or set `TIKTOK_AUTOMATION_SECRETS_PATH`
- Add OpenAI API key

### "Not logged in"
- Run `node cli/login.js --account primary` first
- Cookies expire after ~30 days - re-login if needed

### "Video file not found"
- Check video path is correct
- Use absolute path or path relative to project root

### "Could not find file input" (TikTok upload)
- TikTok UI may have changed
- Update selectors in `tiktok/browser.js`
- Check browser window for actual selectors

### "ffmpeg not found"
- Install ffmpeg: https://ffmpeg.org/download.html
- Make sure it's in your PATH
- Test: `ffmpeg -version`

### Video generation fails
- Check ffmpeg is installed
- Verify video output directory exists and is writable
- Check ffmpeg logs for specific errors

---

## Advanced Usage

### Multiple Accounts

Add more accounts to `config/config.json`:
```json
{
  "accounts": [
    {
      "id": "primary",
      "username": "account1",
      ...
    },
    {
      "id": "secondary",
      "username": "account2",
      ...
    }
  ]
}
```

Then use:
```powershell
node cli/login.js --account secondary
node cli/post.js --account secondary --video "path/to/video.mp4"
```

### Custom Video Generation

Edit `video/generator.js` to customize:
- Video dimensions
- Text styling
- Image overlays
- Animations
- Background music

### Custom AI Prompts

Edit `ai/openai-client.js` to customize:
- Script generation prompts
- Caption style
- Reply tone
- Q&A responses

---

## File Locations

**Config:**
- `config/config.json` - Main configuration
- `config/secrets.json` - API keys (gitignored)

**State:**
- `state/cookies/` - Saved TikTok cookies
- `state/replied/` - Replied comments/DMs tracking

**Output:**
- `videos/daily/` - Generated videos
- `logs/` - Log files

---

## Next Steps

1. ✅ Test login flow
2. ✅ Test video generation
3. ✅ Test posting
4. ✅ Test comment replies
5. ✅ Run scheduler
6. ⏳ Customize video templates
7. ⏳ Add more accounts
8. ⏳ Implement Python version (optional)
9. ⏳ Set up Windows service (optional)
10. ⏳ Set up serverless (optional)

---

**System is ready to use!** 🚀
