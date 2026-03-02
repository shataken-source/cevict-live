/**
 * Filter: Home Only Mode
 * Reads from getTuningConfigSync() when set (admin fine-tune), else env.
 */

import type { FilterModule, FilterContext } from '../types'
import { getTuningConfigSync } from '@/app/lib/tuning-config'

function isHomeOnly(): boolean {
  const config = getTuningConfigSync()
  if (config && config.HOME_ONLY_MODE !== undefined)
    return config.HOME_ONLY_MODE === '1' || config.HOME_ONLY_MODE === true || config.HOME_ONLY_MODE === 'true'
  return process.env.HOME_ONLY_MODE === '1' || process.env.HOME_ONLY_MODE === 'true'
}

export class HomeOnlyFilter implements FilterModule {
  readonly id = 'home-only'
  readonly description = 'Drop away picks when HOME_ONLY_MODE is enabled'

  passes({ isHomePick }: FilterContext): boolean {
    if (!isHomeOnly()) return true
    return isHomePick
  }
}
