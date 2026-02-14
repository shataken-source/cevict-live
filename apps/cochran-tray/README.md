# Cochran AI system tray (standalone — deprecated)

**The tray is now built into `apps/local-agent`.** Run `pnpm run tray` from `apps/local-agent` instead. This standalone app is kept for reference only.

---

Small Electron app that sits in the Windows **system tray** (taskbar, hidden icons area) and shows Cochran AI status.

## What it does

- **Icon**
  - **Normal (teal C):** Cochran AI is running (health check returns 200).
  - **Error (red X):** Cochran AI is not responding (down, timeout, or error).

- **Right‑click menu**
  - **Turn Cochran On** – Starts Cochran AI via `apps/local-agent/start-agent.ps1`.
  - **Turn Cochran Off** – Stops the process listening on the Cochran port (default 3847).
  - **Start schedule task…** – Runs `scripts/cochran-ai-schedule-check.ps1` (create/edit scheduled tasks).
  - **Create / edit scheduled tasks** – Opens Windows Task Scheduler.
  - **Ask Cochran (open Refresher)** – Opens `http://localhost:3847/refresher?last=10` in the browser.
  - **What's wrong?** – Balloon: if running, shows health response; if not, explains and suggests starting from tray or `apps/local-agent`.
  - **Exit** – Quits the tray app (does not stop Cochran AI).

Health is polled every 15 seconds; the icon and tooltip update automatically.

## Run

```powershell
cd C:\cevict-live\apps\cochran-tray
pnpm install
pnpm start
```

The icon appears in the taskbar (often under the ^ “Show hidden icons”). Right‑click for the menu.

## Env

- `LOCAL_AGENT_PORT` – Default `3847`. Must match the port Cochran AI uses.
