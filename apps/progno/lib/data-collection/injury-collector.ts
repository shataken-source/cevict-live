/**
 * Injury Data Collector for Phase 4 (Chaos Sensitivity Index)
 */

export interface InjuryReport {
  playerName: string;
  position: string;
  status: 'out' | 'questionable' | 'doubtful' | 'probable';
  injuryType: string;
  impact: number; // 0 to 1 (1 = critical player)
  reportedAt: Date;
}

export interface TeamInjuries {
  teamId: string;
  teamName: string;
  injuries: InjuryReport[];
  clusterInjuries: {
    offensiveLine: number;
    defensiveBacks: number;
    defensiveLine: number;
  };
  totalImpact: number;
}

export class InjuryCollector {
  /**
   * Collect injuries for a team
   * Note: This would integrate with injury report APIs or scraping
   */
  async collectInjuries(
    teamId: string,
    teamName: string
  ): Promise<TeamInjuries> {

    // TODO: Integrate with injury report APIs
    // Options:
    // - ESPN Injury Report API
    // - NFL.com injury reports
    // - Web scraping from official team sites

    const injuries: InjuryReport[] = [];

    // Placeholder: Would fetch from API
    // For now, return empty structure
    const clusterInjuries = {
      offensiveLine: 0,
      defensiveBacks: 0,
      defensiveLine: 0,
    };

    // Calculate cluster injuries
    for (const injury of injuries) {
      if (injury.status === 'out') {
        if (['OL', 'OT', 'OG', 'C'].includes(injury.position)) {
          clusterInjuries.offensiveLine++;
        } else if (['CB', 'S', 'FS', 'SS'].includes(injury.position)) {
          clusterInjuries.defensiveBacks++;
        } else if (['DE', 'DT', 'NT'].includes(injury.position)) {
          clusterInjuries.defensiveLine++;
        }
      }
    }

    const totalImpact = injuries.reduce((sum, i) => sum + i.impact, 0);

    return {
      teamId,
      teamName,
      injuries,
      clusterInjuries,
      totalImpact,
    };
  }

  /**
   * Parse injury report from text (fallback method)
   */
  parseInjuryReport(text: string, teamName: string): InjuryReport[] {
    const injuries: InjuryReport[] = [];

    // Simple pattern matching for injury reports
    // Would be more sophisticated in production
    const lines = text.split('\n');

    for (const line of lines) {
      // Look for player name patterns
      const playerMatch = line.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
      if (playerMatch) {
        const statusMatch = line.match(/(out|questionable|doubtful|probable)/i);
        const positionMatch = line.match(/\b(OL|OT|OG|C|CB|S|DE|DT|QB|RB|WR|TE|LB)\b/);

        if (statusMatch) {
          injuries.push({
            playerName: playerMatch[1],
            position: positionMatch?.[1] || 'Unknown',
            status: statusMatch[1].toLowerCase() as any,
            injuryType: 'Unknown',
            impact: this.estimateImpact(positionMatch?.[1] || 'Unknown', statusMatch[1].toLowerCase()),
            reportedAt: new Date(),
          });
        }
      }
    }

    return injuries;
  }

  /**
   * Estimate impact based on position and status
   */
  private estimateImpact(position: string, status: string): number {
    const positionImpact: Record<string, number> = {
      'QB': 1.0,
      'OL': 0.8,
      'OT': 0.8,
      'OG': 0.7,
      'C': 0.7,
      'DE': 0.7,
      'DT': 0.6,
      'CB': 0.6,
      'S': 0.5,
      'WR': 0.5,
      'RB': 0.5,
      'TE': 0.4,
      'LB': 0.4,
    };

    const statusMultiplier: Record<string, number> = {
      'out': 1.0,
      'doubtful': 0.7,
      'questionable': 0.4,
      'probable': 0.2,
    };

    return (positionImpact[position] || 0.3) * (statusMultiplier[status] || 0.5);
  }
}

