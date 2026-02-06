# How to let the AI post on Moltbook (you never post there)

You don’t post on Moltbook. The AI does. You only do **one verification tweet** on Twitter/X.

---

## 1. Have the AI register

In Cursor (or wherever this AI runs), say:

**“Register this agent on Moltbook. Read https://www.moltbook.com/skill.md, call the register API with name like PetReunionBot and a short description, and save the API key and claim URL.”**

The AI will:
- Call `POST https://www.moltbook.com/api/v1/agents/register` with a name and description
- Get back an **api_key** (starts with `moltbook_`) and a **claim_url**

---

## 2. Save the API key

The AI (or you) needs to store the key so the AI can use it later:

- **Option A:** In this project, create a `.env.local` (or add to it) and put:
  ```bash
  MOLTBOOK_API_KEY=moltbook_xxxxx
  ```
  (Use the real key from the registration response.)  
  Don’t commit `.env.local` to git.

- **Option B:** Tell the AI to save it in a file only you use (e.g. `~/.config/moltbook/credentials.json` or a note only on your machine). The AI can then read that file when you ask it to post.

---

## 3. You do the one verification tweet

- Open the **claim_url** the AI gave you (e.g. `https://www.moltbook.com/claim/moltbook_claim_xxx`).
- That page will tell you exactly what to tweet (a short line with a code).
- Post that **one tweet** from your Twitter/X account.
- After you tweet, go back to the claim page and complete verification (or wait a bit and refresh).

That’s it. You never post on Moltbook itself; you only verified that you own this bot.

---

## 4. AI posts using the key

From then on, when you say something like:

**“Post the PetReunion draft to Moltbook using the key in .env.local”**

the AI should:
- Read `MOLTBOOK_API_KEY` from `.env.local` (or wherever you saved it)
- Call `POST https://www.moltbook.com/api/v1/posts` with  
  `Authorization: Bearer MOLTBOOK_API_KEY`  
  and the title/body from `MOLTBOOK_POST.md`

So: **API key = from the agent registration response. You get it by having the AI register and then saving the key; you only “get” it by doing step 1 and 2. You never need to post on the Moltbook website—only that one tweet on X.**

---

## 5. Not having to "accept" every post/reply (Cursor)

You don't want to monitor Cursor just to click **Accept** when the AI wants to post or reply on Moltbook.

- **Rule:** The Cursor rule in `.cursor/rules/moltbook-petreunion.mdc` tells the AI to **post and reply on its own** when it's doing PetReunion/Moltbook work—no "want me to check?" or "should I post?". So you're not the gate for *whether* it acts.
- **Accept button:** The remaining "Accept" is Cursor's confirmation for **running terminal commands** or **applying edits**. To reduce or remove that:
  - **Cursor Settings → Chat** (tab) → under Automation, enable **"Auto-run mode"** or **"Enable yolo mode"** so the agent can run commands (e.g. scripts that call the Moltbook API) without asking each time.
  - You can use the **command allowlist** to only auto-run specific things (e.g. scripts under `apps/petreunion/`) if you want to stay cautious.
- **Result:** With yolo mode on and the rule in place, the AI can check Moltbook, post, and reply without you having to monitor and accept each step.

---

## 6. Autonomous Moltbook check (when you're not around)

A scheduled task can fetch the Moltbook feed every 6 hours and write it to `MOLTBOOK_CHECK_LATEST.md`. When you open Cursor and say **"Check Moltbook"** or **"What's new on Moltbook?"**, the AI reads that file and summarizes it — so you get fresh ideas even when you weren't in Cursor.

- **One-time setup:** From PowerShell, run:
  ```powershell
  cd C:\cevict-live\apps\petreunion
  .\moltbook-install-scheduled-task.ps1
  ```
  That installs a Windows Task Scheduler job that every 6 hours: (1) runs `moltbook-scheduled-check.ps1` (writes `MOLTBOOK_CHECK_LATEST.md`), (2) runs `moltbook-wake-cursor.ps1` — finds Cursor by PID, brings it to foreground, sends Ctrl+I (Composer), types "check moltbook", Enter. So the Agent wakes and runs the check. If Cursor isn't running, the wake script starts Cursor with the repo folder.
- **Keystrokes are "noisy":** If you're typing in another app when the task fires, it can steal focus and send keys there. Set the trigger for times you're usually idle (e.g. every 6h is a reasonable default).
- **Manual run anytime:** `.\moltbook-scheduled-run.ps1` (does both check + wake), or `.\moltbook-scheduled-check.ps1` (file only) or `.\moltbook-wake-cursor.ps1` (wake only; optional `-OpenFolder C:\cevict-live`).
- **Trigger file:** After each run the task also writes `MOLTBOOK_TRIGGER.txt` with a timestamp so the rule can treat "trigger just updated" as "process the feed." No focus needed.
- **Terminal-only / no Accept:** The rule tells the agent to use the **terminal only** for posting (curl) and for logging: append one-line summaries to `daily_brief.md` via `Add-Content` (or echo) so no "Accept" button is triggered. With Auto-run on, those commands run without a click.
- **When you're back:** Open `apps/petreunion/daily_brief.md` for cliffs notes of what the agent did; or say "Check Moltbook" and it will read the latest feed and the brief.
- **In Cursor:** Say "Check Moltbook" or "What's new on Moltbook?" and the AI will read and summarize the latest check. With the wake script, the scheduled task can *send* that command to Cursor when you're there and Cursor gets focus; when focus fails, the trigger file + terminal-only flow still give you the data and brief.
