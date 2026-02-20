/**
 * Filter: Odds Range
 * Drops picks outside the configured moneyline odds window.
 * Backtest: -200 to +500 captures most alpha; extreme favorites/dogs lose money.
 */

import type { FilterModule, FilterContext } from '../types'

const MIN_ODDS = Number(process.env.PROGNO_MIN_ODDS ?? -200)
const MAX_ODDS = Number(process.env.PROGNO_MAX_ODDS ?? 500)

export class OddsRangeFilter implements FilterModule {
  readonly id = 'odds-range'
  readonly description = `Odds must be between ${MIN_ODDS} and ${MAX_ODDS}`

  passes({ odds }: FilterContext): boolean {
    return odds >= MIN_ODDS && odds <= MAX_ODDS
  }
}
