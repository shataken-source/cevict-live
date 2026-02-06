# Progno daily automation (predictions + results)

Two cron endpoints replace manual 8am predictions and midnight results:

| Job | Endpoint | What it does |
|-----|----------|--------------|
| **Daily predictions** | `GET /api/cron/daily-predictions` | Runs Cevict Flex (`/api/picks/today`), writes **`predictions-YYYY-MM-DD.json`** in the app root. |
| **Daily results** | `GET /api/cron/daily-results` | Reads `predictions-YYYY-MM-DD.json` (yesterday by default), fetches scores from Odds API, grades win/lose, writes **`results-YYYY-MM-DD.json`**. |

---

## 1. Vercel Cron (if you deploy to Vercel)

Already configured in **`vercel.json`** (times in **UTC**):

- **8:00 UTC** → daily-predictions
- **6:00 UTC** → daily-results (was 0:00 UTC; moved so US games have finished and Odds API has scores — 6 UTC ≈ 1 AM Eastern)

To use your local time, adjust the cron expression (e.g. 8am Eastern ≈ `0 13 * * *` in UTC).

No extra auth needed: Vercel sends `x-vercel-cron: 1` and the routes allow it.

---

## 2. Windows Task Scheduler (local / self-hosted)

Your app must be running (e.g. `npm run dev` or a production process on port 3008). Then trigger the endpoints at 8am and 12am.

### Option A: PowerShell one-liners

Create two scheduled tasks:

**8:00 AM – generate predictions**

```powershell
# Run daily at 8:00 AM
$url = "http://localhost:3008/api/cron/daily-predictions"
$secret = $env:CRON_SECRET  # or set a fixed value
Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $secret" }
```

**12:00 AM (midnight) – grade results**

```powershell
# Run daily at 12:00 AM
$url = "http://localhost:3008/api/cron/daily-results"
$secret = $env:CRON_SECRET
Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $secret" }
```

### Option B: Batch + Task Scheduler

1. **Set `CRON_SECRET`** (optional but recommended): in `.env.local` add `CRON_SECRET=your-secret`. If you don’t set it, the routes accept any request (only use when the server isn’t exposed).
2. Create two tasks in Task Scheduler:
   - **Trigger:** Daily at 8:00 AM. **Action:** Start a program → `powershell.exe` → Arguments: `-NoProfile -Command "Invoke-RestMethod -Uri 'http://localhost:3008/api/cron/daily-predictions' -Headers @{ Authorization = 'Bearer YOUR_SECRET' }"`.
   - **Trigger:** Daily at 12:00 AM. **Action:** Same with `/api/cron/daily-results`.
3. Ensure the app is running at those times (e.g. run as a service or keep a terminal open).

### Option C: Call without secret (dev only)

If you didn’t set `CRON_SECRET`, you can call without a header:

```powershell
Invoke-RestMethod -Uri "http://localhost:3008/api/cron/daily-predictions"
Invoke-RestMethod -Uri "http://localhost:3008/api/cron/daily-results"
```

---

## 3. Manual / one-off

**Predictions (today):**

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3008/api/cron/daily-predictions"
```

**Results (grade yesterday’s predictions):**

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "http://localhost:3008/api/cron/daily-results"
```

Grade a specific date:

```text
http://localhost:3008/api/cron/daily-results?date=2026-02-02
```

---

## 4. File formats

- **predictions-YYYY-MM-DD.json**
  - `date`, `generatedAt`, `count`, `picks` (array from Cevict Flex: `home_team`, `away_team`, `pick`, `confidence`, `sport`, etc.).

- **results-YYYY-MM-DD.json**
  - `date`, `gradedAt`, `results` (each pick + `status`: `win` | `lose` | `pending`, `actualWinner`, `actualScore`), `summary` (`total`, `correct`, `pending`, `winRate`).

Your previous `predictions-2026-02-02.json` was one prediction per game (v2 shape). The new pipeline writes the **top Cevict Flex picks** (same as `/api/picks/today`). If you want one prediction per game again, you can keep using `get-predictions.ps1` (now using Cevict Flex via v2) and point the **results** cron at that file format; the daily-results route expects `picks[]` with `home_team`, `away_team`, `pick`, `sport`/`league`, which both formats provide.
