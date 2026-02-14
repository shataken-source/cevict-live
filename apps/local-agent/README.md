# Cochran AI (Cochran Bot)

**Cochran AI** (the “Cochran Bot”) runs on your machine and keeps **persistent state** so Cursor (or you) can get a **refresher** after a restart and fight **AI amnesia**. Fully **offline** — all data is stored in local JSON files (and optional vector DB).

## What it does

- **Session store** — Cursor (or a script) can POST a summary at the end of each session or on **Checkpoint**. Supports Context Pillars, tab snapshot, and phase/tags.
- **Refresher** — GET the last N sessions so after a restart you can ask "what did we do last time?"
- **Knowledge index** — Scans `C:\gcc` and `C:\cevict-live` (apps, docs, folder tree) and saves an index. You can query it for "what's in the repos" without re-scanning.
- **Run whenever the laptop is on** — Use Task Scheduler to start the server at logon so it’s always available.

## Data location

- Default: `C:\Cevict_Vault\local-agent\` (same vault as KeyVault).
- Override: set `LOCAL_AGENT_DATA` to any folder (e.g. `D:\local-agent-data`).

Files:

- `sessions.json` — Append-only session entries (summary, pillars, tabSnapshot, phase, tags, gitCommitHash).
- `knowledge.json` — Built by `pnpm run build-knowledge`.
- `lancedb/` — Vector index for semantic search (when optional deps are installed).

## Quick start

```powershell
cd C:\cevict-live\apps\local-agent
pnpm install
pnpm build
# Build knowledge once (scans C:\gcc and C:\cevict-live)
node dist/build-knowledge.js
# Start server (default port 3847)
pnpm start
```

## System tray

A system-tray icon (green when running, red when not) is built into this app. Right-click: turn Cochran on/off, open Refresher, scheduled tasks, “What’s wrong?”

```powershell
pnpm run tray
```

When you start the agent (`pnpm start` or `pnpm dev`), the tray starts automatically. To disable: set `COCHRAN_START_TRAY=0`. To run only the tray: `pnpm run tray`. Uses Electron; `tray/main.js` and `tray/assets/` live in this repo. The standalone `apps/cochran-tray` is optional.

## API (default port 3847)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Status and data dir |
| POST | `/session` | Ingest a session or checkpoint (see body below) |
| GET | `/refresher?last=5` | Last N sessions; optional `phase`, `tags`, `type` |
| GET | `/sessions?last=20` | List sessions; optional `phase`, `tags`, `type` |
| GET | `/search?q=...&limit=10` | **Semantic search** (requires vector deps) |
| GET | `/search/status` | Whether vector search is available |
| POST | `/search/rebuild` | Re-index all sessions for vector search |
| GET | `/knowledge` | Knowledge index (run build-knowledge first) |
| POST | `/knowledge/rebuild` | Rebuild knowledge index |
| GET | `/store` | Data directory path |

### POST /session body (session or checkpoint)

Required: `summary` (or use pillars). Optional: `userQuery`, `actions[]`, `filesTouched[]`, `cursorSessionId`.

**Context Pillars (when user says "Checkpoint" or end of task):**  
`objective`, `logicChain`, `gotchas` (array), `stateOfPlay`, `breadcrumbs`, `environmentSpecs`, `dependencyMappings`, `unfinishedRefactors`, `legalComplianceContext`.

**Tab snapshot (open files):**  
`tabSnapshot`: array of file paths, e.g. `["apps/auth/AuthService.ts", "apps/auth/types.ts"]`. Lets you see "what was I working on?" after restart.

**Categorization:**  
`phase`: one of `setup`, `feature`, `refactor`, `bughunt`, `research`.  
`tags`: e.g. `["Bug", "Research"]`.  
`type`: `checkpoint` | `session` | `git`.

**Git (from post-commit hook):**  
`gitCommitHash`, `gitCommitMessage`, `type: "git"`.

### Example: checkpoint with pillars and tab snapshot

```powershell
Invoke-RestMethod -Uri "http://localhost:3847/session" -Method POST -ContentType "application/json" -Body (@{
  type = "checkpoint"
  summary = "Fixed auth types; AuthService still WIP"
  objective = "Unify auth types across apps"
  gotchas = @("Legacy code expects old User shape")
  breadcrumbs = "Next: run e2e for login flow"
  tabSnapshot = @("apps/auth/AuthService.ts", "apps/auth/types.ts")
  phase = "feature"
  tags = @("auth")
  actions = @()
  filesTouched = @("apps/auth/types.ts")
} | ConvertTo-Json -Depth 5)
```

### Example: get refresher (optionally filter by phase/tags)

```powershell
Invoke-RestMethod -Uri "http://localhost:3847/refresher?last=5"
Invoke-RestMethod -Uri "http://localhost:3847/refresher?last=10&phase=research&tags=Bug"
```

### Example: semantic search (e.g. "that weird database error yesterday")

```powershell
Invoke-RestMethod -Uri "http://localhost:3847/search?q=weird%20error%20database&limit=5"
```
(Requires optional deps; see **Vector search** below.)

## Task runner (COCHRAN_TASKS.json)

Cochran can run pending tasks (e.g. Supabase migrations) from `COCHRAN_TASKS.json`. For each task he **reads env from the KeyVault store** (`C:\cevict-live\scripts\keyvault`), then overlays the relevant app’s `.env.local` if present. So secrets must be added via the keystore; `.env.local` can override for local dev.

**Add these keys with the keystore** (so Cochran can run tasks in test or prod):

```powershell
cd C:\cevict-live\scripts\keyvault

# For Accu-Solar (Pro): project ref + run mode
.\set-secret.ps1 -Name COCHRAN_RUN_MODE -Value "prod"
.\set-secret.ps1 -Name SUPABASE_PROJECT_REF_SUPABASE_ACCU_SOLAR -Value "rdbuwyefbgnbuhmjrizo"

# For WTV (test): project ref + run mode
.\set-secret.ps1 -Name SUPABASE_PROJECT_REF_SUPABASE_WTV_TEST -Value "<your-wtv-test-ref>"
```

- **`COCHRAN_RUN_MODE`** — `test` or `prod`. Defaults to `test` if unset.
- **`SUPABASE_PROJECT_REF_<ENV>`** — Supabase project ref for that task’s `env` (e.g. `SUPABASE_PROJECT_REF_SUPABASE_ACCU_SOLAR`).

Cochran resolves the task’s project from the `project` field or `sql_file` path, loads the KeyVault store (same path as KeyVault.psm1), then merges `apps/<project>/.env.local` on top. When a task finishes, the tray shows a balloon so you can check for accuracy.

## Run at startup (laptop always on)

**Option A — Task Scheduler (recommended)**

1. Open Task Scheduler.
2. Create Task: name e.g. `LocalAgentLearner`, run with highest privileges if needed.
3. Trigger: **At log on** (any user or specific user).
4. Action: Start a program  
   - Program: `pwsh.exe` (or `node.exe`)  
   - Arguments: `-NoProfile -Command "cd C:\cevict-live\apps\local-agent; node dist/index.js"`  
   - Start in: `C:\cevict-live\apps\local-agent`
5. Optional: set `LOCAL_AGENT_DATA` in the task’s environment or in a small wrapper script.

**Option B — Shortcut in Startup folder**

1. Create a shortcut that runs:  
   `pwsh.exe -NoProfile -Command "cd C:\cevict-live\apps\local-agent; node dist/index.js"`
2. Put the shortcut in  
   `C:\Users\<You>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

**Option C — Wrapper script**

Create `C:\cevict-live\apps\local-agent\start-agent.ps1`:

```powershell
Set-Location $PSScriptRoot
$env:LOCAL_AGENT_DATA = "C:\Cevict_Vault\local-agent"
node dist/index.js
```

Then point Task Scheduler or the Startup shortcut at this script.

## Check if running and prompt to start (once or twice per day)

If you don’t run Cochran AI at login, you can have Windows **check** a couple of times a day and **ask you** if you want to start it when it’s not running.

1. **Run the scheduler setup once** (from repo root):
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File C:\cevict-live\scripts\cochran-ai-schedule-check.ps1
   ```
   This creates two scheduled tasks: **CochranAiCheckAndPrompt** (9:00 AM) and **CochranAiCheckAndPrompt_2PM** (2:00 PM).

2. **What happens when a task runs:** The script `scripts/cochran-ai-check-and-prompt.ps1` calls `http://localhost:3847/health`. If it gets no response, a dialog appears: **"Cochran AI isn't running. Start it now?"** (Yes/No). If you click Yes, it starts Cochran AI in the background and tells you when it’s up.

3. **Important:** The tasks are created to run **only when you are logged on** so the dialog can appear. To change times or disable: open **Task Scheduler** → **Task Scheduler Library** → find **CochranAiCheck***.

4. **Cursor / agent:** If you try to POST or GET and the service isn’t running, the Cursor rule says to tell you: *"Cochran AI (port 3847) isn’t running; session wasn’t saved"* (or *"Couldn’t load refresher; start Cochran AI if you want continuity"*). So you’ll know when he’s down.

## Vector search (optional)

Semantic search uses **LanceDB** and **Transformers.js** (local embeddings, no API keys). Install optional deps:

```powershell
cd C:\cevict-live\apps\local-agent
pnpm add @lancedb/lancedb @xenova/transformers
pnpm build
```

Then restart the agent. First search (or after many new sessions) may be slow while the model loads. To re-index all sessions: `POST http://localhost:3847/search/rebuild`. Check availability: `GET http://localhost:3847/search/status`.

## Git hook (link commits to memory)

To attach each commit to a memory entry (commit = "what", memory = "why"):

1. In a repo where you want this: create `.git/hooks/post-commit` (no extension).
2. Put in it:  
   `powershell -NoProfile -File C:\cevict-live\scripts\local-agent-git-post-commit.ps1`
3. Make it executable if needed (e.g. `icacls .git/hooks/post-commit /grant Everyone:RX`).

The script POSTs to the local agent with `type: "git"`, `gitCommitHash`, and `gitCommitMessage`. Requires the agent to be running on port 3847.

## Tab snapshot

The agent (or you) can send currently open file paths when posting a session/checkpoint via `tabSnapshot: ["path/to/file1", ...]`. If you use a Cursor task or extension that can read open tabs, wire it to POST to `/session` with `tabSnapshot`. Otherwise, the Cursor rule suggests the agent infer or ask for the list when doing a Checkpoint.

## Debugging / click-through testing (agents)

When you (Cochran AI or any agent) are asked to **run debugging** or **click through the apps** to verify everything works:

1. **Read `docs/AGENT_BUG_REPORTS.md` first** (in the cevict-live repo). Check for Open / To verify items and update the file when you find or fix bugs (include a **Synopsis**: what you did to get the bug).
2. **Follow `docs/AGENT_DEBUGGING_GUIDE.md`:** start the app, use the browser to navigate, **dismiss any Accept / consent / cookie banner first** (snapshot → click Accept by ref), then click through nav and key flows.
3. If you need to **click Cursor’s “Accept” button** for AI suggestions and you have the full local-agent with cursor-accept: `POST http://localhost:3847/cursor-accept/start` to start the watcher (when that build is running).

## Cursor integration

- **Checkpoint / End of session:** POST to `http://localhost:3847/session` with Context Pillars and, when possible, `tabSnapshot`, `phase`, and `tags`. See `.cursor/rules/autonomy-continuity.mdc` for when to do this (e.g. when user says "Checkpoint").
- **Start of session:** GET `http://localhost:3847/refresher?last=5` (optionally `?phase=...&tags=...`) for "what did we do last time?"
- **Semantic search:** GET `http://localhost:3847/search?q=...` for "that weird error we had with the database yesterday."
- **Knowledge:** GET `/knowledge` for apps and doc paths under `C:\gcc` and `C:\cevict-live`.

## Env

- `LOCAL_AGENT_DATA` — Directory for `sessions.json` and `knowledge.json`. Default: `C:\Cevict_Vault\local-agent`.
- `LOCAL_AGENT_PORT` — Port for the HTTP server. Default: `3847`.

## Relation to monorepo local-agent

The full local-agent in `C:\gcc\cevict-app\cevict-monorepo\apps\local-agent` has many more features (Claude, executor, GUI, specialist bots, etc.). **Cochran AI** (this app) is a focused learner: persistence, session store, knowledge index, and refresher API so it can run lightly and reliably whenever the laptop is on. You can later point that full agent at the same data dir or merge Cochran AI into it.
