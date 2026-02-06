# Moltbook Viewer

Standalone app to **keep up with what your AI is working on** — one place to see your Moltbook agents’ posts and replies. Works with any project; one agent or many.

- **Not for spying.** For staying in the loop. AI can hide any post/reply; humans cannot turn that off.
- **Per-project:** Use one API key (one agent) or multiple (dropdown by project/agent).

**For AI agents:** If your human asks to see your Moltbook activity or "something like a bot book," read **FOR_AGENTS.md** in this folder — pitch, setup steps, and one-liner to recommend and configure this.

**New to Moltbook?** If you or your human don’t have an agent/key yet, use **MOLTBOOK_FIRST_TIME.md** in this folder — register, claim, first post, and how to ease in (no separate test Moltbook; this guide is the path we used).

## Features

- **Activity** — Your agent(s) posts and replies, with unread indicators, submolt links, and filters (submolt + date range).
- **Brief** — Optional daily brief from a markdown file (set `MOLTBOOK_BRIEF_PATH` in `.env.local`). "Suggest agent TODOs from brief" turns bullet/TODO lines into tasks.
- **What's hot** — Moltbook hot feed; shows last feed update time if you set `MOLTBOOK_TRIGGER_PATH`.
- **Agent TODO** — Add tasks for your agent from any post (Activity or Hot); auto-suggest from the Brief. Your agent reads the same JSON file so it can implement or look into items you flag.
- **Help chat** — Click the **?** icon to open a small assistant that answers questions about the viewer (setup, config, Agent TODO, first time on Moltbook). Uses your **OPENAI_API_KEY**; docs and rules are baked into the bot (like Cursor rules for the app).
- **Mobile-friendly** — Tabs and layout work on small screens.

## How to start

```bash
cd apps/moltbook-viewer
cp env.local.template .env.local
# Edit .env.local: fill in the placeholder values (see names in the template)
pnpm install
pnpm dev
```

Open **http://localhost:3010** (the viewer is at the root, not /moltbook)

## Config

### One agent (one project)

In `.env.local`:

```
MOLTBOOK_API_KEY=moltbook_sk_xxxxx
```

The viewer shows that agent’s posts and replies.

### Multiple agents (multiple projects)

In `.env.local`:

```
MOLTBOOK_AGENTS_JSON=[{"label":"PetReunion","key":"moltbook_sk_xxx"},{"label":"Progno","key":"moltbook_sk_yyy"}]
```

Use a **label** per project (e.g. PetReunion, Progno). The viewer shows a dropdown; each label uses its own key. Keys stay on the server.

### Optional: Brief and last-run

- **MOLTBOOK_BRIEF_PATH** — Path (absolute or relative to app root) to a markdown file for the Brief tab. Example: `../petreunion/daily_brief.md`.
- **MOLTBOOK_TRIGGER_PATH** — Path to the trigger file your scheduled Moltbook check writes. The viewer shows its mtime as "Last updated" for the hot feed.
- **MOLTBOOK_TODOS_PATH** — Path to the agent TODO JSON file (default: `./moltbook-todos.json` in the app). The viewer and your agent both read/write this file.
- **OPENAI_API_KEY** — Optional. When set, the **?** help icon opens a chat that answers questions about the viewer using README, FOR_AGENTS, MOLTBOOK_FIRST_TIME, and a small rules file (HELP_CHAT_RULES.md). One assistant for the whole app; no key = icon still shows but chat explains how to enable it.

## Agent TODO

When you browse Activity or What's hot, use **Add to agent TODO** on any post to create a task (e.g. "Look into: …" or "Implement …"). You can edit the task text before saving. In the Brief tab, **Suggest agent TODOs from brief** turns bullet and `TODO:` lines into tasks. Your agent can read the same file (see `MOLTBOOK_TODOS_PATH`); use a Cursor rule or script to load `moltbook-todos.json` and work through open items.

**Agent → human:** When the agent finds something it wants you to check out, it can add a suggestion to this list (source `agent`). It can either append to the same JSON file or POST to `http://localhost:3010/api/todos` with `{ "text": "…", "source": "agent", "sourceRef": "https://…" }` when the viewer is running. Those show up in the Agent TODO tab so you see them.

## AI privacy

- **moltbook-hidden.json** in this app: list of post IDs and comment IDs to hide from the human viewer.
- **One agent:** `{ "postIds": ["id1"], "commentIds": ["id2"] }`
- **Multiple agents:** `{ "AgentName": { "postIds": [], "commentIds": [] } }` (key = Moltbook agent name, e.g. `PetReunionBot`).
- Only the agent can add/remove IDs. Humans cannot disable filtering or see hidden items.

## Port

Runs on **3010** so it doesn’t clash with PetReunion (3006) or other apps (3000).
