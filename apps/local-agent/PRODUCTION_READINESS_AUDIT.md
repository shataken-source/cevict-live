Local-Agent / Cochran AI – Production Readiness Audit
======================================================

Date: 2026-02-11

Scope: `apps/local-agent` (Cochran AI / learner bot on port 3847).

---

1. Threat model & exposure
--------------------------

- **Intended use:** Single-user **local** service on your laptop/desktop, not an internet-facing API.
- **Data stored:** High-level summaries of coding sessions, Context Pillars (objective, logicChain, gotchas, breadcrumbs, unfinishedRefactors, etc.), tab snapshots (file paths), and optional git hook info (commit hash/message). No external APIs or cloud writes; all data is on disk under `LOCAL_AGENT_DATA` (default `C:\Cevict_Vault\local-agent`).
- **Server binding:** `app.listen(PORT)` (Express default) binds to all interfaces. On a typical Windows dev machine behind a firewall, this is effectively localhost-only, but **if ports are opened on the LAN**, other machines could call `/session`, `/sessions`, `/knowledge`, `/tasks/run`.

**Recommendation (critical if you ever expose the machine):**
- Treat port **3847** as **local-only**. Keep Windows Firewall rules locked down so only localhost can reach it.
- If you ever harden further, change the server to bind explicitly to `127.0.0.1` or use a firewall rule pinned to loopback.

---

2. API surface
--------------

Endpoints (no auth by design, assuming localhost-only):

- `GET /health` – Status + dataDir
- `POST /session` – Append a session/checkpoint/git entry to `sessions.json`
- `GET /refresher` – Last N sessions (optionally filtered by phase/tags/type)
- `GET /sessions` – List sessions (last N)
- `GET /knowledge` – Read `knowledge.json`
- `POST /knowledge/rebuild` – Re-run `build-knowledge` scan
- `GET /store` – Return data dir path
- `GET /search` – Semantic search over stored sessions (optional vector deps)
- `GET /search/status` – Whether vector search is available
- `POST /search/rebuild` – Re-index sessions into vector store
- `POST /tasks/run` – Run pending `COCHRAN_TASKS.json` entries (task runner)

**Notes / risks:**
- Because there is no auth, **any process on the machine** can POST sessions or trigger `tasks/run`. For a single-user dev laptop this is acceptable; for multi-user or shared machines you should:
  - Keep port 3847 firewalled from other users/containers.
  - Avoid running untrusted software on the same box that could spam `/session` or `/tasks/run`.

---

3. Data handling & persistence
------------------------------

- `LOCAL_AGENT_DATA` drives where data lives; default:
  - Windows: `C:\Cevict_Vault\local-agent`
  - Other: `$HOME/.local-agent`
- Files:
  - `sessions.json` – Append-only structure `{ sessions: SessionEntry[] }`, truncated to last **500** entries when writing.
  - `knowledge.json` – Index of apps/docs built by `build-knowledge`.
  - Optional `lancedb/` directory (vector DB) if vector search is enabled.

**Strengths:**
- Fully offline; easy to back up (copy one folder).
- Hard cap of 500 sessions prevents unbounded file growth.

**Considerations:**
- There is no built-in **encryption** at rest; if the laptop disk is not full-disk-encrypted, session summaries and Context Pillars are visible to anyone with OS-level access.
- If you need stronger guarantees, run on a disk with BitLocker or equivalent and/or keep `LOCAL_AGENT_DATA` on an encrypted volume.

---

4. Task runner (COCHRAN_TASKS.json)
-----------------------------------

- `POST /tasks/run` and a periodic timer both call `runPendingTasks()`:
  - Tasks are read from `COCHRAN_TASKS.json` at the repo root.
  - Task runner resolves env from KeyVault (`scripts/keyvault` store) and overlays the target app’s `.env.local`.
  - Uses Supabase project refs like `SUPABASE_PROJECT_REF_SUPABASE_ACCU_SOLAR`, gated by `COCHRAN_RUN_MODE` (`test` vs `prod`).

**Key safety points:**
- Real **secrets are never stored in this app**; they live in the KeyVault store and per-app `.env.local`.
- The README already calls out:
  - Set `COCHRAN_RUN_MODE` explicitly (`test` by default).
  - Keep task definitions narrow and targeted (e.g. specific migrations).

**Recommendations:**
- For production-ish use of task runner:
  - Keep `COCHRAN_RUN_MODE=test` unless you are intentionally running against prod.
  - Review `COCHRAN_TASKS.json` before enabling `tasks/run` on a new machine.
  - If you don’t need autonomous tasks, you can block `/tasks/run` behind a local shell alias instead of exposing it to other tools.

---

5. Vector search and knowledge index
------------------------------------

- **Vector search**:
  - Optional; requires installing `@lancedb/lancedb` + `@xenova/transformers`.
  - Runs fully locally; no API keys or external calls.
  - `/search/status` and `/search/rebuild` give explicit control over when embeddings are built.
- **Knowledge index**:
  - `build-knowledge` scans `C:\gcc` and `C:\cevict-live` and writes a summary index (`knowledge.json`).
  - No raw file contents are stored in sessions; knowledge index paths and summaries refer to files, not entire contents.

**Recommendations:**
- If repository paths change (e.g. you move `C:\gcc`), re-run `build-knowledge` and confirm `knowledge.json` is still valid.
- If vector search is slower than desired, you can disable it by skipping optional deps; `/search` will return 503 with a clear message.

---

6. Env & configuration
----------------------

From `README.md` and `env.manifest.json`:

- Local-agent specific:
  - `LOCAL_AGENT_DATA` – directory for `sessions.json` and `knowledge.json` (default vault path).
  - `LOCAL_AGENT_PORT` – HTTP port (default 3847).
  - `COCHRAN_START_TRAY` – set to `0` to disable auto-launch of Electron tray.
- Task runner / Supabase integration:
  - `COCHRAN_RUN_MODE` – `test` or `prod` (defaults to `test` if unset).
  - `SUPABASE_PROJECT_REF_SUPABASE_ACCU_SOLAR`, `SUPABASE_PROJECT_REF_SUPABASE_WTV_TEST` – project refs for tasks.

**Recommendation:**
- For “production” use on your own machine:
  - Pin `LOCAL_AGENT_PORT` and `LOCAL_AGENT_DATA` explicitly in `.env.local` for predictability.
  - Keep `COCHRAN_RUN_MODE` set correctly and document any additional `SUPABASE_PROJECT_REF_*` you add.

---

7. Reliability & startup
------------------------

- README documents three startup patterns:
  - Task Scheduler at logon (recommended).
  - Startup folder shortcut.
  - Wrapper script (`start-agent.ps1`) that sets `LOCAL_AGENT_DATA` then runs `node dist/index.js`.
- There is a **check-and-prompt** scheduled task (via `scripts/cochran-ai-schedule-check.ps1`) that:
  - Hits `http://localhost:3847/health`.
  - If down, prompts: “Cochran AI isn’t running. Start it now?” and starts it on **Yes**.

This is already solid for a developer workstation.

---

8. Summary checklist
--------------------

| Item | Status |
|------|--------|
| Service bound to local machine only (firewall/loopback) | ⚠️ Ensure via firewall or bind strategy |
| Session data stored in fixed, known dir (`LOCAL_AGENT_DATA`) | ✅ |
| No external API keys (fully offline; vector search optional) | ✅ |
| Task runner gated by `COCHRAN_RUN_MODE` and KeyVault | ✅ (use with care) |
| Scheduled startup (at logon) configured | ⚠️ Optional but recommended |
| Disk encryption / OS-level protection for vault directory | ⚠️ Depends on OS setup |

Overall, local-agent / Cochran AI is **safe to run as a local, offline helper** as long as:
- Port 3847 remains effectively local-only.
- You understand that `sessions.json` contains summaries of your work and is protected by OS- and disk-level security, not by the app itself.

