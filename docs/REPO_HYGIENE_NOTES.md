# Repo hygiene / safe-mode cleanup notes

This file exists so we always remember **why the repo stays clean** and what we changed to get it there.

## What happened (timeline)

- **Progno moved into this repo** (so deployments come from `C:\cevict-live`, not legacy copies)
  - Commit: `f254c93` (`progno: bring app into apps/ and harden cron routes`)

- **“Safe mode” cleanup** (temporary)
  - We used `git stash push -u` to save work in progress, but Windows file locks caused “Permission denied” warnings for some untracked folders.
  - Fix was to:
    - confirm the stash exists, then
    - run `git reset --hard HEAD` to restore tracked files, and
    - hide stubborn untracked folders locally via `.git/info/exclude` (local only).

- **Permanent cleanup** (shared + committed)
  - We added permanent ignore rules to the **root** `.gitignore` so large/local-only folders don’t constantly appear as untracked.
  - Commit: `91dc14b` (`chore: ignore local-only large folders`)

## Permanent ignore rules (root `.gitignore`)

These folders are intentionally ignored because they behave like separate repos / large local workspaces and cause noise, stash failures, and accidental commits:

- `NBA-Machine-Learning-Sports-Betting/`
- `Polymarket-Kalshi-Arbitrage-bot/`
- `cloud-orchestrator/`
- `keeks/`
- `old-cevict-monorepo/` (legacy copy; avoid deploying from it)

If one of these *should* be tracked again later, remove it from `.gitignore` and then decide whether it should be:
- moved under a clearer location (e.g. `external/`), or
- converted into a git submodule, or
- split into its own repo entirely.

## “Safe mode” commands (reversible)

### Save everything (including untracked)

```bash
git stash push -u -m "safe-mode: clean working tree"
```

### Restore saved work

```bash
git stash pop stash@{0}
```

### If Windows locks prevent cleanup

If you see many lines like “failed to remove … Permission denied”, you can still get clean by:

```bash
git reset --hard HEAD
```

Then use **local-only excludes** (not committed) for whatever remains noisy:

- File: `.git/info/exclude`
- Add folder patterns there temporarily.

## Repo rules we’re following

- **Secrets never committed**: no real API keys in code/docs; env vars go in Vercel or `vault\\secrets`.
- **One app per commit** when possible (e.g., Progno work stays isolated).
- **Deploy roots point at `C:\cevict-live`** and the correct `apps/<app>` folder, not legacy copies.

