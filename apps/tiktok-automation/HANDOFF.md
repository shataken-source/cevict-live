# TikTok Automation System - Handoff Document

**Date:** January 19, 2026  
**Status:** Initial Scaffolding Complete - Implementation Pending  
**Location:** `C:\cevict-live\apps\tiktok-automation`

---

## Executive Summary

This project is a **unified TikTok automation system** designed to:
- Automate PetReunion content posting to TikTok
- Generate videos from PetReunion stories (lost/found pets)
- Automatically reply to comments
- Handle Q&A interactions
- Support multi-account management
- Run as Windows service, serverless (Vercel/Supabase), or local scheduler

**Current State:** Project structure and configuration files are scaffolded. Core implementation (Node.js, Python, video generation, scheduler) is **not yet implemented**.

---

## Project Context & Requirements

### Original Request
User wanted to automate TikTok operations for PetReunion, including:
- Video generation from PetReunion API stories
- Automated posting
- Comment replies (especially for lost/found pet alerts)
- Q&A automation
- Multi-account support
- Integration with existing empire architecture

### Key Constraints
- **No secrets in git** - use `config/secrets.json` (gitignored) or vault path
- **Human-in-the-loop** - moderation/approval for safety-critical operations
- **Platform policies** - TikTok UI changes frequently; selectors need maintenance
- **Multi-language** - Both Node.js and Python implementations planned

---

## Architecture Overview

### Directory Structure (Planned)

```
apps/tiktok-automation/
├── config/                    # ✅ COMPLETE
│   ├── config.example.json   # Project-wide config (accounts, paths, settings)
│   └── secrets.example.json  # API keys template (OpenAI, Supabase)
│
├── auth/                      # ⏳ PENDING - Session/cookie management
├── tiktok/                    # ⏳ PENDING - Playwright automation (upload, comments, Q&A, DM)
├── petreunion/                # ⏳ PENDING - Fetch stories, convert to scripts/captions
├── ai/                        # ⏳ PENDING - OpenAI wrapper + prompt modules
├── video/                     # ⏳ PENDING - Video generation (ffmpeg/moviepy) + templates
├── scheduler/                 # ⏳ PENDING - Cron schedules (daily post, hourly replies, Q&A)
├── services/                  # ⏳ PENDING - Logging, storage, HTTP helpers, retry utils
├── serverless/                # ⏳ PENDING - Supabase + Vercel cron + edge functions
├── windows/                   # ⏳ PENDING - Windows service wrapper + logging
├── node/                      # ⏳ PENDING - Full Node.js + Playwright implementation
│   └── cli/                   # CLI commands (login, post, reply, qa, generateVideo, scheduler)
└── python/                    # ⏳ PENDING - Full Python + Playwright implementation
    └── cli/                   # CLI commands (login.py, post.py, reply.py, qa.py, etc.)
```

### Configuration Schema

**`config/config.json`** (user creates from `.example.json`):
- `project.timezone` - Timezone for scheduling (default: "America/Chicago")
- `project.paths` - Directories for videos, logs, state
- `accounts[]` - Array of TikTok accounts with:
  - `id`, `username`
  - `cookiesFile` - Path to saved Playwright cookies
  - `repliedStateFile` - Track which comments/DMs already replied to
  - `schedule` - Daily post time, hourly replies flag, Q&A interval
  - `videoFolder` - Where to store generated videos for this account
- `petreunion` - API URL and max stories per run
- `tiktok` - Playwright settings (headless, slowMo, timeout, selectors)

**`config/secrets.json`** (user creates from `.example.json`, gitignored):
- `openai.apiKey` - For AI-generated captions, replies, Q&A, scripts
- `supabase.url` + `supabase.serviceRoleKey` - For serverless storage
- `tiktok.note` - Reminder that auth is cookie-based (no passwords)

### Secrets Loading Strategy

Supports multiple paths (priority order):
1. Explicit: `TIKTOK_AUTOMATION_SECRETS_PATH=C:\Cevict_Vault\tiktok-automation.secrets.json`
2. Default vault: `C:\Cevict_Vault\tiktok-automation.secrets.json`
3. Local: `config/secrets.json`

This mirrors the pattern used in `alpha-hunter` (`src/lib/secret-store.ts`).

---

## Implementation Status

### ✅ Completed
- [x] Project README with architecture overview
- [x] Configuration schema (`config.example.json`)
- [x] Secrets template (`secrets.example.json`)
- [x] `.gitignore` (secrets, state, videos, logs, node_modules, etc.)

### ⏳ Pending (Critical Path)

#### 1. Shared Modules (Foundation)
- [ ] **`config/loader.js`** / **`config/loader.py`** - Load `config.json` + `secrets.json` with vault path support
- [ ] **`auth/cookie-manager.js`** / **`auth/cookie_manager.py`** - Save/load Playwright cookies per account
- [ ] **`petreunion/fetcher.js`** / **`petreunion/fetcher.py`** - Fetch stories from PetReunion API
- [ ] **`ai/openai-client.js`** / **`ai/openai_client.py`** - OpenAI wrapper with prompt modules:
  - Generate video scripts from PetReunion stories
  - Generate captions with hashtags
  - Generate comment replies (lost/found pet detection)
  - Generate Q&A responses
- [ ] **`video/generator.js`** / **`video/generator.py`** - Video generation:
  - Input: PetReunion story + script + captions
  - Output: MP4 with overlays, text, music (if needed)
  - Node: Use `ffmpeg` (via `fluent-ffmpeg`)
  - Python: Use `moviepy`
- [ ] **`services/logger.js`** / **`services/logger.py`** - Structured logging to `logs/`
- [ ] **`services/state-manager.js`** / **`services/state_manager.py`** - Track replied comments/DMs (prevent duplicates)

#### 2. TikTok Automation (Playwright)
- [ ] **`tiktok/browser.js`** / **`tiktok/browser.py`** - Playwright browser setup (headless, cookies, user agent)
- [ ] **`tiktok/login.js`** / **`tiktok/login.py`** - Manual login flow, save cookies
- [ ] **`tiktok/upload.js`** / **`tiktok/upload.py`** - Upload video with caption
- [ ] **`tiktok/comments.js`** / **`tiktok/comments.py`** - Read comments, reply (with state tracking)
- [ ] **`tiktok/qa.js`** / **`tiktok/qa.py`** - Handle Q&A section
- [ ] **`tiktok/dm.js`** / **`tiktok/dm.py`** - Read/reply to DMs (optional, higher risk)

**⚠️ Important:** TikTok UI selectors change frequently. Keep selectors in `config.json` `tiktok.selectors` object and make them easily updatable.

#### 3. Node.js Implementation
- [ ] **`node/package.json`** - Dependencies:
  - `playwright` (browser automation)
  - `fluent-ffmpeg` (video generation)
  - `openai` (AI)
  - `dotenv` (optional, for env var fallback)
- [ ] **`node/cli/login.js`** - CLI: `node cli/login.js --account primary`
- [ ] **`node/cli/generateVideo.js`** - CLI: Generate video from PetReunion story
- [ ] **`node/cli/post.js`** - CLI: Post video to TikTok
- [ ] **`node/cli/reply.js`** - CLI: Reply to comments
- [ ] **`node/cli/qa.js`** - CLI: Handle Q&A
- [ ] **`node/cli/scheduler.js`** - CLI: Run scheduled tasks (daily post, hourly replies, Q&A)

#### 4. Python Implementation
- [ ] **`python/requirements.txt`** - Dependencies:
  - `playwright` (browser automation)
  - `moviepy` (video generation)
  - `openai` (AI)
  - `python-dotenv` (optional)
- [ ] **`python/cli/login.py`** - CLI: `python cli/login.py --account primary`
- [ ] **`python/cli/generate_video.py`** - CLI: Generate video
- [ ] **`python/cli/post.py`** - CLI: Post video
- [ ] **`python/cli/reply.py`** - CLI: Reply to comments
- [ ] **`python/cli/qa.py`** - CLI: Handle Q&A
- [ ] **`python/cli/scheduler.py`** - CLI: Run scheduled tasks

#### 5. Scheduler
- [ ] **`scheduler/cron.js`** / **`scheduler/cron.py`** - Parse `config.json` schedules, run tasks:
  - Daily post at `schedule.dailyPostTimeCST`
  - Hourly comment replies (if `schedule.hourlyReplies === true`)
  - Q&A every N hours (`schedule.qaEveryHours`)

#### 6. Serverless (Optional)
- [ ] **`serverless/supabase/`** - Tables for:
  - Video queue (stories to post)
  - Post history
  - Comment/DM replies (state tracking)
- [ ] **`serverless/vercel/`** - Cron endpoints:
  - `/api/cron/daily-post` - Trigger daily post
  - `/api/cron/hourly-replies` - Trigger comment replies
  - `/api/cron/qa` - Trigger Q&A
- [ ] **`serverless/edge/`** - Edge functions for AI processing (optional)

#### 7. Windows Service (Optional)
- [ ] **`windows/service.js`** - Windows service wrapper using `node-windows` or `pm2`
- [ ] **`windows/install.ps1`** - Install service script
- [ ] **`windows/uninstall.ps1`** - Uninstall service script
- [ ] **`windows/README.md`** - Service setup instructions

---

## Technical Decisions & Patterns

### 1. Multi-Language Support
- **Why:** User may prefer Node.js or Python for different parts of the stack
- **Pattern:** Shared config schema, separate implementations, same CLI interface
- **Shared:** `config/`, `auth/`, `petreunion/`, `ai/`, `video/`, `scheduler/` (language-agnostic logic)

### 2. Cookie-Based Authentication
- **Why:** TikTok doesn't have a public API; Playwright with saved cookies is the most reliable method
- **Pattern:** Manual login once per account, save cookies to `state/cookies/{accountId}.cookies.json`
- **Security:** Never commit cookies; they're in `.gitignore`

### 3. State Tracking (Prevent Duplicates)
- **Why:** Don't reply to the same comment/DM twice
- **Pattern:** JSON files per account: `state/replied/{accountId}.replied.json`
- **Structure:** `{ "commentIds": [...], "dmIds": [...], "lastChecked": "ISO8601" }`

### 4. Video Generation Pipeline
```
PetReunion API → Story JSON
  ↓
AI (OpenAI) → Script + Caption + Hashtags
  ↓
Video Generator → MP4 with overlays/text
  ↓
TikTok Upload → Post with caption
```

### 5. Secrets Management
- **Pattern:** JSON file with vault path support (mirrors `alpha-hunter/src/lib/secret-store.ts`)
- **Fallback:** Environment variables (for serverless)
- **Never commit:** `config/secrets.json` is gitignored

### 6. Error Handling
- **Retry logic:** Use exponential backoff for API calls (OpenAI, PetReunion, TikTok)
- **Logging:** Structured logs to `logs/` directory
- **Graceful degradation:** If AI fails, use fallback templates; if video gen fails, log and skip

---

## Integration Points

### PetReunion API
- **Endpoint:** `https://petreunion.com/api/latest` (configurable in `config.json`)
- **Expected format:** Array of story objects (exact schema TBD - may need to inspect API response)
- **Usage:** Fetch stories → Generate videos → Post to TikTok

### Supabase (Serverless)
- **Purpose:** Store video queue, post history, reply state (alternative to local JSON files)
- **Tables needed:**
  - `tiktok_video_queue` - Stories to post
  - `tiktok_posts` - Post history
  - `tiktok_replies` - Comment/DM reply tracking
- **Integration:** Optional; local JSON files are the default

### OpenAI API
- **Purpose:** Generate scripts, captions, replies, Q&A responses
- **Models:** `gpt-4` or `gpt-3.5-turbo` (configurable)
- **Prompts:** Store in `ai/prompts/` directory (language-agnostic templates)

---

## Next Steps (Priority Order)

### Phase 1: Foundation (Week 1)
1. **Config loader** - Both Node.js and Python
2. **PetReunion fetcher** - Test API, parse stories
3. **OpenAI client** - Basic wrapper + prompt templates
4. **Logger** - Structured logging

### Phase 2: TikTok Automation (Week 2)
1. **Playwright browser setup** - Headless, cookies, user agent
2. **Login flow** - Manual login, save cookies
3. **Upload flow** - Post video with caption
4. **Comments flow** - Read comments, reply (with state tracking)

### Phase 3: Video Generation (Week 3)
1. **Video generator** - Node.js (ffmpeg) + Python (moviepy)
2. **Templates** - Video templates in `video/templates/`
3. **Integration** - Connect PetReunion → AI → Video → Upload

### Phase 4: Automation (Week 4)
1. **Scheduler** - Parse config, run tasks on schedule
2. **Q&A automation** - Handle Q&A section
3. **Multi-account** - Support multiple TikTok accounts

### Phase 5: Production (Optional)
1. **Windows service** - Wrap scheduler as Windows service
2. **Serverless** - Supabase + Vercel cron endpoints
3. **Monitoring** - Health checks, error alerts

---

## Key Files Reference

### Configuration
- `config/config.example.json` - Project configuration template
- `config/secrets.example.json` - Secrets template
- `.gitignore` - Excludes secrets, state, videos, logs

### Documentation
- `README.md` - User-facing quickstart guide
- `HANDOFF.md` - This document (technical handoff)

### Planned (Not Yet Created)
- `config/loader.js` / `config/loader.py` - Config + secrets loader
- `node/package.json` - Node.js dependencies
- `python/requirements.txt` - Python dependencies
- All CLI files in `node/cli/` and `python/cli/`
- All shared modules in `auth/`, `tiktok/`, `petreunion/`, `ai/`, `video/`, `scheduler/`, `services/`

---

## Testing Strategy

### Manual Testing (Initial)
1. **Login:** Run `login.js` / `login.py`, verify cookies saved
2. **Upload:** Generate test video, upload manually, verify post appears
3. **Comments:** Post test comment, run `reply.js`, verify reply appears
4. **Scheduler:** Run scheduler in foreground, verify tasks execute on schedule

### Automated Testing (Future)
- Unit tests for config loader, PetReunion fetcher, AI client
- Integration tests for video generation (mock OpenAI, test ffmpeg/moviepy)
- E2E tests for TikTok automation (use test account, verify posts/replies)

---

## Known Risks & Mitigations

### Risk: TikTok UI Changes
- **Mitigation:** Keep selectors in `config.json`, make them easily updatable
- **Mitigation:** Use Playwright's `waitForSelector` with multiple selector strategies

### Risk: Rate Limiting
- **Mitigation:** Respect rate limits (configurable delays between actions)
- **Mitigation:** Exponential backoff on errors
- **Mitigation:** Human-in-the-loop approval for bulk operations

### Risk: Account Ban
- **Mitigation:** Use realistic delays (`slowMoMs` in config)
- **Mitigation:** Rotate user agents
- **Mitigation:** Don't automate too aggressively (respect platform policies)

### Risk: Secrets Exposure
- **Mitigation:** `.gitignore` excludes `secrets.json`
- **Mitigation:** Use vault path (external to repo)
- **Mitigation:** Never log secrets

---

## Related Projects

### `alpha-hunter`
- **Connection:** Both use vault-based secrets (`C:\Cevict_Vault`)
- **Pattern:** `alpha-hunter/src/lib/secret-store.ts` can be adapted for TikTok automation

### `petreunion`
- **Connection:** TikTok automation consumes PetReunion API stories
- **Note:** PetReunion API schema may need to be inspected/confirmed

### `empire-c2`
- **Connection:** May want to add TikTok automation dashboard/monitoring
- **Note:** Not a dependency, but could integrate later

---

## Questions for Next Developer

1. **PetReunion API:** What is the exact schema of `/api/latest` response? (Need to test/inspect)
2. **TikTok Selectors:** Current selectors for upload, comments, Q&A? (May need to inspect TikTok UI)
3. **Video Templates:** What style of videos? (Text overlays, images, animations?)
4. **AI Prompts:** Specific tone/format for captions, replies, Q&A? (PetReunion brand voice?)
5. **Multi-Account:** How many accounts? Any account-specific settings needed?

---

## Contact & Resources

- **Project Location:** `C:\cevict-live\apps\tiktok-automation`
- **Empire Rules:** `C:\cevict-live\.cursor\rules\empire-system.mdc`
- **Vault Path:** `C:\Cevict_Vault` (for secrets)
- **TikTok Docs:** (No official API; Playwright automation required)
- **Playwright Docs:** https://playwright.dev
- **PetReunion API:** `https://petreunion.com/api/latest` (may need authentication)

---

**End of Handoff Document**
