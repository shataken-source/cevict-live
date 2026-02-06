# TikTok Automation System

**Complete automation system for PetReunion TikTok content**

---

## 🚀 Quick Start

```powershell
# 1. Install
cd C:\cevict-live\apps\tiktok-automation\node
npm install
npx playwright install chromium

# 2. Configure
cd ..
Copy-Item config\config.example.json config\config.json
Copy-Item config\secrets.example.json config\secrets.json
# Edit config.json and secrets.json

# 3. Login (one-time)
cd node
node cli/login.js --account primary

# 4. Generate & Post
node cli/generateVideo.js --account primary
node cli/post.js --account primary --video "path/to/video.mp4"

# 5. Auto-reply to comments
node cli/reply.js --account primary --video "https://tiktok.com/@user/video/123"

# 6. Run scheduler (automated)
node cli/scheduler.js
```

**Full setup guide:** See [SETUP.md](./SETUP.md)

---

## ✨ Features

### ✅ Implemented

- **Multi-Account Support** - Manage multiple TikTok accounts
- **Cookie-Based Auth** - Login once, cookies saved for future use
- **PetReunion Integration** - Fetches lost/found pet stories
- **AI Content Generation** - Scripts, captions, hashtags, replies, Q&A
- **Video Generation** - Creates videos from stories using ffmpeg
- **Automated Posting** - Upload videos to TikTok
- **Comment Replies** - Auto-reply using AI
- **Q&A Handling** - Respond to questions
- **Scheduler** - Daily posts, hourly replies, Q&A checks
- **State Tracking** - Prevents duplicate replies/posts
- **Rate Limiting** - Respects TikTok limits
- **Error Handling** - Retry logic with exponential backoff
- **Logging** - Structured logs to files

---

## 📁 Project Structure

```
apps/tiktok-automation/
├── config/
│   ├── loader.js              # Config + secrets loader
│   ├── config.example.json    # Configuration template
│   └── secrets.example.json   # Secrets template
├── auth/
│   └── cookie-manager.js      # Playwright cookie save/load
├── petreunion/
│   └── fetcher.js             # PetReunion API client
├── ai/
│   └── openai-client.js       # OpenAI wrapper + prompts
├── tiktok/
│   └── browser.js             # Playwright automation
├── video/
│   ├── generator.js           # ffmpeg video generation
│   └── templates/             # Video templates (future)
├── services/
│   ├── logger.js              # Structured logging
│   ├── state-manager.js       # Reply/post tracking
│   └── retry.js               # Retry + rate limiting
├── node/
│   ├── package.json           # Dependencies
│   └── cli/
│       ├── login.js           # Login command
│       ├── post.js            # Post command
│       ├── generateVideo.js   # Generate video command
│       ├── reply.js           # Reply command
│       ├── qa.js              # Q&A command
│       └── scheduler.js       # Scheduler command
└── README.md                  # This file
```

---

## 🎯 CLI Commands

### Login
```powershell
node cli/login.js --account primary
```
Manual login - saves cookies for future use.

### Generate Video
```powershell
node cli/generateVideo.js --account primary
```
Fetches PetReunion story → AI generates script/caption → Creates video with ffmpeg.

### Post Video
```powershell
node cli/post.js --account primary --video "path/to/video.mp4"
```
Uploads video to TikTok with caption.

### Reply to Comments
```powershell
node cli/reply.js --account primary --video "https://tiktok.com/@user/video/123"
```
Auto-replies to new comments using AI.

### Q&A
```powershell
node cli/qa.js --account primary
```
Handles Q&A section (requires UI selector updates).

### Scheduler
```powershell
node cli/scheduler.js
```
Runs scheduled tasks (daily posts, hourly replies, Q&A).

---

## ⚙️ Configuration

### Config File (`config/config.json`)

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
      "username": "your_tiktok_username",
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

### Secrets File (`config/secrets.json`)

```json
{
  "openai": {
    "apiKey": "sk-your-key-here"
  },
  "supabase": {
    "url": "https://your-project.supabase.co",
    "serviceRoleKey": "your-key-here"
  }
}
```

**Or use vault:**
```powershell
$env:TIKTOK_AUTOMATION_SECRETS_PATH = "C:\Cevict_Vault\tiktok-automation.secrets.json"
```

---

## 🔒 Security

- ✅ Secrets never committed (gitignored)
- ✅ Cookies stored locally (not in git)
- ✅ Vault path support for secrets
- ✅ No passwords stored (cookie-based auth)

---

## ⚠️ Important Notes

### TikTok UI Changes
TikTok's UI changes frequently. The selectors in `tiktok/browser.js` may need updating:
- File upload input
- Caption textarea
- Post button
- Comment elements

**Solution:** Test and update selectors as needed.

### Platform Policies
- Respect TikTok's terms of service
- Use reasonable delays between actions
- Don't spam or abuse the platform
- Human-in-the-loop recommended for safety

### Rate Limiting
- Built-in rate limiting (10 replies per minute)
- Configurable delays between actions
- Retry logic with exponential backoff

---

## 🐛 Troubleshooting

**See [SETUP.md](./SETUP.md) for detailed troubleshooting guide.**

Common issues:
- Config/secrets not found → Create from examples
- Not logged in → Run `login.js` first
- Video generation fails → Check ffmpeg installation
- Upload fails → TikTok UI may have changed (update selectors)

---

## 📊 Status

**Node.js Implementation:** ✅ Complete
- ✅ All CLI commands
- ✅ Video generation
- ✅ Error handling
- ✅ State management
- ✅ Scheduler

**Python Implementation:** ⏳ Pending
**Serverless:** ⏳ Pending
**Windows Service:** ⏳ Pending

---

## 🚧 Future Enhancements

- [ ] Python implementation
- [ ] Full video templates with animations
- [ ] Image processing from PetReunion stories
- [ ] DM automation
- [ ] Analytics dashboard
- [ ] Supabase integration for state
- [ ] Vercel cron for serverless
- [ ] Windows service wrapper

---

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Complete setup guide
- [HANDOFF.md](./HANDOFF.md) - Technical handoff document
- [CONTEXT.md](./CONTEXT.md) - Quick context for AI assistants
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Implementation status

---

**Ready to automate your TikTok content!** 🎬
