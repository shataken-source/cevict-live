# Progno Module System

Drop a new file in the right folder, register it in `module-registry.ts`. Nothing else changes.

## Folder Structure

```
app/lib/modules/
├── types.ts                  ← All interfaces (SignalModule, FilterModule, etc.)
├── module-registry.ts        ← THE ONLY FILE YOU EDIT to add/swap modules
├── pick-engine.ts            ← Core orchestrator (don't edit unless changing pipeline)
│
├── signals/                  ← Add new signal sources here
│   ├── true-edge-signal.ts
│   ├── claude-effect-signal.ts
│   └── home-away-bias-signal.ts
│
├── confidence/               ← Swap to change how signals combine into a %
│   └── mc-confidence.ts
│
├── filters/                  ← Add new drop conditions here
│   ├── odds-range-filter.ts
│   ├── league-floor-filter.ts
│   └── home-only-filter.ts
│
├── data-sources/             ← Add new game data providers here
│   ├── the-odds-data-source.ts
│   └── api-sports-data-source.ts
│
└── ranking/                  ← Swap to change sort/cap logic
    └── composite-ranking.ts
```

---

## Adding a New Signal (most common task)

1. Create `app/lib/modules/signals/my-signal.ts`:

```ts
import type { SignalModule, GameContext, SignalOutput } from '../types'

export class MySignal implements SignalModule {
  readonly id = 'my-signal'
  readonly name = 'My Signal Name'
  readonly async = true  // set false if no API calls

  async analyze(ctx: GameContext): Promise<SignalOutput> {
    // ctx has: homeTeam, awayTeam, sport, homeOdds, awayOdds,
    //          homeNoVigProb, awayNoVigProb, mcResult, spreadPoint, etc.

    const delta = 3.5  // confidence points to add/subtract

    return {
      confidenceDelta: delta,
      favors: 'home',           // 'home' | 'away' | 'neutral'
      reasoning: ['My signal reason shown in pick analysis'],
      scores: { myScore: delta },  // optional sub-scores for transparency
    }
  }
}
```

2. Register it in `module-registry.ts`:

```ts
import { MySignal } from './signals/my-signal'

export const SIGNAL_MODULES: SignalModule[] = [
  new TrueEdgeSignal(),
  new ClaudeEffectSignal(),
  new HomeAwayBiasSignal(),
  new MySignal(),   // ← add here
]
```

That's it. The engine picks it up automatically.

---

## Adding a New Filter

```ts
// app/lib/modules/filters/my-filter.ts
import type { FilterModule, FilterContext } from '../types'

export class MyFilter implements FilterModule {
  readonly id = 'my-filter'
  readonly description = 'Drop picks that fail my condition'

  passes({ confidence, ctx, isHomePick }: FilterContext): boolean {
    return confidence >= 60  // return false to DROP the pick
  }
}
```

Register in `module-registry.ts` under `FILTER_MODULES`.

---

## Swapping the Confidence Formula

Replace `CONFIDENCE_MODULE` in `module-registry.ts`:

```ts
import { MyConfidenceModule } from './confidence/my-confidence'
export const CONFIDENCE_MODULE = new MyConfidenceModule()
```

Your module receives `{ ctx, baseConfidence, signals, isHomePick }` and returns a number 0–100.

---

## Signal Output Contract

| Field | Type | Description |
|-------|------|-------------|
| `confidenceDelta` | `number` | Confidence points to add (positive) or subtract (negative) |
| `favors` | `'home' \| 'away' \| 'neutral'` | Which team this signal supports |
| `reasoning` | `string[]` | Human-readable reasons shown in pick analysis |
| `scores` | `Record<string, number>` | Optional named sub-scores for transparency |

**Never throw** — return `{ confidenceDelta: 0, favors: 'neutral', reasoning: [] }` on error.

---

## Signal Trace in Pick Output

Every pick now includes `signal_trace`:

```json
{
  "signal_trace": {
    "true-edge":       { "delta": 3.2, "favors": "home", "scores": { "totalEdge": 0.04 } },
    "claude-effect":   { "delta": 1.1, "favors": "home", "scores": { "SF": 0.06, "IAI": 0.03 } },
    "home-away-bias":  { "delta": 5.0, "favors": "home", "scores": { "boost": 5 } }
  },
  "active_signals": ["true-edge", "claude-effect", "home-away-bias"],
  "active_filters": ["odds-range", "league-floor", "home-only"]
}
```

---

## Planned Modules (not yet built — drop in when ready)

| Module | Type | What it does |
|--------|------|-------------|
| `InjuryReportSignal` | Signal | Scrapes ESPN injury reports, adjusts confidence |
| `WeatherSignal` | Signal | OpenWeather API for outdoor sports |
| `RestAdvantageSignal` | Signal | Days since last game, B2B detection |
| `SharpMoneySignal` | Signal | Betting splits from ScrapingBee |
| `EarlyLineDecayFilter` | Filter | Reduces confidence for games >2 days out |
| `BackToBackFilter` | Filter | Penalizes teams on B2B schedule |
| `EspnDataSource` | DataSource | ESPN odds as tertiary fallback |
