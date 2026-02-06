/**
 * ENTERTAINMENT EXPERT BOT
 * Specialized AI for Kalshi entertainment prediction markets
 *
 * Covers: Movies, TV, Streaming, Awards, Box Office, Celebrity Events
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

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
  bgMagenta: '\x1b[45m',
  black: '\x1b[30m',
};

// Entertainment Categories
export type EntertainmentCategory =
  | 'oscars'
  | 'emmys'
  | 'grammys'
  | 'golden_globes'
  | 'box_office'
  | 'streaming'
  | 'tv_ratings'
  | 'celebrity'
  | 'sports_entertainment'
  | 'gaming'
  | 'music'
  | 'general';

export interface EntertainmentMarket {
  id: string;
  title: string;
  category: EntertainmentCategory;
  yesPrice: number;
  noPrice: number;
  expiresAt: string;
  volume?: number;
}

export interface EntertainmentPrediction {
  market: EntertainmentMarket;
  prediction: 'yes' | 'no';
  confidence: number;       // 0-100
  probability: number;      // 0-1
  edge: number;             // Our probability - market probability
  reasoning: string;
  factors: string[];
  sources: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AwardsPrediction {
  category: string;
  nominees: string[];
  winner: string;
  confidence: number;
  reasoning: string;
  historicalFactors: string[];
}

export interface BoxOfficePrediction {
  movie: string;
  predictedOpening: number;
  predictedTotal: number;
  confidence: number;
  comparisons: string[];
}

// Knowledge Base - Entertainment Facts & Patterns
const ENTERTAINMENT_KNOWLEDGE = {
  // Oscar patterns
  oscars: {
    bestPictureTrends: [
      'Drama films win ~70% of the time',
      'War/historical dramas have strong track record',
      'Films released Oct-Dec have advantage (recency bias)',
      'PGA winner matches Best Picture ~75% of time',
      'SAG Ensemble winner is strong predictor',
      'DGA winner almost always wins Best Picture',
      'Films with 10+ nominations historically favored',
    ],
    actingPatterns: [
      'SAG individual winners match Oscar ~80%',
      'BAFTA winners often predict Oscar winners',
      'Biographical/transformation roles favored',
      'Previous nominees often win on return',
      'Age/career achievement sometimes factors in',
    ],
    recentWinners: {
      2024: { bestPicture: 'Oppenheimer', bestDirector: 'Christopher Nolan' },
      2023: { bestPicture: 'Everything Everywhere All at Once', bestDirector: 'Daniel Kwan, Daniel Scheinert' },
      2022: { bestPicture: 'CODA', bestDirector: 'Jane Campion' },
    },
  },

  // Box Office patterns
  boxOffice: {
    openingWeekendFactors: [
      'Franchise films typically front-loaded',
      'Summer blockbusters peak Memorial Day - Labor Day',
      'Holiday releases benefit from extended runs',
      'Tracking typically accurate within 15-20%',
      'Social media buzz correlates with opening',
      'Review scores impact legs, not opening',
    ],
    franchiseMultipliers: {
      'Marvel': 2.5,
      'DC': 2.2,
      'Star Wars': 2.8,
      'Pixar': 3.5,
      'Disney Animation': 3.2,
      'Horror': 3.0,
      'Original': 2.8,
    },
  },

  // Streaming patterns
  streaming: {
    platforms: ['Netflix', 'Disney+', 'HBO Max', 'Amazon Prime', 'Apple TV+', 'Hulu', 'Peacock'],
    viewershipPatterns: [
      'Netflix originals typically peak week 1-2',
      'Prestige shows build over time',
      'Reality TV has consistent weekly viewers',
      'Holiday releases get extended viewing',
    ],
  },

  // Grammy patterns
  grammys: {
    albumOfYearTrends: [
      'Pop/R&B artists dominate recent years',
      'Critical acclaim doesn\'t always translate to wins',
      'Commercial success increasingly important',
      'Diversity of nominees has increased',
    ],
    recordOfYearPatterns: [
      'Radio play and streaming numbers matter',
      'Songs released earlier in eligibility period disadvantaged',
      'Cultural impact can trump raw numbers',
    ],
  },

  // Emmy patterns
  emmys: {
    dramaSeriesTrends: [
      'HBO historically dominates drama',
      'Streaming services increasingly winning',
      'Final seasons often get recognition',
      'Previous winners have incumbency advantage',
    ],
    comedySeriesTrends: [
      'Network comedies rarely win anymore',
      'Streaming comedies dominate',
      'Fresh/new shows often beat returning favorites',
    ],
  },

  // Celebrity/Reality patterns
  celebrity: {
    realityTVPatterns: [
      'Bachelor/Bachelorette engagement rates ~30%',
      'Reality TV marriages have ~20% success rate',
      'Reunion announcements spike after breakup news',
    ],
  },
};

// News sources for entertainment
const ENTERTAINMENT_SOURCES = [
  'Variety',
  'Hollywood Reporter',
  'Deadline',
  'Entertainment Weekly',
  'Box Office Mojo',
  'The Numbers',
  'Rotten Tomatoes',
  'Metacritic',
  'Gold Derby',
  'Awards Watch',
  'IndieWire',
  'Screen Rant',
];

export class EntertainmentExpert {
  private claude: Anthropic | null;
  private knowledgeBase = ENTERTAINMENT_KNOWLEDGE;

  constructor() {
    this.claude = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
  }

  /**
   * Categorize a market based on its title
   */
  categorizeMarket(title: string): EntertainmentCategory {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('oscar') || lowerTitle.includes('academy award')) return 'oscars';
    if (lowerTitle.includes('emmy')) return 'emmys';
    if (lowerTitle.includes('grammy')) return 'grammys';
    if (lowerTitle.includes('golden globe')) return 'golden_globes';
    if (lowerTitle.includes('box office') || lowerTitle.includes('opening weekend') || lowerTitle.includes('gross')) return 'box_office';
    if (lowerTitle.includes('netflix') || lowerTitle.includes('streaming') || lowerTitle.includes('disney+') || lowerTitle.includes('hbo')) return 'streaming';
    if (lowerTitle.includes('ratings') || lowerTitle.includes('viewers') || lowerTitle.includes('watched')) return 'tv_ratings';
    if (lowerTitle.includes('super bowl') || lowerTitle.includes('halftime') || lowerTitle.includes('wwe') || lowerTitle.includes('ufc')) return 'sports_entertainment';
    if (lowerTitle.includes('game') || lowerTitle.includes('esports') || lowerTitle.includes('twitch')) return 'gaming';
    if (lowerTitle.includes('album') || lowerTitle.includes('song') || lowerTitle.includes('billboard') || lowerTitle.includes('spotify')) return 'music';
    if (lowerTitle.includes('marry') || lowerTitle.includes('divorce') || lowerTitle.includes('engaged') || lowerTitle.includes('bachelor')) return 'celebrity';

    return 'general';
  }

  /**
   * Get relevant knowledge for a category
   */
  getKnowledgeForCategory(category: EntertainmentCategory): string[] {
    switch (category) {
      case 'oscars':
        return [
          ...this.knowledgeBase.oscars.bestPictureTrends,
          ...this.knowledgeBase.oscars.actingPatterns,
        ];
      case 'box_office':
        return this.knowledgeBase.boxOffice.openingWeekendFactors;
      case 'grammys':
        return [
          ...this.knowledgeBase.grammys.albumOfYearTrends,
          ...this.knowledgeBase.grammys.recordOfYearPatterns,
        ];
      case 'emmys':
        return [
          ...this.knowledgeBase.emmys.dramaSeriesTrends,
          ...this.knowledgeBase.emmys.comedySeriesTrends,
        ];
      case 'celebrity':
        return this.knowledgeBase.celebrity.realityTVPatterns;
      case 'streaming':
        return this.knowledgeBase.streaming.viewershipPatterns;
      default:
        return [];
    }
  }

  /**
   * Analyze an entertainment market
   */
  async analyzeMarket(market: EntertainmentMarket): Promise<EntertainmentPrediction> {
    const category = this.categorizeMarket(market.title);
    const knowledge = this.getKnowledgeForCategory(category);

    console.log(`\n${c.brightMagenta}🎬 ENTERTAINMENT EXPERT ANALYSIS${c.reset}`);
    console.log(`${c.dim}Category: ${c.reset}${c.brightCyan}${category.toUpperCase()}${c.reset}`);
    console.log(`${c.dim}Market: ${c.reset}${market.title}`);

    // Get AI analysis if available
    let aiPrediction = await this.getAIPrediction(market, category, knowledge);

    // Calculate edge
    const marketYesProb = market.yesPrice / 100;
    const edge = (aiPrediction.probability - marketYesProb) * 100;

    const prediction: EntertainmentPrediction = {
      market,
      prediction: aiPrediction.probability > 0.5 ? 'yes' : 'no',
      confidence: aiPrediction.confidence,
      probability: aiPrediction.probability,
      edge: aiPrediction.prediction === 'yes' ? edge : -edge,
      reasoning: aiPrediction.reasoning,
      factors: aiPrediction.factors,
      sources: ENTERTAINMENT_SOURCES.slice(0, 3),
      riskLevel: this.assessRisk(market, aiPrediction.confidence),
    };

    this.displayPrediction(prediction);
    return prediction;
  }

  /**
   * Get AI-powered prediction
   */
  private async getAIPrediction(
    market: EntertainmentMarket,
    category: EntertainmentCategory,
    knowledge: string[]
  ): Promise<{
    prediction: 'yes' | 'no';
    probability: number;
    confidence: number;
    reasoning: string;
    factors: string[];
  }> {
    if (!this.claude) {
      // Fallback heuristic analysis
      return this.heuristicAnalysis(market, category, knowledge);
    }

    try {
      const prompt = `You are an entertainment industry expert specializing in prediction markets. Analyze the following market and provide a prediction.

MARKET: "${market.title}"
CATEGORY: ${category}
CURRENT PRICES: YES ${market.yesPrice}¢ / NO ${market.noPrice}¢
EXPIRES: ${market.expiresAt}

RELEVANT KNOWLEDGE:
${knowledge.map(k => `- ${k}`).join('\n')}

Based on your expertise in entertainment, awards shows, box office, streaming, and celebrity culture, provide:
1. Your probability estimate (0-100%) for YES
2. Your confidence level (0-100%)
3. Key factors influencing your prediction
4. Brief reasoning

Respond in JSON format:
{
  "probability": 65,
  "confidence": 70,
  "prediction": "yes",
  "factors": ["factor1", "factor2", "factor3"],
  "reasoning": "Brief explanation..."
}`;

      const response = await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : '';

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          prediction: parsed.prediction || (parsed.probability > 50 ? 'yes' : 'no'),
          probability: (parsed.probability || 50) / 100,
          confidence: parsed.confidence || 50,
          reasoning: parsed.reasoning || 'AI analysis',
          factors: parsed.factors || [],
        };
      }
    } catch (error) {
      console.error(`${c.dim}AI analysis error, using heuristics${c.reset}`);
    }

    return this.heuristicAnalysis(market, category, knowledge);
  }

  /**
   * Heuristic analysis when AI unavailable
   */
  private heuristicAnalysis(
    market: EntertainmentMarket,
    category: EntertainmentCategory,
    knowledge: string[]
  ): {
    prediction: 'yes' | 'no';
    probability: number;
    confidence: number;
    reasoning: string;
    factors: string[];
  } {
    const title = market.title.toLowerCase();
    let probability = market.yesPrice / 100;
    let confidence = 50;
    const factors: string[] = [];

    // Category-specific adjustments
    switch (category) {
      case 'oscars':
        // Check for frontrunner indicators
        if (title.includes('best picture')) {
          factors.push('Best Picture race historically tight');
          confidence = 55;
        }
        if (title.includes('best director')) {
          factors.push('Director often follows Best Picture');
          confidence = 60;
        }
        break;

      case 'box_office':
        if (title.includes('$100 million') || title.includes('100m')) {
          factors.push('$100M+ opening requires strong franchise or buzz');
          confidence = 55;
        }
        if (title.includes('marvel') || title.includes('disney')) {
          factors.push('Major studio franchise - historically reliable');
          probability = Math.min(probability + 0.05, 0.95);
          confidence = 65;
        }
        break;

      case 'grammys':
        factors.push('Grammy voting can be unpredictable');
        confidence = 45;
        break;

      case 'emmys':
        if (title.includes('hbo') || title.includes('succession') || title.includes('white lotus')) {
          factors.push('HBO has strong Emmy track record');
          probability = Math.min(probability + 0.05, 0.90);
          confidence = 60;
        }
        break;

      case 'celebrity':
        factors.push('Celebrity outcomes highly unpredictable');
        confidence = 35;
        break;

      case 'streaming':
        if (title.includes('netflix')) {
          factors.push('Netflix viewership data partially public');
          confidence = 55;
        }
        break;
    }

    // Add some market knowledge
    if (knowledge.length > 0) {
      factors.push(knowledge[0]);
    }

    return {
      prediction: probability > 0.5 ? 'yes' : 'no',
      probability,
      confidence,
      reasoning: `Based on ${category} patterns and current market pricing`,
      factors,
    };
  }

  /**
   * Assess risk level
   */
  private assessRisk(market: EntertainmentMarket, confidence: number): 'low' | 'medium' | 'high' {
    if (confidence >= 70) return 'low';
    if (confidence >= 50) return 'medium';
    return 'high';
  }

  /**
   * Display prediction results
   */
  private displayPrediction(pred: EntertainmentPrediction): void {
    const predColor = pred.prediction === 'yes' ? c.brightGreen : c.brightRed;
    const edgeColor = pred.edge > 0 ? c.brightGreen : c.brightRed;
    const riskColor = pred.riskLevel === 'low' ? c.brightGreen :
                      pred.riskLevel === 'medium' ? c.yellow : c.brightRed;

    console.log(`\n${c.brightCyan}┌─────────────────────────────────────────────────────────┐${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.brightWhite}🎬 ENTERTAINMENT PREDICTION${c.reset}                            ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}├─────────────────────────────────────────────────────────┤${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.dim}Prediction:${c.reset}  ${predColor}${pred.prediction.toUpperCase()}${c.reset}                                     ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.dim}Probability:${c.reset} ${c.brightWhite}${(pred.probability * 100).toFixed(1)}%${c.reset}                                 ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.dim}Confidence:${c.reset}  ${c.brightWhite}${pred.confidence}%${c.reset}                                   ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.dim}Edge:${c.reset}        ${edgeColor}${pred.edge >= 0 ? '+' : ''}${pred.edge.toFixed(1)}%${c.reset}                                   ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.dim}Risk:${c.reset}        ${riskColor}${pred.riskLevel.toUpperCase()}${c.reset}                                    ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}├─────────────────────────────────────────────────────────┤${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.dim}Reasoning:${c.reset}                                             ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset}   ${pred.reasoning.substring(0, 50)}${pred.reasoning.length > 50 ? '...' : ''}${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}├─────────────────────────────────────────────────────────┤${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.dim}Key Factors:${c.reset}                                           ${c.brightCyan}│${c.reset}`);
    pred.factors.slice(0, 3).forEach(f => {
      console.log(`${c.brightCyan}│${c.reset}   • ${f.substring(0, 48)}${c.brightCyan}│${c.reset}`);
    });
    console.log(`${c.brightCyan}└─────────────────────────────────────────────────────────┘${c.reset}`);
  }

  /**
   * Get all entertainment-related markets from a list
   */
  filterEntertainmentMarkets(markets: any[]): EntertainmentMarket[] {
    const entertainmentKeywords = [
      'oscar', 'academy', 'emmy', 'grammy', 'golden globe', 'tony',
      'box office', 'movie', 'film', 'streaming', 'netflix', 'disney',
      'hbo', 'amazon prime', 'apple tv', 'hulu',
      'tv', 'show', 'series', 'ratings', 'viewers',
      'album', 'song', 'billboard', 'spotify', 'music',
      'celebrity', 'marry', 'divorce', 'engaged', 'bachelor', 'bachelorette',
      'super bowl', 'halftime', 'wwe', 'wrestling',
      'game awards', 'esports', 'twitch',
      'kardashian', 'swift', 'beyonce', 'drake',
    ];

    return markets.filter(m => {
      const title = m.title?.toLowerCase() || '';
      return entertainmentKeywords.some(kw => title.includes(kw));
    }).map(m => ({
      id: m.id || m.ticker,
      title: m.title,
      category: this.categorizeMarket(m.title),
      yesPrice: m.yesPrice || m.yes_price || 50,
      noPrice: m.noPrice || m.no_price || 50,
      expiresAt: m.expiresAt || m.expiration_time || '',
      volume: m.volume || 0,
    }));
  }

  /**
   * Analyze multiple entertainment markets and find best opportunities
   */
  async findBestOpportunities(markets: EntertainmentMarket[], minEdge: number = 5): Promise<EntertainmentPrediction[]> {
    console.log(`\n${c.bgMagenta}${c.black} 🎬 ENTERTAINMENT EXPERT - SCANNING ${markets.length} MARKETS ${c.reset}\n`);

    const predictions: EntertainmentPrediction[] = [];

    for (const market of markets) {
      const prediction = await this.analyzeMarket(market);

      if (Math.abs(prediction.edge) >= minEdge && prediction.confidence >= 50) {
        predictions.push(prediction);
      }
    }

    // Sort by edge
    predictions.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));

    console.log(`\n${c.brightMagenta}═══════════════════════════════════════════════════════════${c.reset}`);
    console.log(`${c.brightWhite}📊 FOUND ${predictions.length} OPPORTUNITIES WITH ${minEdge}%+ EDGE${c.reset}`);
    console.log(`${c.brightMagenta}═══════════════════════════════════════════════════════════${c.reset}\n`);

    return predictions;
  }

  /**
   * Get Oscar predictions for current season
   */
  async getOscarPredictions(): Promise<AwardsPrediction[]> {
    console.log(`\n${c.bgMagenta}${c.black} 🏆 OSCAR PREDICTIONS ${c.reset}\n`);

    // This would typically pull from a database or API
    // For now, return structured predictions
    const predictions: AwardsPrediction[] = [
      {
        category: 'Best Picture',
        nominees: ['The favorites will be determined closer to awards season'],
        winner: 'TBD',
        confidence: 0,
        reasoning: 'Awaiting nominations and precursor awards',
        historicalFactors: this.knowledgeBase.oscars.bestPictureTrends,
      },
    ];

    return predictions;
  }

  /**
   * Get box office prediction for a movie
   */
  async predictBoxOffice(movieTitle: string, budget?: number): Promise<BoxOfficePrediction> {
    console.log(`\n${c.bgMagenta}${c.black} 🎬 BOX OFFICE PREDICTION: ${movieTitle} ${c.reset}\n`);

    // Default prediction structure
    const prediction: BoxOfficePrediction = {
      movie: movieTitle,
      predictedOpening: 0,
      predictedTotal: 0,
      confidence: 40,
      comparisons: [],
    };

    if (this.claude) {
      try {
        const response = await this.claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `As a box office analyst, predict the opening weekend and total domestic gross for "${movieTitle}". Consider genre, studio, star power, release timing, and competition. Provide numbers in millions USD and 3 comparable films. Respond in JSON: {"opening": 50, "total": 150, "confidence": 60, "comparisons": ["Film 1 ($X)", "Film 2 ($Y)", "Film 3 ($Z)"]}`
          }],
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          prediction.predictedOpening = parsed.opening || 0;
          prediction.predictedTotal = parsed.total || 0;
          prediction.confidence = parsed.confidence || 40;
          prediction.comparisons = parsed.comparisons || [];
        }
      } catch (e) {
        console.log(`${c.dim}Using default box office prediction${c.reset}`);
      }
    }

    console.log(`${c.brightCyan}┌─────────────────────────────────────────────────────────┐${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.brightWhite}📊 BOX OFFICE FORECAST${c.reset}                                 ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}├─────────────────────────────────────────────────────────┤${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.dim}Opening Weekend:${c.reset} ${c.brightGreen}$${prediction.predictedOpening}M${c.reset}                         ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.dim}Total Domestic:${c.reset}  ${c.brightGreen}$${prediction.predictedTotal}M${c.reset}                         ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}│${c.reset} ${c.dim}Confidence:${c.reset}      ${c.brightWhite}${prediction.confidence}%${c.reset}                              ${c.brightCyan}│${c.reset}`);
    console.log(`${c.brightCyan}└─────────────────────────────────────────────────────────┘${c.reset}`);

    return prediction;
  }

  /**
   * Get knowledge summary for a category
   */
  getKnowledgeSummary(category: EntertainmentCategory): void {
    console.log(`\n${c.bgMagenta}${c.black} 📚 ${category.toUpperCase()} KNOWLEDGE BASE ${c.reset}\n`);

    const knowledge = this.getKnowledgeForCategory(category);

    if (knowledge.length === 0) {
      console.log(`${c.dim}No specific knowledge for ${category}${c.reset}`);
      return;
    }

    knowledge.forEach((item, i) => {
      console.log(`${c.brightCyan}${i + 1}.${c.reset} ${item}`);
    });
  }
}

// Export singleton
export const entertainmentExpert = new EntertainmentExpert();

// CLI Runner
async function main() {
  const expert = new EntertainmentExpert();
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase();

  console.log(`
${c.brightMagenta}╔══════════════════════════════════════════════════════════════╗${c.reset}
${c.brightMagenta}║${c.reset}         ${c.brightYellow}🎬 ENTERTAINMENT EXPERT BOT 🎬${c.reset}                    ${c.brightMagenta}║${c.reset}
${c.brightMagenta}║${c.reset}                                                              ${c.brightMagenta}║${c.reset}
${c.brightMagenta}║${c.reset}   ${c.white}Movies • TV • Streaming • Awards • Box Office • Celebrity${c.reset}  ${c.brightMagenta}║${c.reset}
${c.brightMagenta}╚══════════════════════════════════════════════════════════════╝${c.reset}
  `);

  switch (command) {
    case 'oscars':
      expert.getKnowledgeSummary('oscars');
      await expert.getOscarPredictions();
      break;

    case 'emmys':
      expert.getKnowledgeSummary('emmys');
      break;

    case 'grammys':
      expert.getKnowledgeSummary('grammys');
      break;

    case 'boxoffice':
      expert.getKnowledgeSummary('box_office');
      if (args[1]) {
        await expert.predictBoxOffice(args.slice(1).join(' '));
      }
      break;

    case 'analyze':
      if (args[1]) {
        const mockMarket: EntertainmentMarket = {
          id: 'test',
          title: args.slice(1).join(' '),
          category: 'general',
          yesPrice: 50,
          noPrice: 50,
          expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
        };
        await expert.analyzeMarket(mockMarket);
      } else {
        console.log('Usage: npm run entertainment analyze "Market title here"');
      }
      break;

    default:
      console.log(`${c.brightWhite}📋 COMMANDS:${c.reset}\n`);
      console.log(`  ${c.brightCyan}oscars${c.reset}              - Oscar prediction knowledge & analysis`);
      console.log(`  ${c.brightCyan}emmys${c.reset}               - Emmy prediction knowledge`);
      console.log(`  ${c.brightCyan}grammys${c.reset}             - Grammy prediction knowledge`);
      console.log(`  ${c.brightCyan}boxoffice [movie]${c.reset}   - Box office prediction for a movie`);
      console.log(`  ${c.brightCyan}analyze "title"${c.reset}     - Analyze a specific market\n`);

      console.log(`${c.brightWhite}📚 KNOWLEDGE CATEGORIES:${c.reset}\n`);
      console.log(`  • Oscars / Academy Awards`);
      console.log(`  • Emmy Awards`);
      console.log(`  • Grammy Awards`);
      console.log(`  • Golden Globes`);
      console.log(`  • Box Office Predictions`);
      console.log(`  • Streaming (Netflix, Disney+, HBO, etc.)`);
      console.log(`  • TV Ratings`);
      console.log(`  • Celebrity / Reality TV`);
      console.log(`  • Sports Entertainment`);
      console.log(`  • Gaming / Esports\n`);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

