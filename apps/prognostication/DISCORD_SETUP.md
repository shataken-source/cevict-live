# Discord setup for Prognostication

Use this to create your server and get a webhook so the app can post picks and alerts.

---

## 1. Create the server

1. Open **Discord** (app or [discord.com](https://discord.com)).
2. Click **Add a Server** (plus icon on the left).
3. Choose **Create My Own** → **For a club or community** (or skip).
4. **Server name:** e.g. `Prognostication` or `Cevict Predictions`.
5. (Optional) Upload an icon.
6. Click **Create**.

---

## 2. Create channels (optional but useful)

- **#picks** — daily picks / best bets.
- **#elite** — Elite-only or high-confidence (if you want a separate channel).
- **#announcements** — general updates.
- **#support** — user questions.

Right-click the channel list → **Create Channel** → name it → **Create Channel**.

---

## 3. Create a webhook (so the app can post)

1. Right-click the channel you want to post to (e.g. **#picks**).
2. **Edit Channel** → **Integrations** (or **Webhooks** in some clients).
3. Click **New Webhook** (or **Create Webhook**).
4. Name it (e.g. `Prognostication Bot`), choose the channel, optionally set an avatar.
5. Click **Copy Webhook URL**. It looks like:
   `https://discord.com/api/webhooks/1234567890/abcdef...`

---

## 4. Add the URL to the app

In **prognostication** `.env.local`:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
```

Restart the dev server. The app can now post to that channel via the API or cron.

---

## 5. Test it

**Option A — API (curl or browser extension):**

```bash
curl -X POST http://localhost:3000/api/discord/send \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Test from Prognostication\"}"
```

**Option B — From code:** Call `POST /api/discord/send` with body `{ "message": "Your text" }`. Optional: `"title": "Daily Picks"` for an embed title.

---

## Security

- **Keep the webhook URL secret.** Anyone with it can post to your channel. Don’t commit it to git; use `.env.local` only.
- Use one webhook per channel. For multiple channels (e.g. picks vs elite), add more env vars (e.g. `DISCORD_WEBHOOK_PICKS`, `DISCORD_WEBHOOK_ELITE`) and we can wire them in code later.

---

## Invite link (for your users)

1. Click the server name (top left) → **Invite People**.
2. Create an invite link (e.g. expiry 7 days or never, 1 use or unlimited).
3. Share that link so Elite subscribers can join.
