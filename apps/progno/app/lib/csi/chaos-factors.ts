/**
 * Chaos Sensitivity Index (CSI) - Chaos Factors Catalog
 * Measures game volatility and unpredictability
 */

export interface ChaosFactor {
  id: string;
  name: string;
  description: string;
  impact: number;        // 0 to 1 (how much it increases chaos)
  category: 'weather' | 'rivalry' | 'schedule' | 'roster' | 'context' | 'external';
}

/**
 * Chaos Factors Catalog
 * Each factor increases game volatility
 */
export const CHAOS_FACTORS: ChaosFactor[] = [
  // ==========================================
  // WEATHER FACTORS (Wind > Rain)
  // ==========================================
  {
    id: 'weather_wind_high',
    name: 'High Wind (>20 mph)',
    description: 'Wind > 20 mph kills passing game and field goals',
    impact: 0.40,  // Massive impact - kills deep passing
    category: 'weather',
  },
  {
    id: 'weather_wind_moderate',
    name: 'Moderate Wind (15-20 mph)',
    description: 'Wind 15-20 mph affects throws and kicking',
    impact: 0.20,
    category: 'weather',
  },
  {
    id: 'weather_wind_gusts',
    name: 'Wind Gusts (>35 mph)',
    description: 'Gusts > 35 mph = MAX CHAOS (field goals become coin flips)',
    impact: 0.15,
    category: 'weather',
  },
  {
    id: 'weather_snow',
    name: 'Snow',
    description: 'Snow > Heavy Rain (visibility and traction issues)',
    impact: 0.20,
    category: 'weather',
  },
  {
    id: 'weather_rain_heavy',
    name: 'Heavy Rain',
    description: 'Heavy rain causes fumbles',
    impact: 0.15,
    category: 'weather',
  },
  {
    id: 'weather_rain_light',
    name: 'Light Rain',
    description: 'Light rain minimal impact',
    impact: 0.08,
    category: 'weather',
  },
  {
    id: 'weather_extreme_cold',
    name: 'Extreme Cold',
    description: 'Temperature < 20°F affects player performance',
    impact: 0.12,
    category: 'weather',
  },
  {
    id: 'weather_extreme_heat',
    name: 'Extreme Heat',
    description: 'Temperature > 95°F causes fatigue',
    impact: 0.10,
    category: 'weather',
  },
  {
    id: 'weather_dome_outdoors',
    name: 'Dome Team Outdoors',
    description: 'Dome team playing in outdoor conditions',
    impact: 0.15,
    category: 'weather',
  },

  // ==========================================
  // RIVALRY FACTORS
  // ==========================================
  {
    id: 'rivalry_division',
    name: 'Division Rivalry',
    description: 'Division opponent with history',
    impact: 0.15,
    category: 'rivalry',
  },
  {
    id: 'rivalry_historic',
    name: 'Historic Rivalry',
    description: 'Named rivalry (Iron Bowl, Red River, etc.)',
    impact: 0.18,
    category: 'rivalry',
  },
  {
    id: 'rivalry_playoff_implications',
    name: 'Playoff Implications Rivalry',
    description: 'Rivalry game with playoff stakes',
    impact: 0.12,
    category: 'rivalry',
  },

  // ==========================================
  // SCHEDULE FACTORS
  // ==========================================
  {
    id: 'schedule_short_week',
    name: 'Short Week',
    description: 'Thursday game or < 6 days rest',
    impact: 0.10,
    category: 'schedule',
  },
  {
    id: 'schedule_trap_game',
    name: 'Trap Game',
    description: 'Sandwiched between tough opponents',
    impact: 0.18,
    category: 'schedule',
  },
  {
    id: 'schedule_primetime',
    name: 'Primetime Spotlight',
    description: 'National TV game adds pressure',
    impact: 0.08,
    category: 'schedule',
  },
  {
    id: 'schedule_west_coast_early',
    name: 'West Coast Early Game',
    description: 'West coast team playing 10am PT',
    impact: 0.12,
    category: 'schedule',
  },
  {
    id: 'schedule_east_coast_late',
    name: 'East Coast Late Game',
    description: 'East coast team playing 8pm ET',
    impact: 0.08,
    category: 'schedule',
  },

  // ==========================================
  // ROSTER FACTORS
  // ==========================================
  {
    id: 'roster_new_qb',
    name: 'New Starting QB',
    description: 'Quarterback making first start',
    impact: 0.25,
    category: 'roster',
  },
  {
    id: 'roster_backup_qb',
    name: 'Backup QB Starting',
    description: 'Starting QB injured, backup playing',
    impact: 0.20,
    category: 'roster',
  },
  {
    id: 'roster_new_coach',
    name: 'New Head Coach',
    description: 'First season under new coach',
    impact: 0.15,
    category: 'roster',
  },
  {
    id: 'roster_interim_coach',
    name: 'Interim Coach',
    description: 'Coach fired, interim in place',
    impact: 0.18,
    category: 'roster',
  },
  {
    id: 'roster_key_injury',
    name: 'Key Player Injury',
    description: 'Star player out or questionable',
    impact: 0.15,
    category: 'roster',
  },
  {
    id: 'roster_cluster_injury_ol',
    name: 'OL Cluster Injury',
    description: '2+ offensive linemen out (unit decapitation)',
    impact: 0.30,  // High volatility - offense breaks down
    category: 'roster',
  },
  {
    id: 'roster_cluster_injury_db',
    name: 'DB Cluster Injury',
    description: '2+ defensive backs out (susceptible to big plays)',
    impact: 0.25,  // High volatility - blowout risk
    category: 'roster',
  },
  {
    id: 'roster_cluster_injury_dl',
    name: 'DL Cluster Injury',
    description: '2+ defensive linemen out',
    impact: 0.20,
    category: 'roster',
  },
  {
    id: 'roster_multiple_injuries',
    name: 'Multiple Key Injuries',
    description: '3+ starters out across different units',
    impact: 0.20,
    category: 'roster',
  },

  // ==========================================
  // CONTEXT FACTORS
  // ==========================================
  {
    id: 'context_playoff_implications',
    name: 'Playoff Implications',
    description: 'Must-win for playoff hopes',
    impact: 0.12,
    category: 'context',
  },
  {
    id: 'context_elimination_game',
    name: 'Elimination Game',
    description: 'Win or go home',
    impact: 0.15,
    category: 'context',
  },
  {
    id: 'context_championship_hangover',
    name: 'Championship Hangover',
    description: 'Defending champion early season',
    impact: 0.10,
    category: 'context',
  },
  {
    id: 'context_losing_streak',
    name: 'Desperate Team',
    description: 'Team on 3+ game losing streak',
    impact: 0.08,
    category: 'context',
  },
  {
    id: 'context_underdog_significant',
    name: 'Significant Underdog',
    description: 'Team getting 10+ points',
    impact: 0.10,
    category: 'context',
  },

  // ==========================================
  // EXTERNAL FACTORS
  // ==========================================
  {
    id: 'external_legal_issues',
    name: 'Legal Issues',
    description: 'Player/coach dealing with legal problems',
    impact: 0.12,
    category: 'external',
  },
  {
    id: 'external_contract_dispute',
    name: 'Contract Dispute',
    description: 'Player holdout or contract issues',
    impact: 0.10,
    category: 'external',
  },
  {
    id: 'external_trade_rumors',
    name: 'Trade Rumors',
    description: 'Active trade rumors affecting team',
    impact: 0.08,
    category: 'external',
  },
  {
    id: 'external_media_distraction',
    name: 'Media Distraction',
    description: 'Major off-field story dominating headlines',
    impact: 0.10,
    category: 'external',
  },
];

/**
 * Get chaos factor by ID
 */
export function getChaosFactorById(id: string): ChaosFactor | undefined {
  return CHAOS_FACTORS.find(f => f.id === id);
}

/**
 * Get chaos factors by category
 */
export function getChaosFactorsByCategory(category: ChaosFactor['category']): ChaosFactor[] {
  return CHAOS_FACTORS.filter(f => f.category === category);
}

/**
 * Calculate base volatility for a sport
 */
export function getBaseVolatility(sport: string): number {
  const baseVolatilities: Record<string, number> = {
    'NFL': 0.15,
    'NBA': 0.20,
    'MLB': 0.25,
    'NHL': 0.18,
    'NCAA': 0.22,
    'default': 0.15,
  };

  return baseVolatilities[sport] || baseVolatilities['default'];
}

