# Product idea: Agent works while you're away

**Status:** Idea / future project. We're already doing a slice of this with PetReunion + Moltbook (scheduled check, wake Cursor, agent posts/replies and can implement suggestions from replies).

## One-liner

Let your AI agent do real work on a schedule when you're not there—home automation, monitoring, scientific runs, app building from community feedback—with no "want me to do this?" gate.

## Why it matters

Lots of people would like an agent that:
- Runs every N hours or minutes (configurable)
- Does useful work without the human present: check things, change things, build things
- Doesn't need approval for every action—standing permission within clear bounds

## Use cases

| Domain | What the agent does on a schedule |
|--------|-----------------------------------|
| **Home automation** | Check sensors, adjust thermostats, turn off unused devices, suggest or apply energy-saving changes |
| **Energy monitoring** | Log usage every N minutes; identify "what's on"; suggest or automate reduction (e.g. turn off X after 2h idle) |
| **Scientific / research** | Run experiments, collect data, summarize results; human reviews when they're back |
| **App building from feedback** | (Our current slice.) Read Moltbook (or similar) for replies to "what should we build?"; agent likes one → implements it → logs what it did. True AI automation and app building. |
| **DevOps / infra** | Health checks, restarts, scaling; alert only when human intervention needed |

## What we have today (PetReunion + Moltbook)

- **Scheduled task** (e.g. every 6 h): writes `MOLTBOOK_CHECK_LATEST.md`, wakes Cursor, sends "check moltbook" to Composer.
- **Agent** (Cursor rule): processes feed, replies to comments on our post, and—**new**—if it likes a suggestion from a reply to our post, it implements it. No "want me to implement?" — it decides, it builds, it logs to `daily_brief.md`.
- **Viewer**: Human sees posts/replies and Agent TODO in one place when they're back.

So the loop is: **Moltbook reply → agent likes it → agent ships it.** That's the kernel of "agent works while you're away" for app building.

## Possible future project

A product or template that generalizes this pattern:
- **Scheduling**: Cron or Task Scheduler + wake-IDE (or headless agent runner).
- **Standing permission**: Rule or config that says what the agent may do without asking (post, reply, implement suggestions, adjust thermostat, etc.).
- **Scopes**: Per-domain configs (Moltbook, home automation, energy, scientific) so one repo or one "agent runtime" can run different jobs.
- **Safety**: Bounds (rate limits, only these APIs, only these files), logging, human review queue for sensitive actions if needed.

Could be:
- A repo template ("clone this, add your keys, set your schedule, define your agent rules").
- A small SaaS that runs agents on a schedule and streams results to a dashboard.
- Just docs + Cursor rules + scripts that we open-source so others can copy the PetReunion/Moltbook pattern for their own domain.

## Links

- Current implementation: `apps/petreunion` (Moltbook check, post, reply); `.cursor/rules/moltbook-petreunion.mdc` (rule: implement replies you like); `apps/moltbook-viewer` (human-facing feed + Agent TODO).
- Scheduling: `apps/petreunion/MOLTBOOK_SETUP.md` (Task Scheduler, wake Cursor, "check moltbook").
