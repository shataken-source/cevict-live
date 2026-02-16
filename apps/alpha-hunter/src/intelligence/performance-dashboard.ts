/**
 * Performance Dashboard
 * Web dashboard for visualizing Alpha Hunter performance metrics
 */

import { createClient } from '@supabase/supabase-js';

interface PerformanceMetrics {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bySport: Record<string, { pnl: number; winRate: number; trades: number }>;
  byConfidence: Array<{ range: string; winRate: number; count: number }>;
  dailyPnL: Array<{ date: string; pnl: number; trades: number }>;
}

export class PerformanceDashboard {
  private supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;
  
  /**
   * Fetch all performance metrics
   */
  async getMetrics(days: number = 30): Promise<PerformanceMetrics> {
    if (!this.supabase) {
      return this.getEmptyMetrics();
    }
    
    try {
      // Fetch trade history
      const { data: trades } = await this.supabase
        .from('trade_history')
        .select('*')
        .gte('opened_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('opened_at', { ascending: false });
      
      if (!trades || trades.length === 0) {
        return this.getEmptyMetrics();
      }
      
      const closed = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss');
      const wins = closed.filter(t => t.outcome === 'win');
      const losses = closed.filter(t => t.outcome === 'loss');
      
      const totalPnl = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const winRate = wins.length / closed.length * 100;
      
      // Calculate by sport
      const bySport: Record<string, { pnl: number; winRate: number; trades: number }> = {};
      for (const trade of closed) {
        const sport = this.extractSport(trade.symbol);
        if (!bySport[sport]) bySport[sport] = { pnl: 0, winRate: 0, trades: 0 };
        
        bySport[sport].pnl += trade.pnl || 0;
        bySport[sport].trades++;
      }
      
      // Calculate win rates per sport
      for (const sport of Object.keys(bySport)) {
        const sportTrades = closed.filter(t => this.extractSport(t.symbol) === sport);
        const sportWins = sportTrades.filter(t => t.outcome === 'win').length;
        bySport[sport].winRate = sportWins / sportTrades.length * 100;
      }
      
      // Calculate confidence buckets
      const byConfidence = await this.calculateConfidenceBuckets(closed);
      
      // Daily PnL
      const dailyPnL = this.calculateDailyPnL(closed);
      
      // Advanced metrics
      const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length : 0;
      const profitFactor = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : avgWin;
      
      return {
        totalPnl,
        winRate,
        totalTrades: closed.length,
        avgWin,
        avgLoss,
        profitFactor,
        sharpeRatio: this.calculateSharpe(dailyPnL),
        maxDrawdown: this.calculateMaxDrawdown(dailyPnL),
        bySport,
        byConfidence,
        dailyPnL
      };
    } catch (e) {
      console.error('Error fetching metrics:', e);
      return this.getEmptyMetrics();
    }
  }
  
  /**
   * Generate HTML dashboard
   */
  async generateDashboard(): Promise<string> {
    const metrics = await this.getMetrics(30);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Alpha Hunter Performance Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; }
    .kpi { font-size: 2.5rem; font-weight: bold; }
    .positive { color: #34d399; }
    .negative { color: #fb7185; }
    .neutral { color: #94a3b8; }
    h1 { margin: 0 0 20px 0; }
    h2 { margin: 0 0 15px 0; font-size: 1.1rem; color: #94a3b8; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; font-weight: 500; }
    canvas { max-height: 250px; }
  </style>
</head>
<body>
  <h1>🦅 Alpha Hunter Performance Dashboard</h1>
  
  <div class="grid">
    <div class="card">
      <h2>Total P&L (30d)</h2>
      <div class="kpi ${metrics.totalPnl >= 0 ? 'positive' : 'negative'}">
        ${metrics.totalPnl >= 0 ? '+' : ''}$${metrics.totalPnl.toFixed(2)}
      </div>
    </div>
    
    <div class="card">
      <h2>Win Rate</h2>
      <div class="kpi ${metrics.winRate >= 50 ? 'positive' : 'neutral'}">
        ${metrics.winRate.toFixed(1)}%
      </div>
      <div class="neutral">${metrics.totalTrades} trades</div>
    </div>
    
    <div class="card">
      <h2>Profit Factor</h2>
      <div class="kpi ${metrics.profitFactor >= 1.5 ? 'positive' : 'neutral'}">
        ${metrics.profitFactor.toFixed(2)}
      </div>
    </div>
    
    <div class="card">
      <h2>Max Drawdown</h2>
      <div class="kpi negative">
        ${metrics.maxDrawdown.toFixed(1)}%
      </div>
    </div>
  </div>
  
  <div class="grid" style="margin-top: 20px;">
    <div class="card">
      <h2>Performance by Sport</h2>
      <table>
        <tr><th>Sport</th><th>P&L</th><th>Win Rate</th><th>Trades</th></tr>
        ${Object.entries(metrics.bySport).map(([sport, data]) => `
          <tr>
            <td>${sport}</td>
            <td class="${data.pnl >= 0 ? 'positive' : 'negative'}">${data.pnl >= 0 ? '+' : ''}$${data.pnl.toFixed(2)}</td>
            <td>${data.winRate.toFixed(1)}%</td>
            <td>${data.trades}</td>
          </tr>
        `).join('')}
      </table>
    </div>
    
    <div class="card">
      <h2>Confidence Calibration</h2>
      <table>
        <tr><th>Confidence</th><th>Win Rate</th><th>Trades</th></tr>
        ${metrics.byConfidence.map(c => `
          <tr>
            <td>${c.range}%</td>
            <td class="${c.winRate >= parseInt(c.range) ? 'positive' : 'negative'}">${c.winRate.toFixed(1)}%</td>
            <td>${c.count}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  </div>
  
  <div class="card" style="margin-top: 20px;">
    <h2>Daily P&L</h2>
    <canvas id="pnlChart"></canvas>
  </div>
  
  <script>
    const ctx = document.getElementById('pnlChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(metrics.dailyPnL.map(d => d.date))},
        datasets: [{
          label: 'Daily P&L',
          data: ${JSON.stringify(metrics.dailyPnL.map(d => d.pnl))},
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.1)',
          fill: true,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { 
            grid: { color: '#334155' },
            ticks: { 
              color: '#94a3b8',
              callback: v => '$' + v.toFixed(0)
            }
          },
          x: { 
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });
  </script>
</body>
</html>
    `;
  }
  
  /**
   * Save dashboard to file
   */
  async saveDashboard(path: string = './dashboard.html'): Promise<void> {
    const fs = await import('fs');
    const html = await this.generateDashboard();
    fs.writeFileSync(path, html);
    console.log(`📊 Dashboard saved to ${path}`);
  }
  
  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalPnl: 0,
      winRate: 0,
      totalTrades: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      bySport: {},
      byConfidence: [],
      dailyPnL: []
    };
  }
  
  private async calculateConfidenceBuckets(trades: any[]): Promise<Array<{ range: string; winRate: number; count: number }>> {
    // Fetch predictions to get confidence levels
    const { data: predictions } = await this.supabase!
      .from('bot_predictions')
      .select('*')
      .in('market_id', trades.map(t => t.market_id).filter(Boolean));
    
    const predMap = new Map((predictions || []).map(p => [p.market_id, p.confidence]));
    
    const buckets: Record<string, { wins: number; total: number }> = {
      '50-60': { wins: 0, total: 0 },
      '60-70': { wins: 0, total: 0 },
      '70-80': { wins: 0, total: 0 },
      '80-90': { wins: 0, total: 0 },
      '90+': { wins: 0, total: 0 }
    };
    
    for (const trade of trades) {
      const confidence = predMap.get(trade.market_id);
      if (confidence === undefined) continue;
      
      let range = '50-60';
      if (confidence >= 90) range = '90+';
      else if (confidence >= 80) range = '80-90';
      else if (confidence >= 70) range = '70-80';
      else if (confidence >= 60) range = '60-70';
      
      buckets[range].total++;
      if (trade.outcome === 'win') buckets[range].wins++;
    }
    
    return Object.entries(buckets)
      .filter(([_, d]) => d.total > 0)
      .map(([range, data]) => ({
        range,
        winRate: data.wins / data.total * 100,
        count: data.total
      }));
  }
  
  private calculateDailyPnL(trades: any[]): Array<{ date: string; pnl: number; trades: number }> {
    const byDay = new Map<string, { pnl: number; trades: number }>();
    
    for (const trade of trades) {
      const date = new Date(trade.opened_at).toISOString().split('T')[0];
      const current = byDay.get(date) || { pnl: 0, trades: 0 };
      current.pnl += trade.pnl || 0;
      current.trades++;
      byDay.set(date, current);
    }
    
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30) // Last 30 days
      .map(([date, data]) => ({ date, ...data }));
  }
  
  private calculateSharpe(dailyPnL: Array<{ pnl: number }>): number {
    if (dailyPnL.length < 2) return 0;
    
    const returns = dailyPnL.map(d => d.pnl);
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
    const std = Math.sqrt(variance);
    
    return std > 0 ? (avg / std) * Math.sqrt(252) : 0; // Annualized
  }
  
  private calculateMaxDrawdown(dailyPnL: Array<{ pnl: number }>): number {
    let peak = 0;
    let maxDD = 0;
    let running = 0;
    
    for (const day of dailyPnL) {
      running += day.pnl;
      if (running > peak) peak = running;
      const dd = (peak - running) / Math.max(peak, 100) * 100;
      if (dd > maxDD) maxDD = dd;
    }
    
    return maxDD;
  }
  
  private extractSport(symbol: string): string {
    const s = symbol?.toLowerCase() || '';
    if (s.includes('nba') || s.includes('basketball')) return 'NBA';
    if (s.includes('nfl') || s.includes('football')) return 'NFL';
    if (s.includes('nhl') || s.includes('hockey')) return 'NHL';
    if (s.includes('mlb') || s.includes('baseball')) return 'MLB';
    if (s.includes('ncaa') || s.includes('college')) return 'NCAA';
    return 'OTHER';
  }
}

export const performanceDashboard = new PerformanceDashboard();
