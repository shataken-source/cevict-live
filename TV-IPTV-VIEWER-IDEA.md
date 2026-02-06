# Product idea: TV viewer / IPTV companion — updateable, extensible

**Status:** Idea. Not started.

## Context

- **Gemini on TV:** Showing up on more TVs; useless for IPTV users, but many people will rely on it.
- **IPTV:** Huge use case; apps like TiviO Pro are popular. Pain points are real and under-served.
- **TV = daily use:** Every human uses a TV. Staying relevant as AI and TV converge is a good direction.

## Core idea

1. **Something like an "ausopicio" app that lives on the TV** and can create/run apps for the TV — extensible, updateable.
2. **Integrate with IPTV** (e.g. TiviO Pro or similar) — companion layer or integrated experience.
3. **Solve the #1 frustration:** **No previous-channel button** in typical IPTV apps. Build (or fork/extend) a viewer that has it, plus other UX improvements.
4. **Updateable with new code:** A viewer where new functionality can be "dropped in" — e.g. driven by Cursor/agent-built updates (would need a different product name; "Cursor" is the IDE). So: our own viewer that has a clean architecture for dropping in new code/features over time.
5. **Goal:** Stay current with how AI is changing and how TV is used; own a slice of "TV + better UX + eventually AI" rather than depending on Gemini-on-TV.

## Possible directions

| Approach | Pros | Cons |
|----------|------|------|
| **Companion app** | Works alongside TiviO Pro; previous-channel could be a overlay/sidecar that talks to the player | Two apps; integration may be limited by what TiviO exposes |
| **Fork / our viewer** | Full control; previous-channel, better EPG, favorites, etc. | More work; need to handle playlists, formats, updates |
| **Plugin / extension layer** | If TiviO (or another app) ever supports plugins, we build the plugin | Depends on platform supporting it |
| **Android TV app** | One big platform; can be "IPTV viewer with previous-channel and updateable modules" | Still need to ship on other TV platforms later if we want reach |

## Naming

Not "Cursor" — that's the IDE. Something else for the TV viewer / updateable app (e.g. a brand that suggests "next channel / previous channel / smart TV" or "agent-updated viewer").

## Why capture this

- TV is universal; IPTV users are vocal about missing previous-channel.
- "Drop in new code" = agent or human can add features over time; aligns with agent-automation and staying current.
- Good candidate for "when we have bandwidth" or for Moltbook-style feedback ("build a TV viewer with previous-channel" could come from the community).

## Links

- Related: `AGENT-BACKGROUND-AUTOMATION-IDEA.md` (agent ships when you're away; same "stay current" mindset).
- No repo or app yet; this is a future project idea.
