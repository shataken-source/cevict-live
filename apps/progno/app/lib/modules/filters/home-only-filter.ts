/**
 * Filter: Home Only Mode
 * When HOME_ONLY_MODE=1, drops all away picks.
 * Backtest: home picks +67% ROI vs away -19% ROI (2024 full season).
 * Disable by setting HOME_ONLY_MODE=0 in .env.local.
 */

import type { FilterModule, FilterContext } from '../types'

const HOME_ONLY = process.env.HOME_ONLY_MODE !== '0' && process.env.HOME_ONLY_MODE !== 'false'

export class HomeOnlyFilter implements FilterModule {
  readonly id = 'home-only'
  readonly description = 'Drop away picks when HOME_ONLY_MODE is enabled'

  passes({ isHomePick }: FilterContext): boolean {
    if (!HOME_ONLY) return true
    return isHomePick
  }
}
