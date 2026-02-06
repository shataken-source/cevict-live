/**
 * API-SPORTS Integration - Main Export
 * 
 * Complete integration with:
 * - API-Sports client for game/team/injury data
 * - Multi-source odds comparison
 * - Complete Claude Effect (all 7 phases)
 * - Live game tracking
 * - Accuracy tracking
 */

// Client
export * from './client'

// Services
export { syncTeams, syncAllTeams, syncStandings } from './services/team-sync'
export { syncInjuries, syncAllInjuries, getTeamInjuryImpact } from './services/injury-sync'
export { syncH2H, calculateNarrativeMomentum } from './services/h2h-sync'
export { MultiSourceOddsService } from './services/multi-source-odds'
export { LiveGameTracker, getLiveTracker } from './services/live-tracker'
export { AccuracyTracker, getAccuracyTracker } from './services/accuracy-tracker'

// Claude Effect Engine (lives in data-sources; re-export for api-sports consumers)
export { 
  CompleteClaudeEffectEngine, 
  getClaudeEffectEngine,
  type ClaudeEffectInput,
  type ClaudeEffectResult 
} from '../data-sources/claude-effect-complete'

