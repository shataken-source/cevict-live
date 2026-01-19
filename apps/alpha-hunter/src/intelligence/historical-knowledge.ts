/**
 * HISTORICAL KNOWLEDGE BASE
 * Comprehensive historical data and patterns for all trading bots
 *
 * Covers: Crypto, Economics, Politics, Sports, Weather, Entertainment
 */

// ANSI Colors
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[95m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
  bgBlue: '\x1b[44m',
  black: '\x1b[30m',
};

// ============================================================================
// CRYPTO HISTORICAL KNOWLEDGE
// ============================================================================

export const CRYPTO_HISTORY = {
  // Bitcoin Halving Cycles
  halvingCycles: {
    events: [
      { date: '2012-11-28', blockReward: '25 BTC', priceAtHalving: 12, peakAfter: 1100, daysToTop: 371 },
      { date: '2016-07-09', blockReward: '12.5 BTC', priceAtHalving: 650, peakAfter: 19783, daysToTop: 526 },
      { date: '2020-05-11', blockReward: '6.25 BTC', priceAtHalving: 8600, peakAfter: 69000, daysToTop: 546 },
      { date: '2024-04-20', blockReward: '3.125 BTC', priceAtHalving: 63800, peakAfter: null, daysToTop: null },
    ],
    patterns: [
      'Bull run typically starts 6-12 months post-halving',
      'Peak occurs ~18 months after halving',
      'Bear market bottoms ~12 months after peak',
      'Each cycle peak is lower multiple of previous (diminishing returns)',
      'Pre-halving rally common 2-3 months before',
    ],
  },

  // Major Market Events
  majorEvents: [
    { date: '2013-12-05', event: 'China bans financial institutions from Bitcoin', impact: -50 },
    { date: '2014-02-28', event: 'Mt. Gox bankruptcy', impact: -60 },
    { date: '2017-09-04', event: 'China ICO ban', impact: -30 },
    { date: '2017-12-17', event: 'CME Bitcoin futures launch', impact: -70 }, // marked top
    { date: '2020-03-12', event: 'COVID crash (Black Thursday)', impact: -50 },
    { date: '2021-05-19', event: 'China mining ban', impact: -50 },
    { date: '2021-11-10', event: 'All-time high $69K', impact: 0 }, // cycle top
    { date: '2022-05-09', event: 'LUNA/UST collapse', impact: -40 },
    { date: '2022-11-08', event: 'FTX collapse', impact: -25 },
    { date: '2024-01-10', event: 'Bitcoin ETF approval', impact: +20 },
  ],

  // Seasonality patterns
  seasonality: {
    january: { avg: -5, description: 'Post-holiday correction common' },
    february: { avg: +8, description: 'Recovery month historically' },
    march: { avg: +5, description: 'Mixed, tax season selling' },
    april: { avg: +15, description: 'Strong month, halving hype' },
    may: { avg: -10, description: '"Sell in May" effect' },
    june: { avg: -5, description: 'Summer doldrums begin' },
    july: { avg: +10, description: 'Mid-year bounce' },
    august: { avg: -2, description: 'Low volume, sideways' },
    september: { avg: -8, description: 'Historically worst month' },
    october: { avg: +20, description: '"Uptober" - best month historically' },
    november: { avg: +15, description: 'Strong continuation' },
    december: { avg: +10, description: 'Year-end rally common' },
  },

  // Market cycle indicators
  indicators: {
    fearGreedLevels: {
      extremeFear: { range: [0, 25], signal: 'Strong buy', description: 'Market capitulation, historically good entry' },
      fear: { range: [25, 45], signal: 'Buy', description: 'Accumulation zone' },
      neutral: { range: [45, 55], signal: 'Hold', description: 'Indecision' },
      greed: { range: [55, 75], signal: 'Caution', description: 'Momentum but risky' },
      extremeGreed: { range: [75, 100], signal: 'Strong sell', description: 'Euphoria, often precedes correction' },
    },
    mvrv: {
      description: 'Market Value to Realized Value ratio',
      oversold: '<1.0 - historically good buying opportunity',
      fair: '1.0-3.0 - normal range',
      overvalued: '>3.0 - caution, cycle may be topping',
      extreme: '>4.0 - historically marked cycle tops',
    },
  },

  // Altcoin patterns
  altcoins: {
    patterns: [
      'Alt season typically follows Bitcoin consolidation after new ATH',
      'ETH/BTC ratio bottoming signals alt season start',
      'Bitcoin dominance falling below 50% = peak alt season',
      'Meme coins peak at market euphoria',
      'DeFi tokens lead in bull markets',
      'Infrastructure tokens (L1/L2) outperform mid-cycle',
    ],
  },
};

// ============================================================================
// ECONOMIC HISTORICAL KNOWLEDGE
// ============================================================================

export const ECONOMICS_HISTORY = {
  // Federal Reserve Rate Decisions
  fedPatterns: {
    historical: [
      'Fed typically signals moves 2-4 weeks in advance',
      'Markets price in decisions before announcements',
      'Hawkish surprise = immediate selloff',
      'Dovish surprise = rally',
      'First cut in a cycle historically bullish for stocks',
      'Pause after hiking = markets rally',
    ],
    recentCycles: [
      { period: '2015-2018', action: 'Rate hikes', rates: '0.25% to 2.5%', marketImpact: 'Stocks up 40%' },
      { period: '2019', action: 'Rate cuts', rates: '2.5% to 1.75%', marketImpact: 'Stocks up 29%' },
      { period: '2020', action: 'Emergency cuts', rates: '1.75% to 0%', marketImpact: 'Stocks crashed then recovered' },
      { period: '2022-2023', action: 'Aggressive hikes', rates: '0% to 5.5%', marketImpact: 'Stocks down 20% then recovered' },
    ],
  },

  // Inflation patterns
  inflation: {
    historical: [
      '1970s stagflation: 15% inflation, Fed raised to 20%',
      '1980s: Volcker shock, rates to 20% broke inflation',
      '2008 deflation scare: QE introduced',
      '2021-2022: Post-COVID inflation peaked at 9.1%',
    ],
    correlations: [
      'High inflation = Fed hawkish = risk assets down',
      'Falling inflation = Fed dovish = risk assets up',
      'Core PCE most watched by Fed',
      'CPI surprise moves markets most',
    ],
  },

  // Recession indicators
  recessionIndicators: {
    yieldCurve: {
      description: '2y-10y Treasury spread',
      historical: 'Inverted curve preceded all 7 recessions since 1970',
      leadTime: '12-24 months before recession',
      falseSignals: 'Not all inversions lead to recession',
    },
    unemployment: {
      sahmRule: 'When 3-month avg rises 0.5% above 12-month low, recession has started',
      historical: 'Perfect track record since 1970',
    },
    manufacturing: {
      ism: 'ISM <50 for 3 consecutive months signals recession',
      historical: 'Often leads GDP by 1-2 quarters',
    },
  },

  // Market cycles
  marketCycles: {
    averageBullMarket: { duration: '4.5 years', gain: '+180%' },
    averageBearMarket: { duration: '1.5 years', loss: '-35%' },
    corrections: {
      '5%': { frequency: '3x per year', avgRecovery: '1 month' },
      '10%': { frequency: '1x per year', avgRecovery: '4 months' },
      '20%': { frequency: '1x every 4 years', avgRecovery: '14 months' },
    },
  },
};

// ============================================================================
// POLITICAL HISTORICAL KNOWLEDGE
// ============================================================================

export const POLITICS_HISTORY = {
  // US Election patterns
  elections: {
    presidentialCycle: {
      year1: { avg: +5, description: 'Post-election honeymoon' },
      year2: { avg: +2, description: 'Midterm weakness' },
      year3: { avg: +12, description: 'Pre-election rally' },
      year4: { avg: +7, description: 'Election year optimism' },
    },
    partyPerformance: {
      democratWin: { immediate: 'Slight positive', firstYear: '+9% avg' },
      republicanWin: { immediate: 'Slight positive', firstYear: '+11% avg' },
      dividedGovernment: { note: 'Markets historically prefer gridlock' },
    },
    midterms: {
      pattern: 'Markets typically rally after midterms regardless of outcome',
      avgGain6Months: '+15%',
      historical: '17 of last 19 midterms followed by gains',
    },
  },

  // Geopolitical events
  geopolitical: {
    patterns: [
      'War fears: Initial selloff, then recovery',
      'Actual war: Markets bottom on bad news',
      'Resolution: Rally',
      'Trade wars: Prolonged uncertainty = sideways',
      'Sanctions: Commodity spikes common',
    ],
    historicalEvents: [
      { event: 'Cuban Missile Crisis 1962', drop: -7, recovery: '2 weeks' },
      { event: 'Gulf War 1990', drop: -15, recovery: '6 months' },
      { event: '9/11 2001', drop: -12, recovery: '1 month' },
      { event: 'Iraq War 2003', drop: 0, recovery: 'Rallied into war' },
      { event: 'Ukraine 2022', drop: -10, recovery: '2 months' },
    ],
  },

  // Policy impacts
  policy: {
    taxes: [
      'Corporate tax cuts = stock rally',
      'Capital gains tax hike proposals = selloff',
      'Tax uncertainty = volatility',
    ],
    regulation: [
      'Deregulation = sector rally',
      'New regulations = sector selloff initially',
      'Crypto regulation clarity = bullish historically',
    ],
  },
};

// ============================================================================
// SPORTS HISTORICAL KNOWLEDGE
// ============================================================================

export const SPORTS_HISTORY = {
  // NFL patterns
  nfl: {
    homeFieldAdvantage: {
      regular: '57% win rate for home team',
      playoffs: '65% win rate for home team',
      superBowl: 'Neutral site, slight favorite by seed',
    },
    spreads: {
      patterns: [
        'Favorites cover ~51% of time (slight edge)',
        'Road favorites under 3 points: 54% cover rate',
        'Double-digit favorites: 52% cover rate',
        'Teams off bye week: +2.5 points edge',
        'Revenge games: Slight underdog edge',
      ],
    },
    totals: {
      patterns: [
        'Unders slightly profitable long-term',
        'Primetime games trend under',
        'Cold weather games: Unders',
        'Domes: Overs slightly',
      ],
    },
    playoffs: {
      patterns: [
        'Higher seed wins 65% in divisional round',
        'Home underdogs valuable in playoffs',
        'Super Bowl: Favorites 37-18 ATS historically',
        'NFC has won 6 of last 10 Super Bowls',
      ],
    },
  },

  // NBA patterns
  nba: {
    homeFieldAdvantage: {
      regular: '60% home win rate',
      playoffs: '70% home win rate',
    },
    spreads: {
      patterns: [
        'Road favorites: Value in small spreads',
        'Back-to-backs: Significant disadvantage (-3 to -5 points)',
        'Teams off 3+ days rest: +2 points edge',
        'Altitude (Denver): +3 points home advantage',
      ],
    },
    playoffs: {
      patterns: [
        '1 seeds win championship 40% of time',
        'No 8 seed has ever won NBA Finals',
        'Home court in Game 7: 80% win rate',
        'Series 2-2: Higher seed wins 65%',
      ],
    },
    totals: {
      patterns: [
        'Pace dictates totals',
        'Back-to-backs: Unders',
        'Rivalry games: Unders (physical)',
        'Playoffs: Generally under regular season totals',
      ],
    },
  },

  // College Football patterns
  cfb: {
    homeFieldAdvantage: {
      sec: '75% home win rate (strongest)',
      big10: '70% home win rate',
      acc: '68% home win rate',
      big12: '65% home win rate',
      pac12: '62% home win rate',
    },
    spreads: {
      patterns: [
        'Ranked vs unranked: Cover ~52%',
        'Top 5 vs unranked: Covers 48% (trap)',
        'Rivalry games: Underdog value',
        'Night games in hostile environments: Home edge +3',
        'November games in cold weather: Experience matters',
      ],
    },
    playoffs: {
      patterns: [
        '1 seeds are 7-2 in semifinals',
        'SEC teams dominate (60% of final appearances)',
        'Conference championship week: Favorites cover 55%',
      ],
    },
  },

  // MLB patterns
  mlb: {
    homeFieldAdvantage: '54% home win rate',
    moneylines: {
      patterns: [
        'Underdogs profitable long-term (+2% ROI)',
        'Heavy favorites (-200+): Slight negative ROI',
        'Divisional games: Home team edge stronger',
        'Interleague: AL teams historically better',
      ],
    },
    totals: {
      patterns: [
        'Day games: Slightly over',
        'Night games: Slightly under',
        'Weather matters significantly',
        'Coors Field: Always adjust +2 runs',
      ],
    },
    playoffs: {
      patterns: [
        'Home field less important than regular season',
        'Pitching dominates October',
        'Underdogs win 45% of playoff series',
      ],
    },
  },

  // Soccer patterns
  soccer: {
    homeFieldAdvantage: {
      premierLeague: '46% home wins',
      laLiga: '47% home wins',
      bundesliga: '45% home wins',
      serieA: '48% home wins',
      championsLeague: '44% home wins (group stage)',
    },
    patterns: [
      'Draw is common outcome (25-30%)',
      'Favorites in leagues cover ~52%',
      'Cup competitions: More upsets',
      'UCL knockout: Away goals rule removed (changes dynamics)',
      'Relegation battles: Desperation helps underdogs',
    ],
  },
};

// ============================================================================
// WEATHER HISTORICAL KNOWLEDGE
// ============================================================================

export const WEATHER_HISTORY = {
  // Temperature patterns
  temperature: {
    globalTrend: '+1.1°C since pre-industrial era',
    hotYears: [
      { year: 2023, anomaly: '+1.45°C', note: 'Hottest year on record' },
      { year: 2016, anomaly: '+1.28°C', note: 'El Niño boosted' },
      { year: 2020, anomaly: '+1.27°C', note: 'Tied 2016' },
      { year: 2019, anomaly: '+1.24°C', note: 'Third hottest' },
    ],
    patterns: [
      'El Niño years typically warmer globally',
      'La Niña years cooler, more hurricanes',
      'Arctic warming 3x faster than global average',
      'Each decade warmer than previous since 1970s',
    ],
  },

  // Hurricane patterns
  hurricanes: {
    season: 'June 1 - November 30',
    peak: 'August 20 - October 10',
    averages: {
      namedStorms: 14,
      hurricanes: 7,
      majorHurricanes: 3,
    },
    elNinoImpact: 'Suppresses Atlantic hurricanes',
    laNinaImpact: 'Enhances Atlantic hurricanes',
    historicalActive: [
      { year: 2020, namedStorms: 30, note: 'Record' },
      { year: 2005, namedStorms: 28, note: 'Katrina year' },
      { year: 2021, namedStorms: 21, note: 'Third most active' },
    ],
  },

  // Seasonal patterns
  seasonal: {
    winter: {
      patterns: [
        'Polar vortex disruptions cause cold outbreaks',
        'La Niña = colder NE US',
        'El Niño = milder NE US, wetter South',
        'Snowiest months: January-February',
      ],
    },
    summer: {
      patterns: [
        'Heat waves more frequent and intense',
        'Wildfire season expanding',
        'Drought patterns shifting',
        'Monsoon timing relatively consistent',
      ],
    },
  },

  // Prediction accuracy
  forecasting: {
    shortTerm: '90%+ accuracy 1-3 days',
    mediumTerm: '80% accuracy 4-7 days',
    longTerm: '60-70% accuracy 8-14 days',
    seasonal: '55-65% accuracy',
    note: 'Extreme events harder to predict accurately',
  },
};

// ============================================================================
// HISTORICAL KNOWLEDGE CLASS
// ============================================================================

export class HistoricalKnowledge {
  getAll() {
    return {
      crypto: CRYPTO_HISTORY,
      economics: ECONOMICS_HISTORY,
      politics: POLITICS_HISTORY,
      sports: SPORTS_HISTORY,
      weather: WEATHER_HISTORY,
    };
  }

  // Get relevant knowledge for a market
  getRelevantKnowledge(marketTitle: string, _category?: string): string[] {
    const title = marketTitle.toLowerCase();
    const knowledge: string[] = [];

    // Crypto keywords
    if (title.includes('bitcoin') || title.includes('btc') || title.includes('crypto') || title.includes('ethereum') || title.includes('eth')) {
      knowledge.push(...CRYPTO_HISTORY.halvingCycles.patterns);
      const month = new Date().toLocaleString('en-US', { month: 'long' }).toLowerCase() as keyof typeof CRYPTO_HISTORY.seasonality;
      const seasonality = CRYPTO_HISTORY.seasonality[month];
      if (seasonality) {
        knowledge.push(`${month}: ${seasonality.description} (avg ${seasonality.avg > 0 ? '+' : ''}${seasonality.avg}%)`);
      }
    }

    // Fed/economic keywords
    if (title.includes('fed') || title.includes('rate') || title.includes('inflation') || title.includes('gdp') || title.includes('recession')) {
      knowledge.push(...ECONOMICS_HISTORY.fedPatterns.historical);
      knowledge.push(...ECONOMICS_HISTORY.inflation.correlations);
    }

    // Political keywords
    if (title.includes('election') || title.includes('president') || title.includes('congress') || title.includes('senate') || title.includes('trump') || title.includes('biden')) {
      const year = new Date().getFullYear();
      const cycleYear = (year % 4) + 1;
      const cycleKey = `year${cycleYear}` as keyof typeof POLITICS_HISTORY.elections.presidentialCycle;
      const cycleData = POLITICS_HISTORY.elections.presidentialCycle[cycleKey];
      knowledge.push(`Presidential cycle year ${cycleYear}: ${cycleData.description} (avg ${cycleData.avg > 0 ? '+' : ''}${cycleData.avg}%)`);
      knowledge.push(...POLITICS_HISTORY.elections.midterms.pattern ? [POLITICS_HISTORY.elections.midterms.pattern] : []);
    }

    // NFL keywords
    if (title.includes('nfl') || title.includes('super bowl') || title.includes('football')) {
      knowledge.push(...SPORTS_HISTORY.nfl.spreads.patterns);
      knowledge.push(...SPORTS_HISTORY.nfl.playoffs.patterns);
    }

    // NBA keywords
    if (title.includes('nba') || title.includes('basketball')) {
      knowledge.push(...SPORTS_HISTORY.nba.spreads.patterns);
      knowledge.push(...SPORTS_HISTORY.nba.playoffs.patterns);
    }

    // College football keywords
    if (title.includes('college') || title.includes('ncaa') || title.includes('cfp') || title.includes('cfb')) {
      knowledge.push(...SPORTS_HISTORY.cfb.spreads.patterns);
    }

    // MLB keywords
    if (title.includes('mlb') || title.includes('baseball') || title.includes('world series')) {
      knowledge.push(...SPORTS_HISTORY.mlb.moneylines.patterns);
    }

    // Soccer keywords
    if (title.includes('soccer') || title.includes('premier league') || title.includes('champions league') || title.includes('world cup')) {
      knowledge.push(...SPORTS_HISTORY.soccer.patterns);
    }

    // Weather keywords
    if (title.includes('temperature') || title.includes('weather') || title.includes('hurricane') || title.includes('snow') || title.includes('heat')) {
      knowledge.push(...WEATHER_HISTORY.temperature.patterns);
      knowledge.push(...WEATHER_HISTORY.hurricanes.averages ? [`Average Atlantic hurricanes: ${WEATHER_HISTORY.hurricanes.averages.hurricanes}/year`] : []);
    }

    return knowledge;
  }

  // Get crypto market phase
  getCryptoMarketPhase(): { phase: string; recommendation: string } {
    // This would typically use real data, but for now use heuristics
    const month = new Date().getMonth();
    const fearGreed = 50; // Would get from API

    if (fearGreed < 25) {
      return { phase: 'Capitulation', recommendation: 'Strong accumulation zone historically' };
    } else if (fearGreed < 45) {
      return { phase: 'Fear', recommendation: 'Good buying opportunity' };
    } else if (fearGreed < 55) {
      return { phase: 'Neutral', recommendation: 'DCA strategy recommended' };
    } else if (fearGreed < 75) {
      return { phase: 'Greed', recommendation: 'Take some profits' };
    } else {
      return { phase: 'Extreme Greed', recommendation: 'High risk of correction' };
    }
  }

  // Get sports betting edge
  getSportsBettingEdge(sport: string, homeTeam: boolean, spread: number): { edge: number; reason: string } {
    switch (sport.toLowerCase()) {
      case 'nfl':
        if (homeTeam && spread > -3 && spread < 0) {
          return { edge: 2.5, reason: 'Small home favorite: 54% historical cover rate' };
        }
        if (!homeTeam && spread < 7) {
          return { edge: 1.5, reason: 'Road underdog in range: Slight value' };
        }
        break;
      case 'nba':
        if (!homeTeam && spread > 0 && spread < 5) {
          return { edge: 2.0, reason: 'Road favorite small spread: Historical value' };
        }
        break;
      case 'mlb':
        if (!homeTeam) {
          return { edge: 2.0, reason: 'MLB underdogs profitable long-term' };
        }
        break;
    }
    return { edge: 0, reason: 'No clear historical edge' };
  }

  // Display knowledge summary
  displaySummary(category: string): void {
    console.log(`\n${c.bgBlue}${c.white} 📚 HISTORICAL KNOWLEDGE: ${category.toUpperCase()} ${c.reset}\n`);

    switch (category.toLowerCase()) {
      case 'crypto':
        console.log(`${c.brightYellow}BITCOIN HALVING CYCLES:${c.reset}`);
        CRYPTO_HISTORY.halvingCycles.events.forEach(e => {
          console.log(`  ${c.dim}${e.date}:${c.reset} ${e.blockReward}, $${e.priceAtHalving} → $${e.peakAfter || '?'}`);
        });
        console.log(`\n${c.brightYellow}PATTERNS:${c.reset}`);
        CRYPTO_HISTORY.halvingCycles.patterns.forEach(p => {
          console.log(`  ${c.cyan}•${c.reset} ${p}`);
        });
        console.log(`\n${c.brightYellow}SEASONALITY:${c.reset}`);
        Object.entries(CRYPTO_HISTORY.seasonality).forEach(([month, data]) => {
          const color = data.avg > 0 ? c.brightGreen : c.brightRed;
          console.log(`  ${month.padEnd(10)} ${color}${data.avg > 0 ? '+' : ''}${data.avg}%${c.reset} - ${data.description}`);
        });
        break;

      case 'economics':
        console.log(`${c.brightYellow}FED PATTERNS:${c.reset}`);
        ECONOMICS_HISTORY.fedPatterns.historical.forEach(p => {
          console.log(`  ${c.cyan}•${c.reset} ${p}`);
        });
        console.log(`\n${c.brightYellow}RECESSION INDICATORS:${c.reset}`);
        console.log(`  ${c.dim}Yield Curve:${c.reset} ${ECONOMICS_HISTORY.recessionIndicators.yieldCurve.historical}`);
        console.log(`  ${c.dim}Sahm Rule:${c.reset} ${ECONOMICS_HISTORY.recessionIndicators.unemployment.sahmRule}`);
        break;

      case 'politics':
        console.log(`${c.brightYellow}PRESIDENTIAL CYCLE:${c.reset}`);
        Object.entries(POLITICS_HISTORY.elections.presidentialCycle).forEach(([year, data]) => {
          const color = data.avg > 0 ? c.brightGreen : c.brightRed;
          console.log(`  ${year.padEnd(6)} ${color}${data.avg > 0 ? '+' : ''}${data.avg}%${c.reset} - ${data.description}`);
        });
        console.log(`\n${c.brightYellow}MIDTERM PATTERN:${c.reset}`);
        console.log(`  ${c.cyan}•${c.reset} ${POLITICS_HISTORY.elections.midterms.pattern}`);
        console.log(`  ${c.cyan}•${c.reset} Average gain 6 months after: ${POLITICS_HISTORY.elections.midterms.avgGain6Months}`);
        break;

      case 'sports':
        console.log(`${c.brightYellow}NFL BETTING PATTERNS:${c.reset}`);
        SPORTS_HISTORY.nfl.spreads.patterns.forEach(p => {
          console.log(`  ${c.cyan}•${c.reset} ${p}`);
        });
        console.log(`\n${c.brightYellow}NBA BETTING PATTERNS:${c.reset}`);
        SPORTS_HISTORY.nba.spreads.patterns.forEach(p => {
          console.log(`  ${c.cyan}•${c.reset} ${p}`);
        });
        console.log(`\n${c.brightYellow}HOME FIELD ADVANTAGE:${c.reset}`);
        console.log(`  NFL: ${SPORTS_HISTORY.nfl.homeFieldAdvantage.regular}`);
        console.log(`  NBA: ${SPORTS_HISTORY.nba.homeFieldAdvantage.regular}`);
        console.log(`  MLB: ${SPORTS_HISTORY.mlb.homeFieldAdvantage}`);
        break;

      case 'weather':
        console.log(`${c.brightYellow}TEMPERATURE TRENDS:${c.reset}`);
        console.log(`  ${c.dim}Global warming:${c.reset} ${WEATHER_HISTORY.temperature.globalTrend}`);
        console.log(`\n${c.brightYellow}HOTTEST YEARS:${c.reset}`);
        WEATHER_HISTORY.temperature.hotYears.forEach(y => {
          console.log(`  ${y.year}: ${c.brightRed}${y.anomaly}${c.reset} - ${y.note}`);
        });
        console.log(`\n${c.brightYellow}HURRICANE AVERAGES:${c.reset}`);
        console.log(`  Named storms: ${WEATHER_HISTORY.hurricanes.averages.namedStorms}/year`);
        console.log(`  Hurricanes: ${WEATHER_HISTORY.hurricanes.averages.hurricanes}/year`);
        console.log(`  Major (Cat 3+): ${WEATHER_HISTORY.hurricanes.averages.majorHurricanes}/year`);
        break;

      default:
        console.log(`${c.dim}Available categories: crypto, economics, politics, sports, weather${c.reset}`);
    }
  }
}

// Export singleton
export const historicalKnowledge = new HistoricalKnowledge();

// CLI Runner
async function main() {
  const args = process.argv.slice(2);
  const category = args[0]?.toLowerCase() || 'all';

  console.log(`
${c.bgBlue}${c.white}╔══════════════════════════════════════════════════════════════╗${c.reset}
${c.bgBlue}${c.white}║${c.reset}         ${c.brightYellow}📚 HISTORICAL KNOWLEDGE BASE 📚${c.reset}                    ${c.bgBlue}${c.white}║${c.reset}
${c.bgBlue}${c.white}║${c.reset}                                                              ${c.bgBlue}${c.white}║${c.reset}
${c.bgBlue}${c.white}║${c.reset}   ${c.white}Crypto • Economics • Politics • Sports • Weather${c.reset}         ${c.bgBlue}${c.white}║${c.reset}
${c.bgBlue}${c.white}╚══════════════════════════════════════════════════════════════╝${c.reset}
  `);

  if (category === 'all') {
    console.log(`${c.brightWhite}📋 COMMANDS:${c.reset}\n`);
    console.log(`  ${c.brightCyan}crypto${c.reset}      - Crypto market patterns & cycles`);
    console.log(`  ${c.brightCyan}economics${c.reset}   - Fed, inflation, recession indicators`);
    console.log(`  ${c.brightCyan}politics${c.reset}    - Election cycles & geopolitical patterns`);
    console.log(`  ${c.brightCyan}sports${c.reset}      - Betting patterns across major sports`);
    console.log(`  ${c.brightCyan}weather${c.reset}     - Temperature, hurricane, seasonal patterns\n`);

    console.log(`${c.brightWhite}📊 QUICK STATS:${c.reset}\n`);
    console.log(`  ${c.dim}Crypto:${c.reset} 4 halving cycles, 10+ major events, monthly seasonality`);
    console.log(`  ${c.dim}Economics:${c.reset} 4 rate cycles, recession indicators, market cycles`);
    console.log(`  ${c.dim}Politics:${c.reset} Presidential cycle, midterm patterns, geopolitical events`);
    console.log(`  ${c.dim}Sports:${c.reset} NFL, NBA, CFB, MLB, Soccer patterns`);
    console.log(`  ${c.dim}Weather:${c.reset} Temperature trends, hurricane patterns, forecasting accuracy\n`);
  } else {
    historicalKnowledge.displaySummary(category);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

