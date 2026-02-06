# Env keys reference

Use these **exact** names in `.env.local` (prognostication or progno) so the apps can find your keys.

---

## Odds (The Odds API — the-odds-api.com)

Used by **Progno** for live odds and picks.

| Key name | Where used |
|----------|------------|
| `ODDS_API_KEY` | Progno picks, cron results, live odds (primary) |
| `NEXT_PUBLIC_ODDS_API_KEY` | Fallback if `ODDS_API_KEY` not set |

---

## Open Weather (openweathermap.org)

Used by **Progno** data collection (e.g. weather collector).

| Key name | Where used |
|----------|------------|
| `OPENWEATHER_API_KEY` | `lib/data-collection/weather-collector.ts` (primary) |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` | Fallback in `lib/data-collection/config.ts` |

---

## Sinch (SMS)

Used by **Progno** for SMS (alerts, daily picks, etc.).

| Key name | Where used |
|----------|------------|
| `SINCH_SERVICE_PLAN_ID` | Your Sinch service plan ID |
| `SINCH_API_TOKEN` | Sinch API token |
| `SINCH_FROM` | Sender number (e.g. `+1234567890`) |

---

## Supabase (prognostication + alpha-hunter)

| Key name | Where used |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (optional for some flows) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; Kalshi picks, trades, stats, admin |

---

## Progno base URL (prognostication app)

| Key name | Where used |
|----------|------------|
| `PROGNO_BASE_URL` | Prognostication calls Progno for Cevict Flex picks (e.g. `http://localhost:3008`) |

---

## Discord (prognostication)

| Key name | Where used |
|----------|------------|
| `DISCORD_WEBHOOK_URL` | Post picks/alerts to a Discord channel (see `DISCORD_SETUP.md`) |

---

## Optional

| Key name | Where used |
|----------|------------|
| `NEXT_PUBLIC_KALSHI_REFERRAL_CODE` | Prognostication “View on Kalshi” links |
| `SPORTSDATA_IO_KEY` | Progno arb proxy (Cevict Arb Tool) |
| `CRON_SECRET` | Progno cron routes (daily predictions/results) |
