/**
 * Chaos Sensitivity Index (CSI) Calculator
 * Calculates game volatility and adjusts confidence
 */

import { CHAOS_FACTORS, ChaosFactor, getBaseVolatility } from './chaos-factors';
import { RefereeAnalyzer } from './referee-analyzer';

export interface ChaosContext {
  sport: string;
  weather?: {
    temperature?: number;
    conditions?: string;
    windSpeed?: number;
    windGusts?: number;
    precipitationType?: 'none' | 'rain' | 'heavy_rain' | 'snow';
  };
  schedule?: {
    isShortWeek?: boolean;
    isTrapGame?: boolean;
    isPrimetime?: boolean;
    daysRest?: number;
    travelLag?: {
      fromTimezone: string;
      toTimezone: string;
      kickoffTime: string; // Local time
    };
  };
  roster?: {
    newQB?: boolean;
    backupQB?: boolean;
    newCoach?: boolean;
    interimCoach?: boolean;
    keyInjuries?: number;
    clusterInjuries?: {
      offensiveLine?: number;  // Number of OL starters out
      defensiveBacks?: number; // Number of DB starters out
      defensiveLine?: number; // Number of DL starters out
    };
  };
  context?: {
    playoffImplications?: boolean;
    eliminationGame?: boolean;
    isUnderdog?: boolean;
    pointSpread?: number;
  };
  rivalry?: {
    isDivisionRivalry?: boolean;
    isHistoricRivalry?: boolean;
  };
  referee?: {
    crewId?: string;
    crewName?: string;
    homeTeamStyle?: {
      reliesOnHolding?: boolean;
      defensiveStyle?: 'aggressive' | 'conservative';
    };
  };
  external?: {
    legalIssues?: boolean;
    contractDisputes?: boolean;
    tradeRumors?: boolean;
    mediaDistraction?: boolean;
  };
}

export interface CSIResult {
  csiScore: number;           // 0 to 1 (higher = more chaotic)
  baseVolatility: number;
  activeFactors: Array<{
    factor: ChaosFactor;
    detected: boolean;
    reason: string;
  }>;
  confidencePenalty: number;  // How much to reduce confidence (0 to 0.5)
  recommendation: 'play' | 'caution' | 'avoid';
  warnings: string[];
}

/**
 * CSI Calculator
 */
export class CSICalculator {
  private refereeAnalyzer: RefereeAnalyzer;

  constructor() {
    this.refereeAnalyzer = new RefereeAnalyzer();
  }

  /**
   * Calculate Chaos Sensitivity Index
   */
  calculate(context: ChaosContext): CSIResult {
    const baseVolatility = getBaseVolatility(context.sport);
    const activeFactors: CSIResult['activeFactors'] = [];
    let compoundChaos = baseVolatility;

    const warnings: string[] = [];

    // 1. WEATHER FACTORS (Wind > Rain)
    if (context.weather) {
      const { temperature, conditions, windSpeed, windGusts, precipitationType } = context.weather;

      // Wind (MOST IMPORTANT - kills passing game)
      if (windSpeed) {
        if (windSpeed > 20) {
          const factor = CHAOS_FACTORS.find(f => f.id === 'weather_wind_high')!;
          activeFactors.push({
            factor,
            detected: true,
            reason: `Wind speed: ${windSpeed} mph - kills passing game`,
          });
          compoundChaos += factor.impact;
          warnings.push(`💨 HIGH WIND (${windSpeed} mph) - Passing game severely impacted`);
        } else if (windSpeed > 15) {
          const factor = CHAOS_FACTORS.find(f => f.id === 'weather_wind_moderate')!;
          activeFactors.push({
            factor,
            detected: true,
            reason: `Wind speed: ${windSpeed} mph`,
          });
          compoundChaos += factor.impact;
        }
      }

      // Wind Gusts (MAX CHAOS)
      if (windGusts && windGusts > 35) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'weather_wind_gusts')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: `Wind gusts: ${windGusts} mph - field goals become coin flips`,
        });
        compoundChaos += factor.impact;
        warnings.push(`🌪️ EXTREME GUSTS (${windGusts} mph) - MAX CHAOS`);
      }

      // Precipitation (Snow > Heavy Rain > Light Rain)
      if (precipitationType) {
        if (precipitationType === 'snow') {
          const factor = CHAOS_FACTORS.find(f => f.id === 'weather_snow')!;
          activeFactors.push({
            factor,
            detected: true,
            reason: `Snow - visibility and traction issues`,
          });
          compoundChaos += factor.impact;
          warnings.push('❄️ Snow game - High volatility expected');
        } else if (precipitationType === 'heavy_rain') {
          const factor = CHAOS_FACTORS.find(f => f.id === 'weather_rain_heavy')!;
          activeFactors.push({
            factor,
            detected: true,
            reason: `Heavy rain - fumble risk`,
          });
          compoundChaos += factor.impact;
        } else if (precipitationType === 'rain') {
          const factor = CHAOS_FACTORS.find(f => f.id === 'weather_rain_light')!;
          activeFactors.push({
            factor,
            detected: true,
            reason: `Light rain`,
          });
          compoundChaos += factor.impact;
        }
      }

      // Extreme cold
      if (temperature && temperature < 20) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'weather_extreme_cold')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: `Temperature: ${temperature}°F`,
        });
        compoundChaos += factor.impact;
      }

      // Extreme heat
      if (temperature && temperature > 95) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'weather_extreme_heat')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: `Temperature: ${temperature}°F`,
        });
        compoundChaos += factor.impact;
      }
    }

    // 2. RIVALRY FACTORS
    if (context.rivalry) {
      if (context.rivalry.isHistoricRivalry) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'rivalry_historic')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'Historic rivalry game',
        });
        compoundChaos += factor.impact;
      } else if (context.rivalry.isDivisionRivalry) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'rivalry_division')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'Division rivalry',
        });
        compoundChaos += factor.impact;
      }
    }

    // 3. SCHEDULE FACTORS
    if (context.schedule) {
      if (context.schedule.isShortWeek || (context.schedule.daysRest && context.schedule.daysRest < 6)) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'schedule_short_week')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: `Days rest: ${context.schedule.daysRest || '< 6'}`,
        });
        compoundChaos += factor.impact;
      }

      if (context.schedule.isTrapGame) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'schedule_trap_game')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'Trap game setup',
        });
        compoundChaos += factor.impact;
        warnings.push('⚠️ Trap game detected - High unpredictability');
      }

      if (context.schedule.isPrimetime) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'schedule_primetime')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'Primetime game',
        });
        compoundChaos += factor.impact;
      }
    }

    // 4. ROSTER FACTORS
    if (context.roster) {
      if (context.roster.newQB) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'roster_new_qb')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'New QB making first start',
        });
        compoundChaos += factor.impact;
        warnings.push('🚨 New starting QB - Highest volatility factor');
      } else if (context.roster.backupQB) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'roster_backup_qb')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'Backup QB starting',
        });
        compoundChaos += factor.impact;
      }

      if (context.roster.interimCoach) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'roster_interim_coach')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'Interim coach',
        });
        compoundChaos += factor.impact;
      } else if (context.roster.newCoach) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'roster_new_coach')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'New head coach',
        });
        compoundChaos += factor.impact;
      }

      // CLUSTER INJURIES (Unit Decapitation)
      if (context.roster.clusterInjuries) {
        const { offensiveLine, defensiveBacks, defensiveLine } = context.roster.clusterInjuries;

        // OL Cluster (HIGHEST IMPACT - offense breaks down)
        if (offensiveLine && offensiveLine >= 2) {
          const factor = CHAOS_FACTORS.find(f => f.id === 'roster_cluster_injury_ol')!;
          activeFactors.push({
            factor,
            detected: true,
            reason: `${offensiveLine} offensive linemen out - unit decapitation`,
          });
          compoundChaos += factor.impact;
          warnings.push(`🚨 OL CLUSTER INJURY: ${offensiveLine} starters out - offense breaks down`);
        }

        // DB Cluster (blowout risk)
        if (defensiveBacks && defensiveBacks >= 2) {
          const factor = CHAOS_FACTORS.find(f => f.id === 'roster_cluster_injury_db')!;
          activeFactors.push({
            factor,
            detected: true,
            reason: `${defensiveBacks} defensive backs out - big play risk`,
          });
          compoundChaos += factor.impact;
          warnings.push(`⚠️ DB CLUSTER INJURY: ${defensiveBacks} starters out - susceptible to big plays`);
        }

        // DL Cluster
        if (defensiveLine && defensiveLine >= 2) {
          const factor = CHAOS_FACTORS.find(f => f.id === 'roster_cluster_injury_dl')!;
          activeFactors.push({
            factor,
            detected: true,
            reason: `${defensiveLine} defensive linemen out`,
          });
          compoundChaos += factor.impact;
        }
      }

      // General injuries
      if (context.roster.keyInjuries) {
        if (context.roster.keyInjuries >= 3) {
          const factor = CHAOS_FACTORS.find(f => f.id === 'roster_multiple_injuries')!;
          activeFactors.push({
            factor,
            detected: true,
            reason: `${context.roster.keyInjuries} key players out`,
          });
          compoundChaos += factor.impact;
        } else if (context.roster.keyInjuries > 0) {
          const factor = CHAOS_FACTORS.find(f => f.id === 'roster_key_injury')!;
          activeFactors.push({
            factor,
            detected: true,
            reason: `${context.roster.keyInjuries} key player(s) out`,
          });
          compoundChaos += factor.impact;
        }
      }
    }

    // 5. CONTEXT FACTORS
    if (context.context) {
      if (context.context.eliminationGame) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'context_elimination_game')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'Elimination game',
        });
        compoundChaos += factor.impact;
      } else if (context.context.playoffImplications) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'context_playoff_implications')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'Playoff implications',
        });
        compoundChaos += factor.impact;
      }

      if (context.context.isUnderdog && context.context.pointSpread && Math.abs(context.context.pointSpread) >= 10) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'context_underdog_significant')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: `Underdog by ${Math.abs(context.context.pointSpread)} points`,
        });
        compoundChaos += factor.impact;
      }
    }

    // 6. REFEREE VARIANCE (Judicial Chaos)
    if (context.referee?.crewId) {
      const refImpact = this.refereeAnalyzer.analyze(
        context.referee.crewId,
        context.referee.homeTeamStyle
      );

      if (refImpact && refImpact.chaosContribution > 0) {
        compoundChaos += refImpact.chaosContribution * 0.15; // Weight: 15%
        activeFactors.push({
          factor: {
            id: 'referee_variance',
            name: 'Referee Variance',
            description: refImpact.reasoning.join('; '),
            impact: refImpact.chaosContribution,
            category: 'external',
          },
          detected: true,
          reason: `Ref crew: ${refImpact.crew.name} - ${refImpact.reasoning[0]}`,
        });

        if (refImpact.chaosContribution > 0.15) {
          warnings.push(`⚖️ Referee variance detected: ${refImpact.reasoning.join('; ')}`);
        }
      }
    }

    // 7. TRAVEL LAG (Contextual Chaos)
    if (context.schedule?.travelLag) {
      const { fromTimezone, toTimezone, kickoffTime } = context.schedule.travelLag;

      // Calculate time difference
      const timeDiff = this.calculateTimeZoneDifference(fromTimezone, toTimezone, kickoffTime);

      if (Math.abs(timeDiff) >= 3) {
        // 3+ hour difference = significant body clock impact
        compoundChaos += 0.12;
        activeFactors.push({
          factor: {
            id: 'travel_lag',
            name: 'Travel Body Clock Lag',
            description: `Traveling ${timeDiff > 0 ? 'east' : 'west'} ${Math.abs(timeDiff)} hours`,
            impact: 0.12,
            category: 'schedule',
          },
          detected: true,
          reason: `${Math.abs(timeDiff)} hour timezone difference`,
        });

        if (timeDiff < -3) {
          warnings.push(`🕐 West Coast team playing early (body clock ${Math.abs(timeDiff)} hours behind)`);
        }
      }
    }

    // 8. EXTERNAL FACTORS
    if (context.external) {
      if (context.external.legalIssues) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'external_legal_issues')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'Legal issues affecting team',
        });
        compoundChaos += factor.impact;
      }

      if (context.external.contractDisputes) {
        const factor = CHAOS_FACTORS.find(f => f.id === 'external_contract_dispute')!;
        activeFactors.push({
          factor,
          detected: true,
          reason: 'Contract disputes',
        });
        compoundChaos += factor.impact;
      }
    }

    // Apply compound formula: CSI = base × (1 + sum of factors)
    // But cap at 1.0 (100% chaos)
    const csiScore = Math.min(1.0, compoundChaos);

    // Calculate confidence penalty
    // Higher chaos = lower confidence
    // CSI 0.35+ = reduce confidence by 50%
    // CSI 0.25-0.35 = reduce confidence by 30%
    // CSI 0.15-0.25 = reduce confidence by 15%
    let confidencePenalty = 0;
    if (csiScore >= 0.50) {
      confidencePenalty = 0.50;
      warnings.push('🚨 EXTREME CHAOS - Reduce bet size significantly or avoid');
    } else if (csiScore >= 0.35) {
      confidencePenalty = 0.30;
      warnings.push('⚠️ HIGH CHAOS - Reduce bet size');
    } else if (csiScore >= 0.25) {
      confidencePenalty = 0.15;
    } else if (csiScore >= 0.20) {
      confidencePenalty = 0.08;
    }

    // Generate recommendation
    let recommendation: 'play' | 'caution' | 'avoid';
    if (csiScore >= 0.50) {
      recommendation = 'avoid';
    } else if (csiScore >= 0.35) {
      recommendation = 'caution';
    } else {
      recommendation = 'play';
    }

    return {
      csiScore,
      baseVolatility,
      activeFactors,
      confidencePenalty,
      recommendation,
      warnings,
    };
  }

  /**
   * Calculate timezone difference impact
   */
  private calculateTimeZoneDifference(
    fromTZ: string,
    toTZ: string,
    kickoffTime: string
  ): number {
    // Simplified - would use proper timezone library in production
    // Returns hours difference (positive = east, negative = west)

    // Example: PST to EST = +3 hours
    const tzMap: Record<string, number> = {
      'PST': -8,
      'MST': -7,
      'CST': -6,
      'EST': -5,
    };

    const fromOffset = tzMap[fromTZ] || 0;
    const toOffset = tzMap[toTZ] || 0;

    return toOffset - fromOffset;
  }
}

