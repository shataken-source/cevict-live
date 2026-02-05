/**
 * Narrative Catalog
 * Complete taxonomy of all narrative types with impact profiles
 */

export type NarrativeCategory =
  | 'revenge'           // Getting back at someone
  | 'redemption'        // Proving worth after failure
  | 'validation'        // Proving doubters wrong
  | 'milestone'         // Chasing records/achievements
  | 'emotional'         // Playing for someone/something
  | 'rivalry'           // Historic opponent hatred
  | 'pressure'          // Must-win situations
  | 'complacency'       // Trap game / looking ahead
  | 'transition'        // New coach/QB/system
  | 'adversity'         // Overcoming obstacles
  | 'legacy'            // Career-defining moments
  | 'external';         // Distractions outside football

export interface NarrativeType {
  id: string;
  category: NarrativeCategory;
  name: string;
  description: string;

  // Impact profile
  baseImpact: number;           // -0.30 to +0.30
  variability: number;          // How much impact varies
  decayRate: number;            // How fast it fades (days)

  // Detection
  keywords: string[];
  patterns: RegExp[];

  // Historical performance
  historicalCoverRate: number;  // % of time team covers
  sampleSize: number;
  confidence: number;
}

/**
 * Complete Narrative Catalog
 * All narrative types with their detection patterns and impact profiles
 */
export const NARRATIVE_CATALOG: NarrativeType[] = [

  // ==========================================
  // REVENGE NARRATIVES (+boost)
  // ==========================================
  {
    id: 'revenge_traded',
    category: 'revenge',
    name: 'Traded Player Revenge',
    description: 'Player facing team that traded them',
    baseImpact: +0.12,
    variability: 0.04,
    decayRate: 365,
    keywords: ['traded', 'former team', 'return', 'revenge', 'face old team'],
    patterns: [
      /(\w+) returns? to face (his|their) former team/i,
      /traded .* returns? to/i,
      /first game (against|vs\.?) .* since (being )?traded/i,
    ],
    historicalCoverRate: 0.58,
    sampleSize: 342,
    confidence: 0.85,
  },
  {
    id: 'revenge_cut',
    category: 'revenge',
    name: 'Released Player Revenge',
    description: 'Player facing team that cut them',
    baseImpact: +0.10,
    variability: 0.05,
    decayRate: 180,
    keywords: ['released', 'cut', 'waived', 'let go', 'didn\'t want'],
    patterns: [
      /released by .* (faces|plays|returns)/i,
      /cut by .* last (year|season|month)/i,
    ],
    historicalCoverRate: 0.56,
    sampleSize: 287,
    confidence: 0.80,
  },
  {
    id: 'revenge_coach',
    category: 'revenge',
    name: 'Coach Revenge Game',
    description: 'Coach facing team that fired them',
    baseImpact: +0.08,
    variability: 0.03,
    decayRate: 730,
    keywords: ['fired', 'former coach', 'let go', 'parted ways'],
    patterns: [
      /coach .* faces former team/i,
      /fired by .* returns/i,
      /first game against .* since (being )?fired/i,
    ],
    historicalCoverRate: 0.55,
    sampleSize: 156,
    confidence: 0.72,
  },
  {
    id: 'revenge_blowout',
    category: 'revenge',
    name: 'Blowout Loss Revenge',
    description: 'Team that got embarrassed last meeting',
    baseImpact: +0.09,
    variability: 0.04,
    decayRate: 365,
    keywords: ['blowout', 'embarrassed', 'destroyed', 'dominated', 'revenge'],
    patterns: [
      /lost (\d{2,})-\d+ last (meeting|time|year)/i,
      /blown out .* last/i,
      /embarrassed .* seeks revenge/i,
    ],
    historicalCoverRate: 0.57,
    sampleSize: 423,
    confidence: 0.88,
  },
  {
    id: 'revenge_playoff_loss',
    category: 'revenge',
    name: 'Playoff Elimination Revenge',
    description: 'Team facing opponent that eliminated them from playoffs',
    baseImpact: +0.14,
    variability: 0.05,
    decayRate: 365,
    keywords: ['eliminated', 'playoff loss', 'knocked out', 'ended season'],
    patterns: [
      /eliminated .* (in|from) (the )?playoffs/i,
      /playoff (loss|defeat) .* revenge/i,
      /first meeting since .* playoff/i,
    ],
    historicalCoverRate: 0.59,
    sampleSize: 178,
    confidence: 0.78,
  },

  // ==========================================
  // REDEMPTION NARRATIVES (+boost)
  // ==========================================
  {
    id: 'redemption_injury_return',
    category: 'redemption',
    name: 'Star Player Injury Return',
    description: 'Key player returning from major injury',
    baseImpact: +0.08,
    variability: 0.06,
    decayRate: 14,
    keywords: ['return', 'back from injury', 'first game since', 'healthy'],
    patterns: [
      /returns? (from|after) .* injury/i,
      /first game (back )?since .* surgery/i,
      /cleared to play after/i,
    ],
    historicalCoverRate: 0.54,
    sampleSize: 512,
    confidence: 0.82,
  },
  {
    id: 'redemption_benching',
    category: 'redemption',
    name: 'Post-Benching Redemption',
    description: 'Player starting after being benched',
    baseImpact: +0.11,
    variability: 0.05,
    decayRate: 21,
    keywords: ['benched', 'lost job', 'regained starting', 'earned back'],
    patterns: [
      /benched .* (now|back) starting/i,
      /lost (his|their) job .* chance to prove/i,
      /regained starting (role|position|job)/i,
    ],
    historicalCoverRate: 0.56,
    sampleSize: 234,
    confidence: 0.75,
  },
  {
    id: 'redemption_contract_year',
    category: 'redemption',
    name: 'Contract Year Performance',
    description: 'Player in final year of contract',
    baseImpact: +0.06,
    variability: 0.03,
    decayRate: 365,
    keywords: ['contract year', 'free agent', 'final year', 'prove worth'],
    patterns: [
      /contract year/i,
      /final year .* (deal|contract)/i,
      /(upcoming|pending) free agen(t|cy)/i,
      /playing for (his|their|a) (new )?(contract|deal)/i,
    ],
    historicalCoverRate: 0.54,
    sampleSize: 1247,
    confidence: 0.92,
  },

  // ==========================================
  // VALIDATION NARRATIVES (+boost)
  // ==========================================
  {
    id: 'validation_doubters',
    category: 'validation',
    name: 'Proving Doubters Wrong',
    description: 'Team/player responding to criticism',
    baseImpact: +0.07,
    variability: 0.04,
    decayRate: 14,
    keywords: ['doubters', 'prove', 'critics', 'nobody believes', 'disrespected'],
    patterns: [
      /prove .* (doubters|critics|wrong)/i,
      /nobody believes in/i,
      /chip on (his|their|our) shoulder/i,
      /disrespected/i,
      /bulletin board material/i,
    ],
    historicalCoverRate: 0.55,
    sampleSize: 678,
    confidence: 0.85,
  },
  {
    id: 'validation_draft_position',
    category: 'validation',
    name: 'Draft Snub Motivation',
    description: 'Player facing team that passed on them in draft',
    baseImpact: +0.05,
    variability: 0.03,
    decayRate: 730,
    keywords: ['passed on', 'draft', 'didn\'t select', 'overlooked'],
    patterns: [
      /passed on .* in (the )?draft/i,
      /drafted .* instead of/i,
      /faces team that (passed|didn\'t draft)/i,
    ],
    historicalCoverRate: 0.53,
    sampleSize: 312,
    confidence: 0.68,
  },
  {
    id: 'validation_ranking',
    category: 'validation',
    name: 'Ranking/Rating Disrespect',
    description: 'Team ranked lower than they believe they deserve',
    baseImpact: +0.04,
    variability: 0.02,
    decayRate: 7,
    keywords: ['disrespected', 'ranking', 'poll', 'underrated', 'snubbed'],
    patterns: [
      /ranked (too )?low/i,
      /disrespected in .* (poll|ranking)/i,
      /should be ranked higher/i,
    ],
    historicalCoverRate: 0.52,
    sampleSize: 445,
    confidence: 0.65,
  },

  // ==========================================
  // EMOTIONAL NARRATIVES (+boost)
  // ==========================================
  {
    id: 'emotional_teammate_injury',
    category: 'emotional',
    name: 'Playing for Injured Teammate',
    description: 'Team rallying around seriously injured player',
    baseImpact: +0.10,
    variability: 0.04,
    decayRate: 21,
    keywords: ['playing for', 'teammate', 'injury', 'rally', 'dedicate'],
    patterns: [
      /playing for .* (injured|hurt) teammate/i,
      /(rally|rallying) around/i,
      /dedicate .* (game|win|performance)/i,
    ],
    historicalCoverRate: 0.58,
    sampleSize: 145,
    confidence: 0.75,
  },
  {
    id: 'emotional_tragedy',
    category: 'emotional',
    name: 'Team Tragedy Response',
    description: 'Playing after death/tragedy in organization',
    baseImpact: +0.12,
    variability: 0.08,
    decayRate: 14,
    keywords: ['tragedy', 'death', 'passed away', 'honor', 'memory'],
    patterns: [
      /playing .* (after|following) (death|tragedy|loss)/i,
      /honor .* memory/i,
      /(tribute|memorial) game/i,
    ],
    historicalCoverRate: 0.60,
    sampleSize: 89,
    confidence: 0.68,
  },
  {
    id: 'emotional_homecoming',
    category: 'emotional',
    name: 'Hometown Hero Game',
    description: 'Player playing in hometown/college town',
    baseImpact: +0.04,
    variability: 0.03,
    decayRate: 1,
    keywords: ['hometown', 'homecoming', 'grew up', 'college town'],
    patterns: [
      /returns? to (hometown|where .* grew up)/i,
      /playing in front of .* (family|friends)/i,
      /homecoming/i,
    ],
    historicalCoverRate: 0.53,
    sampleSize: 278,
    confidence: 0.72,
  },

  // ==========================================
  // RIVALRY NARRATIVES (+boost but volatile)
  // ==========================================
  {
    id: 'rivalry_historic',
    category: 'rivalry',
    name: 'Historic Rivalry Game',
    description: 'Named rivalry with decades of history',
    baseImpact: +0.08,
    variability: 0.06,
    decayRate: 365,
    keywords: ['rivalry', 'hate', 'iron bowl', 'red river', 'the game'],
    patterns: [
      /(iron bowl|red river|the game|egg bowl|civil war)/i,
      /historic rival/i,
      /hate week/i,
    ],
    historicalCoverRate: 0.52,
    sampleSize: 890,
    confidence: 0.90,
  },
  {
    id: 'rivalry_division',
    category: 'rivalry',
    name: 'Division Rivalry',
    description: 'Division opponent with playoff implications',
    baseImpact: +0.05,
    variability: 0.04,
    decayRate: 30,
    keywords: ['division', 'rival', 'standings', 'playoff race'],
    patterns: [
      /division rival/i,
      /battle for .* (division|first place)/i,
      /division (showdown|clash)/i,
    ],
    historicalCoverRate: 0.51,
    sampleSize: 2340,
    confidence: 0.95,
  },

  // ==========================================
  // PRESSURE NARRATIVES (+/-)
  // ==========================================
  {
    id: 'pressure_must_win',
    category: 'pressure',
    name: 'Must-Win Game',
    description: 'Playoff/survival implications',
    baseImpact: +0.06,
    variability: 0.05,
    decayRate: 7,
    keywords: ['must win', 'must-win', 'playoff implications', 'season on the line'],
    patterns: [
      /must(-| )win/i,
      /season on the line/i,
      /playoff (hopes|implications|life)/i,
      /(win or go home|do or die)/i,
    ],
    historicalCoverRate: 0.54,
    sampleSize: 567,
    confidence: 0.82,
  },
  {
    id: 'pressure_primetime',
    category: 'pressure',
    name: 'Primetime Spotlight',
    description: 'National TV spotlight game',
    baseImpact: 0.00,
    variability: 0.08,
    decayRate: 1,
    keywords: ['primetime', 'monday night', 'sunday night', 'national tv'],
    patterns: [
      /(monday|sunday|thursday) night (football|game)/i,
      /primetime/i,
      /national (tv|television|spotlight)/i,
    ],
    historicalCoverRate: 0.50,
    sampleSize: 1890,
    confidence: 0.95,
  },

  // ==========================================
  // COMPLACENCY NARRATIVES (-drag)
  // ==========================================
  {
    id: 'complacency_trap',
    category: 'complacency',
    name: 'Trap Game',
    description: 'Overlooking opponent before/after big game',
    baseImpact: -0.08,
    variability: 0.04,
    decayRate: 7,
    keywords: ['trap game', 'look ahead', 'overlook', 'sandwich'],
    patterns: [
      /trap game/i,
      /(look|looking) ahead/i,
      /sandwich(ed)? between/i,
      /overlook/i,
    ],
    historicalCoverRate: 0.45,
    sampleSize: 456,
    confidence: 0.80,
  },
  {
    id: 'complacency_big_favorite',
    category: 'complacency',
    name: 'Heavy Favorite Letdown',
    description: 'Team favored by 14+ points',
    baseImpact: -0.04,
    variability: 0.03,
    decayRate: 1,
    keywords: [],
    patterns: [],
    historicalCoverRate: 0.47,
    sampleSize: 2100,
    confidence: 0.92,
  },
  {
    id: 'complacency_post_big_win',
    category: 'complacency',
    name: 'Post-Big Win Letdown',
    description: 'Coming off emotional/signature win',
    baseImpact: -0.06,
    variability: 0.04,
    decayRate: 7,
    keywords: ['coming off', 'after big win', 'emotional', 'hangover'],
    patterns: [
      /coming off .* (big|huge|emotional) win/i,
      /(emotional|super bowl|playoff) hangover/i,
      /after (beating|upset|knocking off)/i,
    ],
    historicalCoverRate: 0.46,
    sampleSize: 389,
    confidence: 0.78,
  },
  {
    id: 'complacency_championship_hangover',
    category: 'complacency',
    name: 'Championship Hangover',
    description: 'Defending champion early season',
    baseImpact: -0.07,
    variability: 0.05,
    decayRate: 60,
    keywords: ['defending champion', 'super bowl hangover', 'title defense'],
    patterns: [
      /(defending|reigning) champion/i,
      /(super bowl|championship) hangover/i,
      /title defense/i,
    ],
    historicalCoverRate: 0.44,
    sampleSize: 167,
    confidence: 0.72,
  },

  // ==========================================
  // TRANSITION NARRATIVES (+/-)
  // ==========================================
  {
    id: 'transition_new_coach',
    category: 'transition',
    name: 'New Head Coach',
    description: 'First season under new HC',
    baseImpact: +0.03,
    variability: 0.08,
    decayRate: 120,
    keywords: ['new coach', 'first season', 'new era', 'new regime'],
    patterns: [
      /new (head )?coach/i,
      /first (season|year|game) (under|with|for)/i,
      /new (era|regime)/i,
    ],
    historicalCoverRate: 0.52,
    sampleSize: 456,
    confidence: 0.75,
  },
  {
    id: 'transition_new_qb',
    category: 'transition',
    name: 'New Starting QB',
    description: 'Quarterback making first start',
    baseImpact: 0.00,
    variability: 0.12,
    decayRate: 30,
    keywords: ['first start', 'new quarterback', 'making debut', 'qb change'],
    patterns: [
      /first (career )?start/i,
      /(making|makes) (his )?debut/i,
      /new (starting )?quarterback/i,
    ],
    historicalCoverRate: 0.50,
    sampleSize: 678,
    confidence: 0.85,
  },
  {
    id: 'transition_fired_coach',
    category: 'transition',
    name: 'Post-Firing Bounce',
    description: 'First game after coach fired',
    baseImpact: +0.09,
    variability: 0.06,
    decayRate: 14,
    keywords: ['fired', 'interim', 'after firing', 'coaching change'],
    patterns: [
      /after .* (fired|let go|dismissed)/i,
      /interim (coach|head coach)/i,
      /first game (since|after) .* firing/i,
    ],
    historicalCoverRate: 0.57,
    sampleSize: 234,
    confidence: 0.78,
  },

  // ==========================================
  // ADVERSITY NARRATIVES (+boost)
  // ==========================================
  {
    id: 'adversity_losing_streak',
    category: 'adversity',
    name: 'Snapping Losing Streak',
    description: 'Team desperate to end losing streak',
    baseImpact: +0.05,
    variability: 0.04,
    decayRate: 30,
    keywords: ['losing streak', 'winless', 'snap streak', 'end skid'],
    patterns: [
      /(\d+)(-| )game losing streak/i,
      /snap .* (streak|skid)/i,
      /winless in (last )?\d+/i,
    ],
    historicalCoverRate: 0.54,
    sampleSize: 567,
    confidence: 0.82,
  },
  {
    id: 'adversity_underdog',
    category: 'adversity',
    name: 'Significant Underdog',
    description: 'Team getting 10+ points',
    baseImpact: +0.03,
    variability: 0.02,
    decayRate: 1,
    keywords: [],
    patterns: [],
    historicalCoverRate: 0.53,
    sampleSize: 3400,
    confidence: 0.95,
  },

  // ==========================================
  // EXTERNAL NARRATIVES (- drag usually)
  // ==========================================
  {
    id: 'external_legal',
    category: 'external',
    name: 'Legal Troubles',
    description: 'Player dealing with legal issues',
    baseImpact: -0.06,
    variability: 0.05,
    decayRate: 30,
    keywords: ['arrested', 'legal', 'lawsuit', 'investigation', 'suspended'],
    patterns: [
      /(arrested|charged|indicted)/i,
      /legal (trouble|issues|problems)/i,
      /(facing|under) investigation/i,
    ],
    historicalCoverRate: 0.47,
    sampleSize: 234,
    confidence: 0.72,
  },
  {
    id: 'external_contract_dispute',
    category: 'external',
    name: 'Contract Dispute',
    description: 'Player/team in contract standoff',
    baseImpact: -0.05,
    variability: 0.04,
    decayRate: 60,
    keywords: ['holdout', 'contract dispute', 'wants trade', 'unhappy'],
    patterns: [
      /hold(ing)?( )?out/i,
      /contract (dispute|impasse|standoff)/i,
      /(wants|requesting|demanded) (a )?trade/i,
    ],
    historicalCoverRate: 0.48,
    sampleSize: 178,
    confidence: 0.70,
  },
];

/**
 * Get narrative by ID
 */
export function getNarrativeById(id: string): NarrativeType | undefined {
  return NARRATIVE_CATALOG.find(n => n.id === id);
}

/**
 * Get narratives by category
 */
export function getNarrativesByCategory(category: NarrativeCategory): NarrativeType[] {
  return NARRATIVE_CATALOG.filter(n => n.category === category);
}

/**
 * Get all positive narratives (baseImpact > 0)
 */
export function getPositiveNarratives(): NarrativeType[] {
  return NARRATIVE_CATALOG.filter(n => n.baseImpact > 0);
}

/**
 * Get all negative narratives (baseImpact < 0)
 */
export function getNegativeNarratives(): NarrativeType[] {
  return NARRATIVE_CATALOG.filter(n => n.baseImpact < 0);
}

