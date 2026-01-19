/**
 * Temporal Relevance Decay (TRD)
 * Applies recency weighting to events
 */

export interface TemporalEvent {
  daysAgo: number;
  impact: number;      // Original impact (-1 to +1)
  type: string;        // Event type
  description: string;
}

export interface TemporalDecayResult {
  originalImpact: number;
  decayedImpact: number;
  decayFactor: number;
  events: Array<{
    event: TemporalEvent;
    decayedImpact: number;
  }>;
}

/**
 * Sport-specific decay constants
 */
const DECAY_CONSTANTS = {
  nfl: 0.15,    // Weekly games, slower decay
  nba: 0.25,    // Daily games, faster decay
  mlb: 0.30,    // Daily games, very fast decay
  nhl: 0.25,
  ncaa: 0.20,
  default: 0.20,
};

/**
 * Events that DON'T decay (structural advantages)
 */
const NON_DECAY_EVENTS = [
  'structural_advantage',
  'systemic_issue',
  'talent_gap',
  'venue_advantage',
  'altitude',
  'dome',
];

/**
 * Temporal Relevance Decay Calculator
 */
export class TemporalDecayCalculator {
  /**
   * Apply temporal decay to events
   */
  calculate(
    events: TemporalEvent[],
    sport: string
  ): TemporalDecayResult {

    const lambda = DECAY_CONSTANTS[sport.toLowerCase() as keyof typeof DECAY_CONSTANTS] ||
                   DECAY_CONSTANTS.default;

    let totalOriginalImpact = 0;
    let totalDecayedImpact = 0;

    const decayedEvents = events.map(event => {
      // Check if event should decay
      const shouldDecay = !NON_DECAY_EVENTS.includes(event.type);

      let decayFactor = 1.0;
      if (shouldDecay) {
        // Exponential decay: e^(-λ × days)
        decayFactor = Math.exp(-lambda * event.daysAgo);
      }

      const decayedImpact = event.impact * decayFactor;

      totalOriginalImpact += event.impact;
      totalDecayedImpact += decayedImpact;

      return {
        event,
        decayedImpact,
      };
    });

    const avgDecayFactor = totalOriginalImpact !== 0
      ? totalDecayedImpact / totalOriginalImpact
      : 1.0;

    return {
      originalImpact: totalOriginalImpact,
      decayedImpact: totalDecayedImpact,
      decayFactor: Math.max(0.5, Math.min(1.0, avgDecayFactor)), // Clamp 0.5 to 1.0
      events: decayedEvents,
    };
  }

  /**
   * Apply decay to a single impact value
   */
  applyDecay(
    impact: number,
    daysAgo: number,
    sport: string,
    eventType?: string
  ): number {

    // Check if should decay
    if (eventType && NON_DECAY_EVENTS.includes(eventType)) {
      return impact; // No decay
    }

    const lambda = DECAY_CONSTANTS[sport.toLowerCase() as keyof typeof DECAY_CONSTANTS] ||
                   DECAY_CONSTANTS.default;

    const decayFactor = Math.exp(-lambda * daysAgo);
    return impact * decayFactor;
  }
}

