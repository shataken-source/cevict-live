/**
 * PROGNO MODULE REGISTRY
 * ─────────────────────────────────────────────────────────────────────────────
 * To add a new signal: create a file in app/lib/modules/signals/,
 * import it here, and push it into SIGNAL_MODULES.
 *
 * To swap confidence formula: replace CONFIDENCE_MODULE.
 * To add a filter: push into FILTER_MODULES.
 * To add a data source: push into DATA_SOURCE_MODULES (sorted by priority).
 */

import type {
  SignalModule,
  ConfidenceModule,
  FilterModule,
  DataSourceModule,
  RankingModule,
} from './types'

import { TrueEdgeSignal } from './signals/true-edge-signal'
import { ClaudeEffectSignal } from './signals/claude-effect-signal'
import { HomeAwayBiasSignal } from './signals/home-away-bias-signal'
import { ProbabilityAnalyzerSignal } from './signals/probability-analyzer-signal'
// Cevict prediction analyzer: 16-model ensemble, wired into pipeline and evaluateFlip().
import { MCConfidenceModule } from './confidence/mc-confidence'
import { OddsRangeFilter } from './filters/odds-range-filter'
import { LeagueFloorFilter } from './filters/league-floor-filter'
import { HomeOnlyFilter } from './filters/home-only-filter'
import { CompositeRankingModule } from './ranking/composite-ranking'
import { TheOddsDataSource } from './data-sources/the-odds-data-source'
import { ApiSportsDataSource } from './data-sources/api-sports-data-source'

// ── Signal modules (run in order; all outputs merged) ─────────────────────────
const _probabilityAnalyzer = new ProbabilityAnalyzerSignal()

export const SIGNAL_MODULES: SignalModule[] = [
  new TrueEdgeSignal(),
  new ClaudeEffectSignal(),
  new HomeAwayBiasSignal(),
  _probabilityAnalyzer,
  // Drop new signals here — no other file needs to change:
  // new InjuryReportSignal(),
  // new WeatherSignal(),
  // new RestAdvantageSignal(),
  // new SharpMoneySignal(),
]

// Cevict prediction analyzer — exported for pick-engine to call evaluateFlip() after value bet override.
export const PROBABILITY_ANALYZER = _probabilityAnalyzer

// ── Confidence formula (swap to change how signals combine) ───────────────────
export const CONFIDENCE_MODULE: ConfidenceModule = new MCConfidenceModule()

// ── Filters (all must pass; order matters — cheap checks first) ───────────────
export const FILTER_MODULES: FilterModule[] = [
  new OddsRangeFilter(),
  new LeagueFloorFilter(),
  new HomeOnlyFilter(),
  // new EarlyLineDecayFilter(),
  // new BackToBackFilter(),
]

// ── Data sources (tried in priority order; first success wins) ────────────────
export const DATA_SOURCE_MODULES: DataSourceModule[] = [
  new TheOddsDataSource(),    // priority 1
  new ApiSportsDataSource(),  // priority 2 (fallback)
]

// ── Ranking (sorts + caps final pick list) ────────────────────────────────────
export const RANKING_MODULE: RankingModule = new CompositeRankingModule()
