/**
 * Information Asymmetry Index (IAI) - Signal Catalog
 * Tracks "smart money" signals from betting markets
 */

export interface LineMovement {
  timestamp: Date;
  book: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  line: number;           // Spread or total
  lineType: 'spread' | 'total' | 'moneyline';
  previousLine?: number;
  movement: number;       // Change in line (positive = toward home, negative = toward away)
}

export interface BettingSplit {
  timestamp: Date;
  team: 'home' | 'away';
  ticketPercentage: number;  // % of bets
  handlePercentage: number;   // % of money
  gap: number;                // handle - ticket (positive = sharp money)
}

export interface ReverseLineMovement {
  detected: boolean;
  publicTicketPct: number;    // % of public on favorite
  lineMovement: number;        // Actual line movement
  direction: 'with_public' | 'against_public' | 'neutral';
  strength: number;            // 0 to 1
  score: number;               // -0.25 to +0.25
}

export interface SteamMove {
  detected: boolean;
  side: 'home' | 'away';
  magnitude: number;           // Points moved
  velocity: number;             // Books moved per minute
  booksAffected: string[];
  timestamp: Date;
  score: number;                // -0.25 to +0.25
}

export interface ProEdge {
  detected: boolean;
  team: 'home' | 'away';
  ticketPct: number;
  handlePct: number;
  gap: number;                  // handle - ticket
  score: number;                // -0.25 to +0.25
}

export interface LineFreeze {
  detected: boolean;
  publicTicketPct: number;     // Heavy public action
  lineStable: boolean;          // Line hasn't moved
  duration: number;             // Minutes line has been frozen
  score: number;                // -0.25 to +0.25
}

/**
 * Signal weights for IAI calculation
 */
export const IAI_WEIGHTS = {
  rlm: 0.40,        // Reverse Line Movement (strongest signal)
  steam: 0.30,      // Steam Moves
  proEdge: 0.20,    // Handle vs Ticket gap
  freeze: 0.10,     // Line Freeze
};

/**
 * Normalize IAI score to probability modifier
 */
export function normalizeIAIScore(iaiScore: number): {
  modifier: number;      // Probability modifier (-0.08 to +0.08)
  interpretation: string;
  recommendation: string;
} {
  let modifier = 0;
  let interpretation = '';
  let recommendation = '';

  if (iaiScore >= 0.20) {
    modifier = 0.08;
    interpretation = '🚨 MAX SHARP: Unified Sharp Support';
    recommendation = 'Strong buy signal - sharps heavily favor this side';
  } else if (iaiScore >= 0.10) {
    modifier = 0.05;
    interpretation = '🟢 STRONG: Clear Professional Edge';
    recommendation = 'Positive sharp money detected';
  } else if (iaiScore >= 0.05) {
    modifier = 0.03;
    interpretation = '🟡 MODERATE: Slight Sharp Edge';
    recommendation = 'Minor sharp support';
  } else if (iaiScore >= -0.05) {
    modifier = 0;
    interpretation = '⚪ NEUTRAL: Market is Balanced';
    recommendation = 'No clear sharp signal';
  } else if (iaiScore >= -0.10) {
    modifier = -0.03;
    interpretation = '🟠 WEAK: Public Heavy, Sharps Fading';
    recommendation = 'Caution - public on this side, sharps opposing';
  } else if (iaiScore >= -0.20) {
    modifier = -0.05;
    interpretation = '🔴 FADE: Clear Sharp Opposition';
    recommendation = 'Strong fade signal - sharps betting against';
  } else {
    modifier = -0.08;
    interpretation = '☠️ TOXIC: Public Dog / Square Trap';
    recommendation = 'Maximum fade - public trap, avoid or bet opposite';
  }

  return { modifier, interpretation, recommendation };
}

