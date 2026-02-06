# TikTok Automation - Node.js Implementation

**Full Node.js + Playwright implementation**

---

## Installation

```powershell
cd C:\cevict-live\apps\tiktok-automation\node
npm install
npx playwright install chromium
```

---

## Dependencies

- **playwright** - Browser automation
- **openai** - AI content generation
- **fluent-ffmpeg** - Video generation
- **node-cron** - Task scheduling

---

## CLI Commands

All commands support `--account <id>` flag:

```powershell
# Login (one-time)
node cli/login.js --account primary

# Generate video from PetReunion story
node cli/generateVideo.js --account primary

# Post video
node cli/post.js --account primary --video "path/to/video.mp4"

# Reply to comments
node cli/reply.js --account primary --video "https://tiktok.com/@user/video/123"

# Handle Q&A
node cli/qa.js --account primary

# Run scheduler
node cli/scheduler.js
```

---

## Workflow

1. **Login** → Saves cookies
2. **Generate Video** → Fetches story → AI script → ffmpeg video
3. **Post** → Uploads to TikTok
4. **Reply** → Auto-replies to comments
5. **Scheduler** → Runs everything on schedule

---

## Configuration

See parent directory `config/` folder:
- `config/config.json` - Main config
- `config/secrets.json` - API keys

---

## Output

- **Videos:** `../videos/daily/<account-id>/`
- **Logs:** `../logs/`
- **State:** `../state/`

---

**See parent README.md for full documentation.**
