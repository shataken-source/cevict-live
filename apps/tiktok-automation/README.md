# TikTok Automation System (Multi-Account, Node + Python + Serverless + Windows)

This is a **unified TikTok automation system** for PetReunion content + comment/Q&A automation.

## Important

- **Platform policies**: TikTok automation capabilities vary and may be subject to TikTok’s policies, rate limits, and UI changes.
- **Human-in-the-loop**: enable moderation/approval for anything safety-critical.
- **No secrets in git**: this project expects secrets to live in `config/secrets.json` (gitignored) or your vault JSON store.

## Repository layout (top-level modules)

The following folders exist at the project root and are shared across implementations:

- `auth/`: session/cookie management (multi-account)
- `tiktok/`: upload, comments, Q&A, DM, trending scraping
- `petreunion/`: fetch stories, convert to scripts/captions/overlays
- `ai/`: OpenAI wrapper + prompt modules
- `video/`: video generation (ffmpeg for Node, moviepy for Python) + `templates/`
- `scheduler/`: cron schedules (daily posting, hourly comment replies, Q&A every 2 hours)
- `config/`: `config.json`, secrets, env loader
- `services/`: logging, storage, http helpers, retry utilities
- `serverless/`: Supabase + Vercel cron endpoints + edge functions
- `windows/`: Windows service wrapper + logging
- `python/`: full Python + Playwright implementation
- `node/`: full Node.js + Playwright implementation

## Quickstart (Node)

1. Install:

```powershell
cd C:\cevict-live\apps\tiktok-automation\node
npm install
npx playwright install
```

2. Configure:
- Copy `..\config\config.example.json` -> `..\config\config.json`
- Copy `..\config\secrets.example.json` -> `..\config\secrets.json` (never commit)

3. Login (manual once per account):

```powershell
node .\cli\login.js --account primary
```

4. Generate daily videos:

```powershell
node .\cli\generateVideo.js --account primary
```

5. Post:

```powershell
node .\cli\post.js --account primary
```

6. Reply to comments:

```powershell
node .\cli\reply.js --account primary
```

7. Q&A:

```powershell
node .\cli\qa.js --account primary
```

## Quickstart (Python)

1. Install:

```powershell
cd C:\cevict-live\apps\tiktok-automation\python
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m playwright install
```

2. Configure configs in `..\config\`.

3. Run:

```powershell
python cli\login.py --account primary
python cli\generate_video.py --account primary
python cli\post.py --account primary
python cli\reply.py --account primary
python cli\qa.py --account primary
```

## Running on a schedule

- Node scheduler:

```powershell
node .\cli\scheduler.js
```

- Python scheduler:

```powershell
python cli\scheduler.py
```

## Secrets / vault integration

This repo supports a secrets JSON file:

- `config/secrets.json` (gitignored)

Optionally, you can point to a vault file:

- `TIKTOK_AUTOMATION_SECRETS_PATH=C:\Cevict_Vault\tiktok-automation.secrets.json`

## Serverless + Supabase + Vercel Cron

See `serverless/README.md`.

## Windows service

See `windows/README.md`.

