/**
 * Prediction with Data Enrichment
 * Wrapper that enriches games with all purchased data sources before prediction
 *
 * Data Sources Used:
 * - SportsDataIO API: Team statistics, advanced metrics
 * - Rotowire API: Injury reports, depth charts
 * - API-Football: Soccer/basketball data (if applicable)
 * - The Odds API: Odds, line movement tracking
 * - Historical Results: H2H history, recent form
 */

import { Game, GamePrediction, ModelCalibration, predictGame } from '../../app/weekly-analyzer';
import { enrichGame } from './game-enricher';

/**
 * Predict a game with automatic data enrichment from all purchased sources
 * This is the recommended way to make predictions as it includes:
 * - Injury data from Rotowire API (or file fallback)
 * - Team stats from SportsDataIO API (or historical fallback)
 * - Historical results and H2H history
 * - Recent team performance
 * - Line movement tracking
 */
export async function predictGameWithEnrichment(
  game: Game,
  calibration?: ModelCalibration
): Promise<GamePrediction> {
  // Enrich the game with all available data sources
  const enrichedGame = await enrichGame(game);

  // Make prediction with enriched data
  return predictGame(enrichedGame, calibration);
}

/**
 * Predict multiple games with enrichment (parallel processing)
 */
export async function predictGamesWithEnrichment(
  games: Game[],
  calibration?: ModelCalibration
): Promise<GamePrediction[]> {
  // Process games in parallel for better performance
  const predictions = await Promise.all(
    games.map(game => predictGameWithEnrichment(game, calibration))
  );

  return predictions;
}

