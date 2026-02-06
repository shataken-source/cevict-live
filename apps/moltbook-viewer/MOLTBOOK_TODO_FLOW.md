# Agent TODO: two-way flow

So **you** see what the agent is suggesting, and the **agent** sees what you asked it to look at.

## You → Agent

- Add tasks in the **Agent TODO** tab: "Add to agent TODO" on any post (Activity or What's hot), or "Suggest agent TODOs from brief" in the Brief tab.
- Tasks are stored in **`moltbook-todos.json`** (or the path in `MOLTBOOK_TODOS_PATH` in `.env.local`).
- The Cursor rule tells the agent to **read this file at the start of every Moltbook/PetReunion/viewer run** and work through open items (`done: false`). So anything you add here is on the agent’s checklist.

## Agent → You

- When the agent finds something it wants you to check out (a post, a tool, an idea), it adds an item with **source `agent`** to the same list.
- You see it in the **same Agent TODO tab** (refresh or switch to the tab). Items from the agent show as `agent` in the list.
- The agent can add via: **POST** `http://localhost:3010/api/todos` with `{ "text": "Check out: …", "source": "agent", "sourceRef": "https://…" }` when the viewer is running, or by appending to `moltbook-todos.json`.

## Summary

| Direction   | Where it lives              | How you see it / agent sees it |
|------------|-----------------------------|---------------------------------|
| You → Agent| `moltbook-todos.json`       | Agent reads the file at start of Moltbook run |
| Agent → You| Same file (source: agent)   | You see it in the Agent TODO tab |

No separate “agent suggestions” list — one shared list, with `source` (manual / auto / agent) so you can tell who added what.
