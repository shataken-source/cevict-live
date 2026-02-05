/**
 * Network Influence Graph (NIG)
 * Maps team chemistry and relationship dynamics
 */

export interface PlayerNode {
  id: string;
  name: string;
  position: string;
  role: 'starter' | 'backup' | 'special_teams';
  importance: number; // 0 to 1 (star players = 1.0)
}

export interface RelationshipEdge {
  from: string;      // Player ID
  to: string;        // Player ID
  type: 'teammate' | 'position_group' | 'social' | 'leadership' | 'conflict';
  strength: number;  // 0 to 1 (how strong the relationship)
  direction: 'bidirectional' | 'from_to' | 'to_from';
  evidence?: string[]; // Sources of evidence
}

export interface TeamGraph {
  teamId: string;
  players: PlayerNode[];
  edges: RelationshipEdge[];
  calculatedAt: Date;
}

export interface GraphMetrics {
  clusteringCoefficient: number;  // 0 to 1 (how tightly connected)
  averagePathLength: number;      // Average steps between players
  density: number;                // 0 to 1 (how connected the graph is)
  centralPlayers: string[];        // Most connected players
  isolatedPlayers: string[];      // Least connected players
  cliques: string[][];            // Groups of tightly connected players
}

export interface TeamCohesion {
  overall: number;        // 0 to 1
  offense: number;
  defense: number;
  specialTeams: number;
}

export interface LeadershipMetrics {
  leaderCount: number;
  leadershipStrength: number;  // 0 to 1
  leadershipStability: number;  // 0 to 1 (how consistent leadership is)
  keyLeaders: Array<{
    playerId: string;
    name: string;
    centrality: number;
  }>;
}

export interface IntegrationMetrics {
  newPlayers: number;
  integrationScore: number;  // 0 to 1 (how well new players fit)
  integrationVelocity: number; // How fast new players are integrating
  disconnectedPlayers: string[];
}

/**
 * Network Graph Builder
 */
export class NetworkGraphBuilder {
  /**
   * Build team graph from player and relationship data
   */
  buildGraph(
    teamId: string,
    players: PlayerNode[],
    relationships: RelationshipEdge[]
  ): TeamGraph {
    return {
      teamId,
      players,
      edges: relationships,
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate graph metrics
   */
  calculateMetrics(graph: TeamGraph): GraphMetrics {
    const { players, edges } = graph;

    // Clustering Coefficient
    // Measures how much players' connections are connected to each other
    const clusteringCoefficient = this.calculateClusteringCoefficient(graph);

    // Average Path Length
    // Average number of steps between any two players
    const averagePathLength = this.calculateAveragePathLength(graph);

    // Density
    // Ratio of actual edges to possible edges
    const maxEdges = players.length * (players.length - 1) / 2;
    const density = edges.length / maxEdges;

    // Central Players (highest degree centrality)
    const centralPlayers = this.findCentralPlayers(graph);

    // Isolated Players (lowest degree centrality)
    const isolatedPlayers = this.findIsolatedPlayers(graph);

    // Cliques (groups of 3+ players all connected to each other)
    const cliques = this.findCliques(graph);

    return {
      clusteringCoefficient,
      averagePathLength,
      density,
      centralPlayers,
      isolatedPlayers,
      cliques,
    };
  }

  /**
   * Calculate clustering coefficient
   * Measures local clustering (how connected neighbors are)
   */
  private calculateClusteringCoefficient(graph: TeamGraph): number {
    const { players, edges } = graph;

    if (players.length < 3) return 0;

    let totalClustering = 0;
    let validNodes = 0;

    for (const player of players) {
      const neighbors = this.getNeighbors(player.id, edges);

      if (neighbors.length < 2) {
        continue; // Need at least 2 neighbors to calculate clustering
      }

      // Count edges between neighbors
      let edgesBetweenNeighbors = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (this.hasEdge(neighbors[i], neighbors[j], edges)) {
            edgesBetweenNeighbors++;
          }
        }
      }

      // Maximum possible edges between neighbors
      const maxEdges = (neighbors.length * (neighbors.length - 1)) / 2;
      const clustering = maxEdges > 0 ? edgesBetweenNeighbors / maxEdges : 0;

      totalClustering += clustering;
      validNodes++;
    }

    return validNodes > 0 ? totalClustering / validNodes : 0;
  }

  /**
   * Calculate average path length
   */
  private calculateAveragePathLength(graph: TeamGraph): number {
    const { players, edges } = graph;

    if (players.length < 2) return 0;

    let totalPathLength = 0;
    let pathCount = 0;

    // For each pair of players, find shortest path
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const pathLength = this.shortestPath(players[i].id, players[j].id, edges);
        if (pathLength > 0) {
          totalPathLength += pathLength;
          pathCount++;
        }
      }
    }

    return pathCount > 0 ? totalPathLength / pathCount : 0;
  }

  /**
   * Find central players (highest degree centrality)
   */
  private findCentralPlayers(graph: TeamGraph, topN: number = 5): string[] {
    const { players, edges } = graph;

    const centrality = new Map<string, number>();

    // Calculate degree centrality (number of connections)
    for (const player of players) {
      const degree = this.getNeighbors(player.id, edges).length;
      centrality.set(player.id, degree);
    }

    // Sort by centrality and return top N
    return Array.from(centrality.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([playerId]) => playerId);
  }

  /**
   * Find isolated players (lowest degree centrality)
   */
  private findIsolatedPlayers(graph: TeamGraph): string[] {
    const { players, edges } = graph;

    const isolated: string[] = [];

    for (const player of players) {
      const neighbors = this.getNeighbors(player.id, edges);
      if (neighbors.length === 0) {
        isolated.push(player.id);
      }
    }

    return isolated;
  }

  /**
   * Find cliques (groups of 3+ players all connected)
   */
  private findCliques(graph: TeamGraph): string[][] {
    const { players, edges } = graph;
    const cliques: string[][] = [];

    // Simple clique detection: find groups of 3+ where all are connected
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        for (let k = j + 1; k < players.length; k++) {
          const p1 = players[i].id;
          const p2 = players[j].id;
          const p3 = players[k].id;

          // Check if all three are connected
          if (this.hasEdge(p1, p2, edges) &&
              this.hasEdge(p1, p3, edges) &&
              this.hasEdge(p2, p3, edges)) {
            cliques.push([p1, p2, p3]);
          }
        }
      }
    }

    return cliques;
  }

  /**
   * Helper: Get neighbors of a player
   */
  private getNeighbors(playerId: string, edges: RelationshipEdge[]): string[] {
    const neighbors = new Set<string>();

    for (const edge of edges) {
      if (edge.from === playerId) {
        neighbors.add(edge.to);
      }
      if (edge.to === playerId && edge.direction !== 'from_to') {
        neighbors.add(edge.from);
      }
    }

    return Array.from(neighbors);
  }

  /**
   * Helper: Check if edge exists between two players
   */
  private hasEdge(player1: string, player2: string, edges: RelationshipEdge[]): boolean {
    return edges.some(e =>
      (e.from === player1 && e.to === player2) ||
      (e.from === player2 && e.to === player1)
    );
  }

  /**
   * Helper: Find shortest path between two players (BFS)
   */
  private shortestPath(from: string, to: string, edges: RelationshipEdge[]): number {
    if (from === to) return 0;

    const queue: Array<{ node: string; distance: number }> = [{ node: from, distance: 0 }];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const { node, distance } = queue.shift()!;

      const neighbors = this.getNeighbors(node, edges);
      for (const neighbor of neighbors) {
        if (neighbor === to) {
          return distance + 1;
        }

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, distance: distance + 1 });
        }
      }
    }

    return -1; // No path found
  }
}

