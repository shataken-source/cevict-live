/**
 * SPORTS FLUX PREDICTOR
 * Integrates CEVICT Flux Engine v2 for advanced sports predictions on Kalshi markets
 */

import { spawn } from 'child_process';
import path from 'path';

interface FluxPrediction {
  homeTeam: string;
  awayTeam: string;
  predictedWinner: string;
  confidence: number;
  spread: number;
  models: {
    [key: string]: number;
  };
  factors: string[];
}

export class SportsFluxPredictor {
  private fluxEnginePath: string;

  constructor() {
    // Path to the CEVICT Flux Engine
    this.fluxEnginePath = path.resolve(process.cwd(), '../../engine/v2/cevict-flux-engine.ts');
  }

  /**
   * Extract team matchup from Kalshi market title
   */
  extractMatchup(title: string): { homeTeam: string; awayTeam: string; sport: string } | null {
    const titleLower = title.toLowerCase();

    // Try to find team vs team patterns
    const patterns = [
      // "Chiefs vs Ravens"
      /(\w+(?:\s+\w+)?)\s+vs\.?\s+(\w+(?:\s+\w+)?)/i,
      // "Chiefs to win against Ravens"
      /(\w+(?:\s+\w+)?)\s+to\s+win\s+against\s+(\w+(?:\s+\w+)?)/i,
      // "Will Chiefs beat Ravens"
      /will\s+(\w+(?:\s+\w+)?)\s+beat\s+(\w+(?:\s+\w+)?)/i,
      // "Chiefs win over Ravens"
      /(\w+(?:\s+\w+)?)\s+win\s+over\s+(\w+(?:\s+\w+)?)/i,
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const team1 = match[1].trim();
        const team2 = match[2].trim();

        // Determine sport
        let sport = 'nfl'; // default
        if (titleLower.includes('nba') || titleLower.includes('basketball')) {
          sport = 'nba';
        } else if (titleLower.includes('nhl') || titleLower.includes('hockey')) {
          sport = 'nhl';
        } else if (titleLower.includes('mlb') || titleLower.includes('baseball')) {
          sport = 'mlb';
        } else if (titleLower.includes('ncaa') || titleLower.includes('college')) {
          sport = 'ncaaf';
        }

        // Assume first team is home team (or infer from context)
        return {
          homeTeam: team2, // Second team is usually home in "vs" format
          awayTeam: team1,
          sport
        };
      }
    }

    return null;
  }

  /**
   * Run CEVICT Flux Engine prediction
   */
  async predictGame(homeTeam: string, awayTeam: string, sport: string = 'nfl'): Promise<FluxPrediction | null> {
    return new Promise((resolve) => {
      try {
        // Build command to run flux engine
        const command = 'npx';
        const args = [
          'tsx',
          this.fluxEnginePath,
          homeTeam,
          'vs',
          awayTeam
        ];

        const child = spawn(command, args, {
          cwd: path.dirname(this.fluxEnginePath),
          env: { ...process.env },
          shell: true
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        // Timeout after 15 seconds
        const timeout = setTimeout(() => {
          child.kill();
          resolve(null);
        }, 15000);

        child.on('close', (code) => {
          clearTimeout(timeout);

          if (code !== 0) {
            console.log(`   ${homeTeam} vs ${awayTeam}: Flux engine error`);
            resolve(null);
            return;
          }

          // Parse flux engine output
          try {
            const prediction = this.parseFluxOutput(output, homeTeam, awayTeam);
            resolve(prediction);
          } catch (e) {
            console.log(`   ${homeTeam} vs ${awayTeam}: Failed to parse flux output`);
            resolve(null);
          }
        });
      } catch (error) {
        resolve(null);
      }
    });
  }

  /**
   * Parse CEVICT Flux Engine output
   */
  private parseFluxOutput(output: string, homeTeam: string, awayTeam: string): FluxPrediction | null {
    try {
      // Look for prediction summary in output
      const lines = output.split('\n');

      let confidence = 54; // default
      let predictedWinner = homeTeam;
      let spread = 0;
      const models: { [key: string]: number } = {};
      const factors: string[] = [];

      for (const line of lines) {
        // Extract confidence
        if (line.includes('Confidence:') || line.includes('confidence')) {
          const confMatch = line.match(/(\d+\.?\d*)%/);
          if (confMatch) {
            confidence = parseFloat(confMatch[1]);
          }
        }

        // Extract winner
        if (line.includes('Winner:') || line.includes('Predicted:')) {
          if (line.toLowerCase().includes(homeTeam.toLowerCase())) {
            predictedWinner = homeTeam;
          } else if (line.toLowerCase().includes(awayTeam.toLowerCase())) {
            predictedWinner = awayTeam;
          }
        }

        // Extract spread
        if (line.includes('Spread:') || line.includes('spread')) {
          const spreadMatch = line.match(/([-+]?\d+\.?\d*)/);
          if (spreadMatch) {
            spread = parseFloat(spreadMatch[1]);
          }
        }

        // Extract model predictions
        const modelMatch = line.match(/(Bayesian|Elo|Poisson|Regression|Forest|Boosting|Neural|SVM).*?(\d+\.?\d*)%/i);
        if (modelMatch) {
          models[modelMatch[1]] = parseFloat(modelMatch[2]);
        }

        // Extract key factors
        if (line.includes('•') || line.includes('-')) {
          const factor = line.trim().replace(/^[•\-]\s*/, '');
          if (factor.length > 10 && factor.length < 100) {
            factors.push(factor);
          }
        }
      }

      return {
        homeTeam,
        awayTeam,
        predictedWinner,
        confidence,
        spread,
        models,
        factors: factors.slice(0, 5)
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Convert flux prediction to Kalshi market prediction
   */
  convertToKalshiPrediction(
    fluxPrediction: FluxPrediction,
    market: any,
    marketFavorsTeam: string
  ): { probability: number; confidence: number; factors: string[]; reasoning: string[] } {
    const { predictedWinner, confidence, factors } = fluxPrediction;

    // Determine if we agree with the market
    const weAgree = predictedWinner.toLowerCase() === marketFavorsTeam.toLowerCase();

    // If flux engine predicts this team wins
    let probability = weAgree ? confidence : (100 - confidence);

    // Adjust based on market price to find edge
    const marketImpliedProb = market.yesPrice;

    // Our edge
    const edge = probability - marketImpliedProb;

    const reasoning = [
      `CEVICT Flux Engine predicts ${predictedWinner} (${confidence.toFixed(1)}% confidence)`,
      `Market implies ${marketImpliedProb.toFixed(1)}% probability`,
      `Our edge: ${edge >= 0 ? '+' : ''}${edge.toFixed(1)}%`,
    ];

    return {
      probability,
      confidence,
      factors,
      reasoning
    };
  }
}

// Export singleton
export const sportsFluxPredictor = new SportsFluxPredictor();

