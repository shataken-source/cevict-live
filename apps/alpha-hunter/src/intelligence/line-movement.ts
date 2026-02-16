/**
 * Line Movement Tracker
 * Tracks price changes and alerts on significant movements
 */

import { supabaseMemory } from '../lib/supabase-memory';

interface PricePoint {
  timestamp: number;
  yesPrice: number;
  noPrice: number;
  volume: number;
}

interface MovementAlert {
  marketId: string;
  marketTitle: string;
  side: 'yes' | 'no';
  oldPrice: number;
  newPrice: number;
  change: number; // percentage points
  changePercent: number;
  direction: 'up' | 'down';
  volumeIncrease: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export class LineMovementTracker {
  private priceHistory = new Map<string, PricePoint[]>();
  private readonly HISTORY_LIMIT = 50;
  private readonly ALERT_THRESHOLD = 5; // 5% change triggers alert
  private readonly CRITICAL_THRESHOLD = 10; // 10% is critical
  
  /**
   * Record current price for a market
   */
  recordPrice(marketId: string, marketTitle: string, yesPrice: number, noPrice: number, volume: number): void {
    const history = this.priceHistory.get(marketId) || [];
    
    history.push({
      timestamp: Date.now(),
      yesPrice,
      noPrice,
      volume
    });
    
    // Keep only recent history
    if (history.length > this.HISTORY_LIMIT) {
      history.shift();
    }
    
    this.priceHistory.set(marketId, history);
  }
  
  /**
   * Check for significant line movements
   */
  checkMovement(marketId: string, marketTitle: string, currentYes: number, currentNo: number, currentVolume: number): MovementAlert | null {
    const history = this.priceHistory.get(marketId);
    
    if (!history || history.length < 2) {
      this.recordPrice(marketId, marketTitle, currentYes, currentNo, currentVolume);
      return null;
    }
    
    const previous = history[history.length - 1];
    
    // Calculate changes
    const yesChange = currentYes - previous.yesPrice;
    const yesChangePercent = (yesChange / previous.yesPrice) * 100;
    
    const noChange = currentNo - previous.noPrice;
    const noChangePercent = (noChange / previous.noPrice) * 100;
    
    // Determine which side moved more
    const side = Math.abs(yesChange) > Math.abs(noChange) ? 'yes' : 'no';
    const change = side === 'yes' ? yesChange : noChange;
    const changePercent = side === 'yes' ? yesChangePercent : noChangePercent;
    
    // Check if movement is significant
    if (Math.abs(change) < this.ALERT_THRESHOLD) {
      this.recordPrice(marketId, marketTitle, currentYes, currentNo, currentVolume);
      return null;
    }
    
    // Determine severity
    let severity: 'info' | 'warning' | 'critical' = 'info';
    if (Math.abs(change) >= this.CRITICAL_THRESHOLD) {
      severity = 'critical';
    } else if (Math.abs(change) >= this.ALERT_THRESHOLD) {
      severity = 'warning';
    }
    
    const volumeIncrease = currentVolume - previous.volume;
    const direction = change > 0 ? 'up' : 'down';
    
    const alert: MovementAlert = {
      marketId,
      marketTitle,
      side,
      oldPrice: side === 'yes' ? previous.yesPrice : previous.noPrice,
      newPrice: side === 'yes' ? currentYes : currentNo,
      change,
      changePercent,
      direction,
      volumeIncrease,
      severity,
      message: this.generateAlertMessage(marketTitle, side, change, direction, severity)
    };
    
    this.recordPrice(marketId, marketTitle, currentYes, currentNo, currentVolume);
    return alert;
  }
  
  /**
   * Find contrarian opportunities - line moved against our pick
   */
  findContrarianOpportunities(picks: any[], markets: any[]): MovementAlert[] {
    const alerts: MovementAlert[] = [];
    
    for (const pick of picks) {
      const matchedMarket = markets.find(m => 
        m.title.toLowerCase().includes(pick.homeTeam?.toLowerCase()) ||
        m.title.toLowerCase().includes(pick.awayTeam?.toLowerCase())
      );
      
      if (!matchedMarket) continue;
      
      const history = this.priceHistory.get(matchedMarket.id);
      if (!history || history.length < 2) continue;
      
      const previous = history[history.length - 2];
      const current = history[history.length - 1];
      
      // If our pick was YES and price dropped, that's contrarian value
      const isYesPick = pick.pick === pick.homeTeam || pick.pick?.toLowerCase().includes('yes');
      
      if (isYesPick && current.yesPrice < previous.yesPrice - 3) {
        alerts.push({
          marketId: matchedMarket.id,
          marketTitle: matchedMarket.title,
          side: 'yes',
          oldPrice: previous.yesPrice,
          newPrice: current.yesPrice,
          change: current.yesPrice - previous.yesPrice,
          changePercent: ((current.yesPrice - previous.yesPrice) / previous.yesPrice) * 100,
          direction: 'down',
          volumeIncrease: current.volume - previous.volume,
          severity: 'warning',
          message: `📉 CONTRARIAN: ${pick.pick} line dropped to ${current.yesPrice}¢ (Progno: ${pick.confidence}%)`
        });
      }
    }
    
    return alerts;
  }
  
  /**
   * Get price trend for a market
   */
  getTrend(marketId: string): { direction: 'up' | 'down' | 'flat'; strength: number } {
    const history = this.priceHistory.get(marketId);
    
    if (!history || history.length < 5) {
      return { direction: 'flat', strength: 0 };
    }
    
    const recent = history.slice(-5);
    const first = recent[0].yesPrice;
    const last = recent[recent.length - 1].yesPrice;
    const change = last - first;
    
    const direction = change > 1 ? 'up' : change < -1 ? 'down' : 'flat';
    const strength = Math.min(Math.abs(change) / 5, 1); // Normalize 0-1
    
    return { direction, strength };
  }
  
  /**
   * Generate movement report
   */
  generateReport(): string {
    const lines = [
      '📈 LINE MOVEMENT REPORT',
      '═'.repeat(60),
      ''
    ];
    
    for (const [marketId, history] of this.priceHistory) {
      if (history.length < 2) continue;
      
      const trend = this.getTrend(marketId);
      const current = history[history.length - 1];
      const previous = history[0];
      const totalChange = current.yesPrice - previous.yesPrice;
      
      const trendIcon = trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : '➡️';
      lines.push(`${trendIcon} ${marketId.slice(0, 30)}`);
      lines.push(`   YES: ${previous.yesPrice}¢ → ${current.yesPrice}¢ (${totalChange > 0 ? '+' : ''}${totalChange}¢)`);
      lines.push(`   Volume: ${previous.volume} → ${current.volume}`);
      lines.push('');
    }
    
    return lines.join('\n') || 'No movement data recorded yet.';
  }
  
  private generateAlertMessage(title: string, side: string, change: number, direction: string, severity: string): string {
    const emoji = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
    const arrow = direction === 'up' ? '📈' : '📉';
    return `${emoji} ${arrow} ${title}: ${side.toUpperCase()} ${direction} ${Math.abs(change).toFixed(1)}¢`;
  }
}

export const lineMovementTracker = new LineMovementTracker();
