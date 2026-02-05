/**
 * Claude Effect Integration Helper
 * Gathers data from all 7 phases and applies to predictions
 */

import { ClaudeEffectEngine } from './claude-effect';

export interface ClaudeEffectData {
  sentiment?: any;
  narratives?: any;
  informationAsymmetry?: any;
  chaosFactors?: any;
  network?: any;
  temporal?: any;
  emergent?: any;
}

/**
 * Gather Claude Effect data for a game
 */
export async function gatherClaudeEffectData(
  gameData: any,
  options: {
    includePhase1?: boolean;
    includePhase2?: boolean;
    includePhase3?: boolean;
    includePhase4?: boolean;
    includePhase5?: boolean;
    includePhase6?: boolean;
    includePhase7?: boolean;
  } = {}
): Promise<ClaudeEffectData> {
  const {
    includePhase1 = true,
    includePhase2 = true,
    includePhase3 = true,
    includePhase4 = true,
    includePhase5 = false, // Optional for now
    includePhase6 = false, // Optional for now
    includePhase7 = false, // Optional for now
  } = options;

  // Determine base URL for API calls
  let baseUrl = 'http://localhost:3000';
  if (process.env.NEXT_PUBLIC_PROGNO_URL) {
    baseUrl = process.env.NEXT_PUBLIC_PROGNO_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else if (typeof window !== 'undefined') {
    baseUrl = window.location.origin;
  } else if (process.env.PORT) {
    baseUrl = `http://localhost:${process.env.PORT}`;
  }

  const results: ClaudeEffectData = {};

  // Phase 1: Sentiment Field
  if (includePhase1) {
    try {
      // Try direct import first (server-side), fallback to API (client-side)
      if (typeof window === 'undefined') {
        try {
          const sentimentModule = require('./sentiment/scoring-engine');
          const sentimentData = await sentimentModule.calculateSentimentField(
            gameData.homeTeam?.toLowerCase().replace(/\s+/g, '-'),
            gameData.homeTeam,
            gameData.id || gameData.gameId
          );
          results.sentiment = sentimentData;
        } catch (directError) {
          // Fallback to API call
          const response = await fetch(`${baseUrl}/api/sentiment/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teamId: gameData.homeTeam?.toLowerCase().replace(/\s+/g, '-'),
              teamName: gameData.homeTeam,
              gameId: gameData.id || gameData.gameId,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            results.sentiment = data.data;
          }
        }
      } else {
        // Client-side: use API
        const response = await fetch(`${baseUrl}/api/sentiment/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: gameData.homeTeam?.toLowerCase().replace(/\s+/g, '-'),
            teamName: gameData.homeTeam,
            gameId: gameData.id || gameData.gameId,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          results.sentiment = data.data;
        }
      }
    } catch (error) {
      console.warn('[Claude Effect] Phase 1 (SF) failed:', error);
    }
  }

  // Phase 2: Narrative Momentum
  if (includePhase2) {
    try {
      const response = await fetch(`${baseUrl}/api/narrative/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: gameData.homeTeam?.toLowerCase().replace(/\s+/g, '-'),
          teamName: gameData.homeTeam,
          opponentId: gameData.awayTeam?.toLowerCase().replace(/\s+/g, '-'),
          opponentName: gameData.awayTeam,
          gameId: gameData.id || gameData.gameId,
          context: {
            gameDate: gameData.date || gameData.commence_time,
            schedule: gameData.schedule,
            roster: gameData.roster,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        results.narratives = data.data;
      }
    } catch (error) {
      console.warn('[Claude Effect] Phase 2 (NM) failed:', error);
    }
  }

  // Phase 3: Information Asymmetry Index
  if (includePhase3 && gameData.odds) {
    try {
      const response = await fetch(`${baseUrl}/api/iai/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameData.id || gameData.gameId,
          context: {
            openingLine: gameData.odds.spread || 0,
            currentLine: gameData.odds.spread || 0,
            isHomeFavorite: (gameData.odds.home || 0) < (gameData.odds.away || 0),
            sport: gameData.league || 'NFL',
            publicTicketPct: gameData.betSplits?.public || 0.5,
            bettingSplits: gameData.betSplits,
            recentMovements: gameData.lineMovement,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        results.informationAsymmetry = data.data;
      }
    } catch (error) {
      console.warn('[Claude Effect] Phase 3 (IAI) failed:', error);
    }
  }

  // Phase 4: Chaos Sensitivity Index
  if (includePhase4) {
    try {
      const response = await fetch(`${baseUrl}/api/csi/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameData.id || gameData.gameId,
          context: {
            sport: gameData.league || 'NFL',
            weather: gameData.weather,
            schedule: {
              isShortWeek: gameData.isShortWeek,
              isTrapGame: gameData.isTrapGame,
              daysRest: gameData.daysRest,
              travelLag: gameData.travelLag,
            },
            roster: {
              clusterInjuries: gameData.clusterInjuries,
              keyInjuries: gameData.keyInjuries,
            },
            rivalry: {
              isDivisionRivalry: gameData.isDivisionRivalry,
              isHistoricRivalry: gameData.isHistoricRivalry,
            },
            referee: gameData.referee,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        results.chaosFactors = data.data;
      }
    } catch (error) {
      console.warn('[Claude Effect] Phase 4 (CSI) failed:', error);
    }
  }

  // Phase 5: Network Influence Graph (optional)
  if (includePhase5 && gameData.players && gameData.relationships) {
    try {
      const response = await fetch(`${baseUrl}/api/nig/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: gameData.homeTeam?.toLowerCase().replace(/\s+/g, '-'),
          gameId: gameData.id || gameData.gameId,
          players: gameData.players,
          relationships: gameData.relationships,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        results.network = data.data;
      }
    } catch (error) {
      console.warn('[Claude Effect] Phase 5 (NIG) failed:', error);
    }
  }

  // Phase 6: Temporal Relevance Decay (optional)
  if (includePhase6 && gameData.recentEvents) {
    try {
      const response = await fetch(`${baseUrl}/api/temporal/decay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: gameData.league || 'NFL',
          events: gameData.recentEvents,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        results.temporal = data.data;
      }
    } catch (error) {
      console.warn('[Claude Effect] Phase 6 (TRD) failed:', error);
    }
  }

  // Phase 7: Emergent Pattern Detection (optional)
  if (includePhase7) {
    try {
      const response = await fetch(`${baseUrl}/api/emergent/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            teamId: gameData.homeTeam?.toLowerCase().replace(/\s+/g, '-'),
            opponentId: gameData.awayTeam?.toLowerCase().replace(/\s+/g, '-'),
            gameData: gameData,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        results.emergent = data.data;
      }
    } catch (error) {
      console.warn('[Claude Effect] Phase 7 (EPD) failed:', error);
    }
  }

  return results;
}

/**
 * Apply Claude Effect to a prediction
 */
export async function applyClaudeEffect(
  baseProbability: number,
  baseConfidence: number,
  gameData: any,
  claudeData: ClaudeEffectData
): Promise<{
  adjustedProbability: number;
  adjustedConfidence: number;
  claudeEffect: number;
  scores: any;
  reasoning: string[];
  warnings: string[];
  recommendations: any;
}> {
  const engine = new ClaudeEffectEngine();

  // Transform API responses to Claude Effect engine format
  const context: any = {};

  // Phase 1: Sentiment Field
  if (claudeData.sentiment) {
    context.sentiment = {
      playerInterviews: claudeData.sentiment.componentScores?.player || 0,
      socialMedia: claudeData.sentiment.componentScores?.social || 0,
      pressConferences: claudeData.sentiment.componentScores?.press || 0,
      fanSentiment: claudeData.sentiment.componentScores?.fan || 0,
      beatReporterTone: claudeData.sentiment.componentScores?.beatReporter || 0,
    };
  }

  // Phase 2: Narrative Momentum
  if (claudeData.narratives) {
    context.narratives = claudeData.narratives.detectedNarratives || [];
  }

  // Phase 3: Information Asymmetry
  if (claudeData.informationAsymmetry) {
    context.informationAsymmetry = {
      reverseLineMovement: claudeData.informationAsymmetry.signalsDetected?.rlm || null,
      steamMove: claudeData.informationAsymmetry.signalsDetected?.steam || null,
      proEdge: claudeData.informationAsymmetry.signalsDetected?.proEdge || null,
      lineFreeze: claudeData.informationAsymmetry.signalsDetected?.freeze || null,
    };
  }

  // Phase 4: Chaos Sensitivity
  if (claudeData.chaosFactors) {
    context.chaosFactors = {
      weather: gameData.weather,
      schedule: gameData.schedule,
      roster: gameData.roster,
      rivalry: gameData.rivalry,
    };
    context.chaosData = {
      csiScore: claudeData.chaosFactors.csiScore || 0,
      confidencePenalty: claudeData.chaosFactors.confidencePenalty || 0,
    };
  }

  // Phase 5: Network Influence
  if (claudeData.network) {
    context.networkData = {
      cohesion: claudeData.network.cohesion?.overall || 0,
      leadership: claudeData.network.leadership?.leadershipStrength || 0,
      integration: claudeData.network.integration?.integrationScore || 0,
    };
  }

  // Phase 6: Temporal Decay
  if (claudeData.temporal?.events) {
    context.recentEvents = claudeData.temporal.events;
  }

  // Phase 7: Emergent Patterns
  if (claudeData.emergent?.patterns) {
    context.emergentPatterns = claudeData.emergent.patterns
      .filter((p: any) => p.matched)
      .map((p: any) => ({
        score: p.score,
        description: p.pattern.description,
      }));
  }

  const result = await engine.calculateClaudeEffect(
    baseProbability,
    baseConfidence,
    gameData,
    context
  );

  return result;
}

