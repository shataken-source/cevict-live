# Progno — Folder inventory

Walkthrough of every folder under `apps/progno`. Where purpose is clear, it’s described; otherwise the folder is just listed.

---

## Top-level (apps/progno)

| Folder | What it is |
|--------|------------|
| **app** | Next.js App Router: pages, API routes, UI. |
| **lib** | Shared libs (some duplicated from `app/lib`): api-sports, data-collection, data-sources, db, massagers, odds-sources, backtesting. |
| **components** | Shared React components (admin, ui). |
| **scripts** | TS/JS scripts: run-7day-simulation, probability-analyzer-simulation, syndicate, market-maker runner, compare-simulation-to-actuals, etc. |
| **cron** | Cron job entrypoints (e.g. daily-run). |
| **workers** | Background workers (e.g. simulation queue). |
| **database** | DB schema/migrations (Supabase). |
| **supabase** | Supabase config, `.temp`, `migrations`. |
| **docs** | Docs for cevict-arb-tool, cevict-picks-viewer, cevict-probability-analyzer, Claude effect, database, enhancements, lib (data-collection, data-sources, db), public/banners, scripts/archive. |
| **public** | Static assets: banners, wallboard-assets. |
| **data** | Runtime/data: kaggle/titanic, simulations, tuned-parameters. |
| **types** | Shared TypeScript types. |
| **log** | Log output (if used). |
| **__tests__** | Tests. |
| **.progno** | Local runtime state (keys, cron-jobs, trading-settings, etc.). |
| **.verdent** | Unclear (tool/config). |
| **node_modules** | Dependencies. |
| **.next** / **.turbo** / **.vercel** | Build/cache/deploy. |
| **wallboard** | Standalone wallboard app (e.g. `wallboard/app.js`). |
| **cevict-arb-tool** | Single `index.html` — arb tool UI. |
| **cevict-picks-viewer** | Single `index.html` — picks viewer UI. |
| **cevict-probability-analyzer** | Static bundle: `index.html`, notes (windsurf, what was added, alpha hunter daily card, Kalshi data flow audit, etc.). |
| **Claude effect** | Folder exists; contents not inspected (name has space). |
| **venue_weather** | Docs only: `weather-maps.md` (WeatherAPI maps), `sports-api-data.md`. |
| **enhancements** | Optional enhancements (validator, logger, rate-limiter, strategy-enhancer) per README. |
| **apps** | Nested `apps/progno` (and `.vercel`, `data/kaggle/titanic`) — likely legacy or symlink. |

---

## app/

| Folder | What it is |
|--------|------------|
| **app/api** | All API routes (see below). |
| **app/about** | About page. |
| **app/accuracy** | Accuracy page. |
| **app/arbitrage** | Arbitrage page. |
| **app/contact** | Contact page. |
| **app/create-prediction** | Create-prediction page. |
| **app/cursor-bot-dashboard** | Dashboard for cursor bot. |
| **app/elite-fine-tuner** | Elite fine-tuner UI. |
| **app/kaggle** | Kaggle-related page(s). |
| **app/live-odds** | Live odds page. |
| **app/pick-portfolio** | Pick portfolio page. |
| **app/picks** | Picks page. |
| **app/pricing** | Pricing page. |
| **app/privacy** | Privacy page. |
| **app/promo-tools** | Promo signup (email + source `promo-tools`). |
| **app/progno** | Progno UI: admin (fine-tune, trailervegas), ai-advisor, picks-display, trading-dashboard. |
| **app/single-game** | Single-game page. |
| **app/social** | Social page. |
| **app/terms** | Terms page. |
| **app/trailervegas** | TrailerVegas report page. |
| **app/vegas-analysis** | Vegas analysis page (allowed for ads in adsense-utils). |
| **app/wallboard** | Wallboard page(s). |
| **app/components** | App-specific components (e.g. picks). |
| **app/lib** | App lib: csi, emergent, iai, markets, modules (confidence, data-sources, filters, ranking, signals), narrative, **nig**, odds-sources, schemas, sentiment, temporal. |
| **app/utils** | App utilities. |
| **app/api-pricing** | API pricing (structure). |
| **app/api-sports** | API sports services. |
| **app/scripts** | App-level scripts (e.g. tier-simulation, sim-nfl-2024). |

---

## app/api/ (routes — selected)

| Folder | What it is |
|--------|------------|
| **api/accuracy** | Accuracy API. |
| **api/api-football** | fixtures, standings, team-strength. |
| **api/arb-proxy** | Arb proxy. |
| **api/arbitrage** | Arbitrage API. |
| **api/bot** | **kalshi-training**, **learning** — bot training/learning. |
| **api/cron** | daily-kalshi, daily-predictions, daily-results, daily-results-retry, daily-sms-report, kalshi-settle, news-scraper, sentiment, track-odds. |
| **api/csi** | CSI calculate + route. |
| **api/cursor-bot** | **academy-training**, **worker** — cursor bot (used by `app/lib/autonomous-cursor-bot.ts`). |
| **api/debug-date** | Debug date. |
| **api/early-lines** | early-lines + analysis. |
| **api/emergent** | Emergent API. |
| **api/espn-scores** | ESPN scores. |
| **api/health** | health/progno. |
| **api/historical-odds** | Historical odds. |
| **api/iai** | IAI calculate + route. |
| **api/kaggle** | **titanic** — Kaggle Titanic. |
| **api/kalshi** | submit-picks. |
| **api/kalshi-polymarket** | Kalshi–Polymarket. |
| **api/markets** | arbitrage, kalshi/sports, market-makers, polymarket/sports. |
| **api/narrative** | narrative + calculate. |
| **api/nig** | NIG calculate (used by claude-effect: `api/nig/calculate`). Folder may be empty in source; route may live elsewhere. |
| **api/odds** | Odds API. |
| **api/performance** | Performance API. |
| **api/picks** | live, test, today. |
| **api/progno** | Main progno APIs: admin (cron, data-collection, early-vs-regular, enhanced-early-lines, kalshi-market-status, keys, learning-bot, live-odds, pending-kalshi-bets, reports, run-cron, score-override, syndicate, trading/*, trailervegas/grade, tuning, tuning-config), analyze-game, backtest, daily-card, elite-analyze, kalshi/market, learn, odds, parlay-suggestion, picks, predict, predictions, predictions-file, predictions/[id], predictions/stats, public, simulate, sports/game, teaser-suggestion, v2, wallboard/bets, weekly-learning. |
| **api/public-apis** | **geocode**, **travel-recommendation**, **weather**. |
| **api/sentiment** | sentiment + calculate. |
| **api/serve** | serve/analyzer. |
| **api/simulate** | simulate + yesterday. |
| **api/subscribe** | Subscribe. |
| **api/syndication** | Syndication. |
| **api/temporal** | Temporal API. |
| **api/test** | test + claude-effect. |
| **api/test-odds** | Test odds. |
| **api/trailervegas** | **checkout**, **report**, **webhook**. |
| **api/train** | train + 2024. |
| **api/tv-schedule** | TV schedule. |
| **api/wallboard-assets** | wallboard-assets + [filename]. |
| **api/wallboard-content** | Wallboard content. |

---

## Folders that are unclear or “hiding”

Just listed; purpose not verified or may be legacy/empty:

- **app/api/nig** — Referenced as `api/nig/calculate` by claude-effect; folder may be empty or route elsewhere.
- **app/api/kaggle** (and **app/api/kaggle/titanic**) — Kaggle; may be stub or demo.
- **app/api/cursor-bot** (and **academy-training**, **worker**) — Cursor bot; only ref found was `app/lib/autonomous-cursor-bot.ts`.
- **app/api/bot** (**kalshi-training**, **learning**) — Bot training/learning endpoints.
- **app/api/temporal** — Temporal (workflow?) integration.
- **app/api/public-apis** (**geocode**, **travel-recommendation**, **weather**) — Public API wrappers.
- **app/api/trailervegas** (**checkout**, **report**, **webhook**) — Separate from progno/admin/trailervegas; likely public TrailerVegas flows.
- **app/lib/nig** — NIG lib; glob found 0 files (may be empty or only subdirs).
- **Claude effect** (top-level, name with space) — Contents not inspected.
- **.verdent** — Unknown tool/config.
- **apps** (top-level) — Nested `apps/progno` plus data/kaggle; likely legacy or alternate layout.
- **venue_weather** — Docs only (weather maps, sports API data).
- **cevict-arb-tool** — Single HTML tool.
- **cevict-picks-viewer** — Single HTML viewer.
- **cevict-probability-analyzer** — Static HTML + notes.
- **elite-fine-tuner** (under app/) — UI for elite fine-tuning.
- **promo-tools** (under app/) — Promo email signup page.
- **vegas-analysis** (under app/) — Vegas analysis page.

---

## Summary list (all source-related folders, no node_modules/.next)

Flat list for quick scan:

```
__tests__
app
app/about
app/accuracy
app/api
app/api-pricing
app/api-sports
app/arbitrage
app/components
app/contact
app/create-prediction
app/cursor-bot-dashboard
app/elite-fine-tuner
app/kaggle
app/lib
app/live-odds
app/pick-portfolio
app/picks
app/pricing
app/privacy
app/promo-tools
app/progno
app/scripts
app/single-game
app/social
app/terms
app/trailervegas
app/vegas-analysis
app/wallboard
apps
cevict-arb-tool
cevict-picks-viewer
cevict-probability-analyzer
Claude effect
components
cron
data
database
docs
enhancements
lib
log
public
scripts
supabase
types
venue_weather
wallboard
workers
```

(+ all subfolders under **app/api**, **app/lib**, **app/progno**, **docs**, **lib**, **data**, **scripts**, **supabase** as in the tables above.)
