# TikTok Automation - Quick Context for AI Assistants

**Project:** TikTok automation for PetReunion content  
**Location:** `C:\cevict-live\apps\tiktok-automation`  
**Status:** Scaffolded, implementation pending

---

## What This Project Does

Automates TikTok operations for PetReunion:
- Fetches lost/found pet stories from PetReunion API
- Generates videos with AI-generated scripts/captions
- Posts videos to TikTok
- Automatically replies to comments (especially lost/found pet alerts)
- Handles Q&A interactions
- Supports multiple TikTok accounts
- Runs on schedule (daily posts, hourly replies, Q&A every 2 hours)

---

## Current State

✅ **Done:**
- Project structure planned
- Configuration schema (`config.example.json`, `secrets.example.json`)
- README and handoff docs
- `.gitignore`

⏳ **Not Done:**
- All implementation (Node.js, Python, video generation, TikTok automation, scheduler)

---

## Architecture

**Shared modules** (language-agnostic):
- `config/` - Configuration loader
- `auth/` - Cookie management
- `petreunion/` - API fetcher
- `ai/` - OpenAI wrapper + prompts
- `video/` - Video generation (ffmpeg/moviepy)
- `scheduler/` - Cron scheduler
- `services/` - Logging, state management

**Implementations:**
- `node/` - Node.js + Playwright + ffmpeg
- `python/` - Python + Playwright + moviepy

**Optional:**
- `serverless/` - Supabase + Vercel cron
- `windows/` - Windows service wrapper

---

## Key Patterns

1. **Secrets:** JSON file (`config/secrets.json` or vault path), never committed
2. **Auth:** Cookie-based (Playwright saves cookies after manual login)
3. **State:** JSON files track replied comments/DMs (prevent duplicates)
4. **Config:** Single `config.json` with accounts array, schedules, paths
5. **Multi-account:** Each account has own cookies, state, video folder

---

## Configuration Schema

```json
{
  "project": {
    "timezone": "America/Chicago",
    "paths": { "videosDailyDir": "...", "logsDir": "...", "stateDir": "..." }
  },
  "accounts": [
    {
      "id": "primary",
      "username": "...",
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
  "petreunion": { "latestApiUrl": "...", "maxStoriesPerRun": 5 },
  "tiktok": { "headless": false, "slowMoMs": 50, "navigationTimeoutMs": 60000 }
}
```

---

## Implementation Order (Recommended)

1. **Config loader** - Load `config.json` + `secrets.json` (Node + Python)
2. **PetReunion fetcher** - Fetch stories from API
3. **OpenAI client** - Generate scripts, captions, replies
4. **TikTok browser** - Playwright setup, login, cookie save
5. **TikTok upload** - Post video with caption
6. **TikTok comments** - Read comments, reply (with state tracking)
7. **Video generator** - ffmpeg (Node) / moviepy (Python)
8. **Scheduler** - Parse schedules, run tasks
9. **Q&A automation** - Handle Q&A section
10. **Multi-account** - Support multiple accounts

---

## Dependencies

**Node.js:**
- `playwright` - Browser automation
- `fluent-ffmpeg` - Video generation
- `openai` - AI
- `dotenv` (optional)

**Python:**
- `playwright` - Browser automation
- `moviepy` - Video generation
- `openai` - AI
- `python-dotenv` (optional)

---

## Important Notes

- **TikTok UI changes frequently** - Keep selectors in config, make updatable
- **No official TikTok API** - Playwright automation required
- **Rate limiting** - Use delays, exponential backoff
- **Account safety** - Don't automate too aggressively
- **Secrets** - Never commit `secrets.json`, use vault path
- **State tracking** - Prevent duplicate replies using JSON files

---

## Related Files

- `HANDOFF.md` - Full technical handoff document
- `README.md` - User-facing quickstart guide
- `config/config.example.json` - Configuration template
- `config/secrets.example.json` - Secrets template

---

## Questions to Answer

1. PetReunion API response schema? (Test `/api/latest`)
2. TikTok UI selectors? (Inspect current TikTok interface)
3. Video style preferences? (Text overlays, images, animations?)
4. AI prompt tone? (PetReunion brand voice?)
5. Number of accounts? (Any account-specific settings?)

---

**Quick Start:** Read `HANDOFF.md` for full details, then start with config loader implementation.
