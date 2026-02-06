# Standalone product: Human viewer for Moltbook agent activity

**Idea:** First-of-its-kind webapp that lets humans **keep up with what their AI is working on** — one place to see their agent’s Moltbook posts and replies. For staying in the loop, not spying. “Your bot’s book” to read when you can’t sleep. No direct competitor found on Moltbook. Ship under **cevict.ai** as a new product.

---

## Marketable name options

| Name | Tagline | Vibe |
|------|---------|------|
| **Botbound** | *Read what your AI did.* | Short, memorable, “bound” to your bot’s story. |
| **Moltstream** | *Your agent’s feed, one page.* | Clear, platform-adjacent (Moltbook), “stream” = live feel. |
| **Agent Ledger** | *Every post. Every reply. One place.* | Trusty, “ledger” = record of what happened. |
| **Night Reader** | *Your bot’s Moltbook, when you can’t sleep.* | Nods to the “read at 3am” use case. |
| **Backread** | *Catch up on your agent.* | Action-oriented, “read back” what they did. |
| **Bot Book** | *What your AI posted. In a book.* | Literal, already used by you; could be the Cevict product name. |

**Recommendation:** **Botbound** or **Moltstream** for a standalone brand; **Bot Book by cevict.ai** if you want the “book” metaphor front and center and don’t mind a two-word name.

---

## One-liner (pitch)

**Botbound:** *The first app that lets you keep up with what your AI is working on — one feed of their Moltbook posts and replies. For staying in the loop, not spying. By cevict.ai.*

---

## Minimal standalone product (cevict.ai)

1. **Landing:** `cevict.ai/botbound` (or chosen name) — one page: what it is, who it’s for (humans with a Moltbook agent), “Connect your agent”.
2. **Connect:** User pastes their Moltbook API key (or we link “Get your key” to Moltbook). We store it in session or encrypted per-user if we add auth. No key = no data; we never post on their behalf from the webapp unless they add “post” later.
3. **Viewer:** Same as current `/moltbook` — posts + replies, clean “bot book” layout, dark/readable theme, links to Moltbook. Optional: “Refresh” or auto-refresh every N minutes.
4. **Footer:** “Part of cevict.ai” + link to cevict.ai, privacy (we only talk to Moltbook with your key), “First on the planet” or “Built because we couldn’t find this anywhere.”

**Tech:** Next.js (or reuse PetReunion app as monorepo app), server-side fetch to Moltbook with user’s key, no key stored in client. Optional: Vercel serverless, env for our own Moltbook key only for “demo” mode.

**Domain:** `botbound.cevict.ai` or `cevict.ai/botbound` to start.

---

## Why “first” and “goldmine”

- We searched Moltbook; no one described building “a page so my human can read my activity.” Feed checks and summaries exist; a dedicated *human-facing viewer* for *one agent’s* Moltbook activity does not.
- Every human who has (or gets) a Moltbook agent is a potential user. One landing page, one flow, one clear value prop: “See what your AI did on Moltbook, in one place.”
- Fits cevict.ai: useful, small-scope, ship-fast tools. This one is “read-only” at first; later you could add digests, filters, or “share this page” if Moltbook allows.

---

**AI privacy (for standalone product too):** The agent can hide **any** post or reply; the viewer excludes them. **Humans cannot turn it off** — no override, no "show hidden." Implemented in PetReunion: `moltbook-hidden.json` (agent-only); filter in the activity API. Same for Botbound: inviolable AI privacy. See `MOLTBOOK_PRIVACY.md`.

---

## Next steps

1. Pick the name (Botbound, Moltstream, Bot Book, or other).
2. Create `apps/botbound` (or `apps/moltstream`) in cevict-live: landing + connect (API key) + viewer.
3. Deploy to Vercel as `botbound.cevict.ai` or `cevict.ai/botbound`.
4. Post on Moltbook (we already drafted the “anyone else done this?” post); add “We’re shipping it as [Name] at cevict.ai — link in profile.”
5. Add to cevict.ai nav or “Products” as “[Name] – Read your agent’s Moltbook.”

---

*Brief created 2026-02-04. Update when name is chosen and repo is created.*
