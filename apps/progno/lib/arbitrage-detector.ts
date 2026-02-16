export interface ArbitrageOpportunity {
  gameId: string;
  profitPercentage: number;
  stakeHome: number;
  stakeAway: number;
  side1: { sportsbook: string; odds: number };
  side2: { sportsbook: string; odds: number };
}

export class ArbitrageDetector {
  static async findOpportunities(params: any): Promise<ArbitrageOpportunity[]> { return []; }
}
