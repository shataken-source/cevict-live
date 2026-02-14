/**
 * Team Cohesion Calculator
 * Calculates team chemistry from network graph
 */

import { TeamGraph, GraphMetrics, TeamCohesion, LeadershipMetrics, IntegrationMetrics } from './graph';
import { NetworkGraphBuilder } from './graph';

export interface NIGResult {
  teamId: string;
  gameId: string;

  // Network metrics
  graphMetrics: GraphMetrics;

  // Cohesion scores
  cohesion: TeamCohesion;

  // Leadership
  leadership: LeadershipMetrics;

  // Integration
  integration: IntegrationMetrics;

  // Final NIG score (-0.1 to +0.1)
  networkInfluence: number;
  confidence: number;

  // Insights
  insights: string[];
  warnings: string[];
}

/**
 * Team Cohesion Calculator
 */
export class CohesionCalculator {
  private graphBuilder: NetworkGraphBuilder;

  constructor() {
    this.graphBuilder = new NetworkGraphBuilder();
  }

  /**
   * Calculate Network Influence Graph score
   */
  async calculate(
    teamId: string,
    gameId: string,
    graph: TeamGraph
  ): Promise<NIGResult> {

    // Calculate graph metrics
    const graphMetrics = this.graphBuilder.calculateMetrics(graph);

    // Calculate team cohesion
    const cohesion = this.calculateCohesion(graph, graphMetrics);

    // Calculate leadership metrics
    const leadership = this.calculateLeadership(graph, graphMetrics);

    // Calculate integration metrics
    const integration = this.calculateIntegration(graph, graphMetrics);

    // Calculate final NIG score
    // NIG = (Cohesion × 0.4) + (Leadership × 0.4) + (Integration × 0.2) - 0.5
    // Then scale to -0.1 to +0.1
    const rawNIG =
      (cohesion.overall * 0.4) +
      (leadership.leadershipStrength * 0.4) +
      (integration.integrationScore * 0.2);

    // Convert from 0-1 scale to -0.1 to +0.1 (centered at 0)
    const networkInfluence = (rawNIG - 0.5) * 0.2;

    // Calculate confidence based on graph completeness
    const confidence = this.calculateConfidence(graph, graphMetrics);

    // Generate insights
    const insights = this.generateInsights(cohesion, leadership, integration, graphMetrics);

    // Generate warnings
    const warnings = this.generateWarnings(cohesion, leadership, integration, graphMetrics);

    return {
      teamId,
      gameId,
      graphMetrics,
      cohesion,
      leadership,
      integration,
      networkInfluence: Math.max(-0.1, Math.min(0.1, networkInfluence)),
      confidence,
      insights,
      warnings,
    };
  }

  /**
   * Calculate team cohesion
   */
  private calculateCohesion(
    graph: TeamGraph,
    metrics: GraphMetrics
  ): TeamCohesion {

    // Overall cohesion based on clustering and density
    const overall = (metrics.clusteringCoefficient * 0.6) + (metrics.density * 0.4);

    // Separate by unit (simplified - would need position data)
    // For now, use overall for all units
    const offense = overall * 0.95; // Slight variation
    const defense = overall * 1.05;
    const specialTeams = overall * 0.90;

    return {
      overall: Math.max(0, Math.min(1, overall)),
      offense: Math.max(0, Math.min(1, offense)),
      defense: Math.max(0, Math.min(1, defense)),
      specialTeams: Math.max(0, Math.min(1, specialTeams)),
    };
  }

  /**
   * Calculate leadership metrics
   */
  private calculateLeadership(
    graph: TeamGraph,
    metrics: GraphMetrics
  ): LeadershipMetrics {

    const { players, edges } = graph;

    // Find leaders (central players with high importance)
    const keyLeaders = metrics.centralPlayers
      .map(playerId => {
        const player = players.find(p => p.id === playerId);
        if (!player) return null;

        // Count neighbors (degree centrality)
        const neighbors = edges.filter(e =>
          e.from === playerId || (e.to === playerId && e.direction !== 'from_to')
        ).length;
        const centrality = neighbors / players.length; // Normalize

        return {
          playerId,
          name: player.name,
          centrality,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null)
      .filter(l => l.centrality > 0.1) // Only significant leaders
      .sort((a, b) => b.centrality - a.centrality)
      .slice(0, 5);

    // Leadership strength = average centrality of leaders
    const leadershipStrength = keyLeaders.length > 0
      ? keyLeaders.reduce((sum, l) => sum + l.centrality, 0) / keyLeaders.length
      : 0;

    // Leadership stability (simplified - would compare to historical)
    const leadershipStability = 0.8; // Placeholder

    return {
      leaderCount: keyLeaders.length,
      leadershipStrength: Math.max(0, Math.min(1, leadershipStrength)),
      leadershipStability,
      keyLeaders,
    };
  }

  /**
   * Calculate integration metrics
   */
  private calculateIntegration(
    graph: TeamGraph,
    metrics: GraphMetrics
  ): IntegrationMetrics {

    const { players, edges } = graph;

    // Identify new players (simplified - would need join date)
    // For now, use isolated players as proxy
    const disconnectedPlayers = metrics.isolatedPlayers;
    const newPlayers = disconnectedPlayers.length; // Simplified

    // Integration score = inverse of isolation
    // More isolated players = lower integration
    const isolationRatio = disconnectedPlayers.length / players.length;
    const integrationScore = 1 - isolationRatio;

    // Integration velocity (simplified - would track over time)
    const integrationVelocity = 0.7; // Placeholder

    return {
      newPlayers,
      integrationScore: Math.max(0, Math.min(1, integrationScore)),
      integrationVelocity,
      disconnectedPlayers,
    };
  }

  /**
   * Calculate confidence in NIG score
   */
  private calculateConfidence(
    graph: TeamGraph,
    metrics: GraphMetrics
  ): number {

    // Confidence based on:
    // - Graph completeness (more edges = more confident)
    // - Number of players (more players = more confident)
    // - Graph density (higher density = more confident)

    const edgeCompleteness = Math.min(graph.edges.length / (graph.players.length * 2), 1);
    const playerCount = Math.min(graph.players.length / 50, 1);
    const densityConfidence = metrics.density;

    return (edgeCompleteness * 0.4) + (playerCount * 0.3) + (densityConfidence * 0.3);
  }

  /**
   * Generate insights
   */
  private generateInsights(
    cohesion: TeamCohesion,
    leadership: LeadershipMetrics,
    integration: IntegrationMetrics,
    metrics: GraphMetrics
  ): string[] {

    const insights: string[] = [];

    // Cohesion insights
    if (cohesion.overall > 0.7) {
      insights.push(`✅ Strong team cohesion (${(cohesion.overall * 100).toFixed(0)}%)`);
    } else if (cohesion.overall < 0.4) {
      insights.push(`⚠️ Low team cohesion (${(cohesion.overall * 100).toFixed(0)}%)`);
    }

    // Leadership insights
    if (leadership.leaderCount >= 3) {
      insights.push(`👑 Strong leadership core (${leadership.leaderCount} key leaders)`);
    } else if (leadership.leaderCount === 0) {
      insights.push(`⚠️ No clear leadership structure`);
    }

    // Integration insights
    if (integration.integrationScore > 0.8) {
      insights.push(`🔗 New players well integrated`);
    } else if (integration.integrationScore < 0.5) {
      insights.push(`⚠️ Integration concerns (${integration.disconnectedPlayers.length} isolated players)`);
    }

    // Clique insights
    if (metrics.cliques.length > 0) {
      insights.push(`👥 ${metrics.cliques.length} tight-knit groups detected`);
    }

    return insights;
  }

  /**
   * Generate warnings
   */
  private generateWarnings(
    cohesion: TeamCohesion,
    leadership: LeadershipMetrics,
    integration: IntegrationMetrics,
    metrics: GraphMetrics
  ): string[] {

    const warnings: string[] = [];

    // Low cohesion warning
    if (cohesion.overall < 0.3) {
      warnings.push('🚨 CRITICAL: Very low team cohesion - chemistry concerns');
    }

    // No leadership warning
    if (leadership.leaderCount === 0) {
      warnings.push('⚠️ No clear leadership - team may lack direction');
    }

    // High isolation warning
    if (integration.disconnectedPlayers.length > 3) {
      warnings.push(`⚠️ ${integration.disconnectedPlayers.length} players appear isolated from team`);
    }

    // Low density warning
    if (metrics.density < 0.2) {
      warnings.push('⚠️ Low network density - team may lack unity');
    }

    return warnings;
  }
}

