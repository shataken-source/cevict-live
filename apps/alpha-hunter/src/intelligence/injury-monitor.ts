/**
 * Injury News Integration
 * Monitors injury reports and adjusts confidence accordingly
 */

interface InjuryReport {
  player: string;
  team: string;
  status: 'out' | 'doubtful' | 'questionable' | 'probable' | 'active';
  injuryType?: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  estimatedReturn?: string;
  source: string;
  timestamp: string;
}

interface GameInjuryStatus {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeInjuries: InjuryReport[];
  awayInjuries: InjuryReport[];
  impact: {
    homeImpact: number; // -10 to 0 (negative impact)
    awayImpact: number;
    totalAdjustment: number;
    confidenceAdjustment: number; // Apply to pick confidence
    shouldAvoid: boolean;
    reason?: string;
  };
}

export class InjuryMonitor {
  private apiKey = process.env.NEWS_API_KEY;
  private reports = new Map<string, InjuryReport[]>(); // team -> reports
  
  /**
   * Fetch injury reports from news API
   * In production, this would connect to ESPN, Rotowire, etc.
   */
  async fetchInjuryReports(sport: string): Promise<Map<string, InjuryReport[]>> {
    // Placeholder: In production, fetch from actual injury APIs
    // For now, return empty and let manual reports be added
    
    // Example of what a real implementation would do:
    // const response = await fetch(`https://api.${sport.toLowerCase()}.com/injuries`);
    // const data = await response.json();
    
    return this.reports;
  }
  
  /**
   * Add manual injury report (for user input)
   */
  addInjuryReport(report: Omit<InjuryReport, 'timestamp'>): void {
    const team = report.team.toUpperCase();
    const existing = this.reports.get(team) || [];
    
    existing.push({
      ...report,
      timestamp: new Date().toISOString()
    });
    
    this.reports.set(team, existing);
    console.log(`🚑 Injury report added: ${report.player} (${report.team}) - ${report.status}`);
  }
  
  /**
   * Analyze injuries for a specific game
   */
  analyzeGame(game: { gameId: string; homeTeam: string; awayTeam: string }): GameInjuryStatus {
    const homeInjuries = this.reports.get(game.homeTeam.toUpperCase()) || [];
    const awayInjuries = this.reports.get(game.awayTeam.toUpperCase()) || [];
    
    // Filter to recent reports (last 24 hours)
    const recent = (r: InjuryReport) => {
      const age = Date.now() - new Date(r.timestamp).getTime();
      return age < 24 * 60 * 60 * 1000;
    };
    
    const recentHome = homeInjuries.filter(recent);
    const recentAway = awayInjuries.filter(recent);
    
    // Calculate impact
    const homeImpact = this.calculateTeamImpact(recentHome);
    const awayImpact = this.calculateTeamImpact(recentAway);
    
    // Determine total adjustment
    const totalAdjustment = homeImpact - awayImpact; // Positive = home hurt more
    const confidenceAdjustment = Math.abs(totalAdjustment) > 5 ? -Math.abs(totalAdjustment) / 2 : 0;
    
    // Should we avoid this game?
    const criticalPlayers = [...recentHome, ...recentAway].filter(r => 
      r.impact === 'critical' && ['out', 'doubtful'].includes(r.status)
    );
    
    const shouldAvoid = criticalPlayers.length > 0;
    
    return {
      gameId: game.gameId,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeInjuries: recentHome,
      awayInjuries: recentAway,
      impact: {
        homeImpact,
        awayImpact,
        totalAdjustment,
        confidenceAdjustment,
        shouldAvoid,
        reason: shouldAvoid ? `Critical players out: ${criticalPlayers.map(p => p.player).join(', ')}` : undefined
      }
    };
  }
  
  /**
   * Adjust Progno pick based on injuries
   */
  adjustPickForInjuries(pick: any, gameStatus: GameInjuryStatus): { adjustedConfidence: number; reasoning: string[] } {
    let adjustedConfidence = pick.confidence;
    const reasoning: string[] = [...pick.reasoning];
    
    if (gameStatus.impact.shouldAvoid) {
      adjustedConfidence -= 15;
      reasoning.push(`🚑 AVOID: ${gameStatus.impact.reason}`);
    } else if (Math.abs(gameStatus.impact.confidenceAdjustment) > 2) {
      adjustedConfidence += gameStatus.impact.confidenceAdjustment;
      
      if (gameStatus.impact.totalAdjustment > 0) {
        reasoning.push(`🚑 Home team injuries favor ${pick.awayTeam} (-${gameStatus.impact.totalAdjustment.toFixed(1)}%)`);
      } else if (gameStatus.impact.totalAdjustment < 0) {
        reasoning.push(`🚑 Away team injuries favor ${pick.homeTeam} (+${Math.abs(gameStatus.impact.totalAdjustment).toFixed(1)}%)`);
      }
    }
    
    // Clamp confidence
    adjustedConfidence = Math.max(50, Math.min(95, adjustedConfidence));
    
    return { adjustedConfidence, reasoning };
  }
  
  /**
   * Clear old reports
   */
  clearOldReports(hours: number = 24): void {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    for (const [team, reports] of this.reports) {
      const recent = reports.filter(r => new Date(r.timestamp).getTime() > cutoff);
      if (recent.length === 0) {
        this.reports.delete(team);
      } else {
        this.reports.set(team, recent);
      }
    }
  }
  
  /**
   * Generate injury report
   */
  generateReport(): string {
    const lines = [
      '🚑 INJURY REPORT',
      '═'.repeat(60),
      ''
    ];
    
    let totalReports = 0;
    
    for (const [team, reports] of this.reports) {
      if (reports.length === 0) continue;
      
      totalReports += reports.length;
      lines.push(`${team} (${reports.length} reports):`);
      
      for (const r of reports.slice(-3)) { // Last 3
        const emoji = r.status === 'out' ? '❌' : r.status === 'doubtful' ? '⚠️' : '❓';
        const impact = r.impact === 'critical' ? '🔴' : r.impact === 'high' ? '🟠' : '🟡';
        lines.push(`   ${emoji} ${impact} ${r.player}: ${r.status} (${r.injuryType || 'unknown'})`);
      }
      lines.push('');
    }
    
    if (totalReports === 0) {
      lines.push('No active injury reports. Add reports manually or configure news API.');
    }
    
    return lines.join('\n');
  }
  
  private calculateTeamImpact(reports: InjuryReport[]): number {
    let impact = 0;
    
    for (const r of reports) {
      // Base impact by status
      let statusImpact = 0;
      switch (r.status) {
        case 'out': statusImpact = -5; break;
        case 'doubtful': statusImpact = -4; break;
        case 'questionable': statusImpact = -2; break;
        case 'probable': statusImpact = -0.5; break;
      }
      
      // Multiplier by player impact
      let multiplier = 1;
      switch (r.impact) {
        case 'critical': multiplier = 3; break;
        case 'high': multiplier = 2; break;
        case 'medium': multiplier = 1; break;
        case 'low': multiplier = 0.5; break;
      }
      
      impact += statusImpact * multiplier;
    }
    
    return impact;
  }
}

export const injuryMonitor = new InjuryMonitor();
