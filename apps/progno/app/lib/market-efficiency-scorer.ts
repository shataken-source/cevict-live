/**
 * Market Efficiency Scorer Service
 * Rates how "sharp" each sportsbook's lines are
 */

import { createClient } from '@supabase/supabase-js';

export interface SportsbookRating {
  name: string;
  sharpnessScore: number; // 0-100
  category: 'sharp' | 'semi-sharp' | 'square' | 'recreational';
  lineAccuracy: number;
  closingLineValue: number;
  beatability: 'hard' | 'moderate' | 'soft';
  bestMarkets: string[];
  worstMarkets: string[];
}

export interface LineComparison {
  gameId: string;
  market: string;
  consensusLine: number;
  books: Array<{
    name: string;
    line: number;
    deviation: number;
    juice: number;
  }>;
  outlierBooks: string[];
}

export class MarketEfficiencyScorer {
  private supabase: ReturnType<typeof createClient>;
  private bookRatings: Map<string, SportsbookRating> = new Map();

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials required');
    }
    this.supabase = createClient(url, key);
    this.initializeDefaultRatings();
  }

  /**
   * Get all sportsbook ratings
   */
  async getBookRatings(): Promise<SportsbookRating[]> {
    // Try to get from database first
    const { data, error } = await this.supabase
      .from('sportsbook_ratings')
      .select('*')
      .order('sharpness_score', { ascending: false });

    if (data && data.length > 0) {
      return data.map((r: any) => ({
        name: r.name,
        sharpnessScore: r.sharpness_score,
        category: r.category,
        lineAccuracy: r.line_accuracy,
        closingLineValue: r.closing_line_value,
        beatability: r.beatability,
        bestMarkets: r.best_markets || [],
        worstMarkets: r.worst_markets || [],
      }));
    }

    // Return defaults if no database records
    return Array.from(this.bookRatings.values());
  }

  /**
   * Rate a specific sportsbook based on historical performance
   */
  async rateSportsbook(
    bookName: string,
    days: number = 90
  ): Promise<SportsbookRating> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get historical lines for this book
    const { data, error } = await this.supabase
      .from('odds_history')
      .select('game_id, market, line, closing_line, result')
      .eq('book_name', bookName)
      .gte('recorded_at', startDate);

    if (error || !data || data.length === 0) {
      return this.bookRatings.get(bookName) || this.getDefaultRating(bookName);
    }

    // Calculate metrics
    let totalDeviation = 0;
    let clvTotal = 0;
    let clvCount = 0;

    for (const record of data as any[]) {
      if (record.closing_line) {
        const deviation = Math.abs(record.line - record.closing_line);
        totalDeviation += deviation;

        // Closing Line Value: did line move toward or away from this book's opening?
        const lineMovement = record.closing_line - record.line;
        const resultDiff = record.result - record.line; // Simplified

        if (Math.sign(lineMovement) === Math.sign(resultDiff)) {
          clvTotal += 1; // Line moved toward result = good for bettors
        }
        clvCount++;
      }
    }

    const avgDeviation = data.length > 0 ? totalDeviation / data.length : 0;
    const clv = clvCount > 0 ? (clvTotal / clvCount) * 100 : 50;

    // Calculate sharpness score
    let sharpness = 50;
    sharpness -= avgDeviation * 2; // Less deviation = sharper
    sharpness += (clv - 50) * 0.5; // Better CLV = less sharp (more beatable)
    sharpness = Math.max(0, Math.min(100, sharpness));

    const category = this.categorizeSharpness(sharpness);

    return {
      name: bookName,
      sharpnessScore: Math.round(sharpness),
      category,
      lineAccuracy: Math.max(0, 100 - avgDeviation * 5),
      closingLineValue: Math.round(clv * 10) / 10,
      beatability: clv > 55 ? 'soft' : clv < 45 ? 'hard' : 'moderate',
      bestMarkets: [], // Would analyze per-market
      worstMarkets: [],
    };
  }

  /**
   * Compare lines across books to find outliers
   */
  async compareLines(
    gameId: string,
    market: string
  ): Promise<LineComparison> {
    const { data, error } = await this.supabase
      .from('current_odds')
      .select('book_name, line, juice')
      .eq('game_id', gameId)
      .eq('market', market);

    if (error || !data || data.length === 0) {
      return {
        gameId,
        market,
        consensusLine: 0,
        books: [],
        outlierBooks: [],
      };
    }

    // Calculate consensus
    const lines = (data as any[]).map((d: any) => d.line);
    const consensus = lines.reduce((a: number, b: number) => a + b, 0) / lines.length;

    // Calculate deviations
    const books = (data as any[]).map((d: any) => ({
      name: d.book_name,
      line: d.line,
      deviation: Math.abs(d.line - consensus),
      juice: d.juice || 110,
    }));

    // Find outliers (> 2 points from consensus)
    const outlierBooks = books
      .filter(b => b.deviation > 2)
      .map(b => b.name);

    return {
      gameId,
      market,
      consensusLine: Math.round(consensus * 2) / 2,
      books,
      outlierBooks,
    };
  }

  /**
   * Get the sharpest line for a game
   */
  async getSharpestLine(
    gameId: string,
    market: string
  ): Promise<{ line: number; book: string; confidence: number } | null> {
    const ratings = await this.getBookRatings();
    const comparison = await this.compareLines(gameId, market);

    if (comparison.books.length === 0) return null;

    // Weight by sharpness
    let weightedSum = 0;
    let totalWeight = 0;

    for (const book of comparison.books) {
      const rating = ratings.find(r =>
        r.name.toLowerCase() === book.name.toLowerCase()
      );
      const weight = rating ? rating.sharpnessScore / 100 : 0.5;

      weightedSum += book.line * weight;
      totalWeight += weight;
    }

    const sharpLine = weightedSum / totalWeight;

    // Find closest book to weighted average
    const closest = comparison.books.reduce((prev, curr) =>
      Math.abs(curr.line - sharpLine) < Math.abs(prev.line - sharpLine) ? curr : prev
    );

    return {
      line: Math.round(sharpLine * 2) / 2,
      book: closest.name,
      confidence: comparison.books.length > 3 ? 80 : 60,
    };
  }

  /**
   * Identify soft lines (potential value bets)
   */
  async findSoftLines(
    minEdge: number = 2
  ): Promise<Array<{
    gameId: string;
    book: string;
    market: string;
    line: number;
    sharpLine: number;
    edge: number;
    bookRating: SportsbookRating;
  }>> {
    // Get today's games
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('games')
      .select('id')
      .gte('game_time', today)
      .lte('game_time', today + 'T23:59:59');

    if (error || !data) return [];

    const softLines = [];
    const ratings = await this.getBookRatings();
    const squareBooks = ratings.filter(r => r.category === 'square' || r.category === 'recreational');

    for (const game of (data as any[]).slice(0, 20)) { // Check first 20 games
      for (const market of ['spread', 'total', 'moneyline']) {
        const comparison = await this.compareLines(game.id, market);
        const sharpLine = await this.getSharpestLine(game.id, market);

        if (!sharpLine) continue;

        for (const book of comparison.books) {
          const bookRating = ratings.find(r =>
            r.name.toLowerCase() === book.name.toLowerCase()
          );

          // Only flag soft books
          if (!bookRating || !squareBooks.some(sb => sb.name === bookRating.name)) continue;

          const edge = Math.abs(book.line - sharpLine.line);

          if (edge >= minEdge) {
            softLines.push({
              gameId: game.id,
              book: book.name,
              market,
              line: book.line,
              sharpLine: sharpLine.line,
              edge: Math.round(edge * 10) / 10,
              bookRating,
            });
          }
        }
      }
    }

    return softLines.sort((a, b) => b.edge - a.edge);
  }

  /**
   * Update ratings based on new grading data
   */
  async updateRatingsFromGrading(): Promise<void> {
    const books = Array.from(this.bookRatings.keys());

    for (const book of books) {
      const rating = await this.rateSportsbook(book, 30);

      await (this.supabase
        .from('sportsbook_ratings') as any)
        .upsert({
          name: book,
          sharpness_score: rating.sharpnessScore,
          category: rating.category,
          line_accuracy: rating.lineAccuracy,
          closing_line_value: rating.closingLineValue,
          beatability: rating.beatability,
          updated_at: new Date().toISOString(),
        });

      this.bookRatings.set(book, rating);
    }
  }

  private categorizeSharpness(score: number): SportsbookRating['category'] {
    if (score >= 75) return 'sharp';
    if (score >= 55) return 'semi-sharp';
    if (score >= 35) return 'square';
    return 'recreational';
  }

  private initializeDefaultRatings(): void {
    const defaults: SportsbookRating[] = [
      {
        name: 'Pinnacle',
        sharpnessScore: 95,
        category: 'sharp',
        lineAccuracy: 94,
        closingLineValue: 48,
        beatability: 'hard',
        bestMarkets: ['moneyline', 'spread'],
        worstMarkets: ['props'],
      },
      {
        name: 'Circa',
        sharpnessScore: 90,
        category: 'sharp',
        lineAccuracy: 91,
        closingLineValue: 49,
        beatability: 'hard',
        bestMarkets: ['spread', 'total'],
        worstMarkets: [],
      },
      {
        name: 'DraftKings',
        sharpnessScore: 65,
        category: 'semi-sharp',
        lineAccuracy: 72,
        closingLineValue: 52,
        beatability: 'moderate',
        bestMarkets: ['moneyline'],
        worstMarkets: ['props', 'futures'],
      },
      {
        name: 'FanDuel',
        sharpnessScore: 60,
        category: 'semi-sharp',
        lineAccuracy: 70,
        closingLineValue: 53,
        beatability: 'moderate',
        bestMarkets: ['spread'],
        worstMarkets: ['parlay'],
      },
      {
        name: 'BetMGM',
        sharpnessScore: 50,
        category: 'square',
        lineAccuracy: 65,
        closingLineValue: 55,
        beatability: 'soft',
        bestMarkets: [],
        worstMarkets: ['total'],
      },
      {
        name: 'Caesars',
        sharpnessScore: 45,
        category: 'square',
        lineAccuracy: 62,
        closingLineValue: 56,
        beatability: 'soft',
        bestMarkets: [],
        worstMarkets: ['moneyline'],
      },
    ];

    for (const rating of defaults) {
      this.bookRatings.set(rating.name, rating);
    }
  }

  private getDefaultRating(bookName: string): SportsbookRating {
    return {
      name: bookName,
      sharpnessScore: 50,
      category: 'square',
      lineAccuracy: 60,
      closingLineValue: 52,
      beatability: 'moderate',
      bestMarkets: [],
      worstMarkets: [],
    };
  }
}

export default MarketEfficiencyScorer;
