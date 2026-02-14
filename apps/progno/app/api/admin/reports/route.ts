import { NextRequest, NextResponse } from 'next/server';
import { getAccuracyMetrics } from '../../../lib/prediction-tracker';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const metrics = getAccuracyMetrics();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'html';

    // ROI by Odds Range data
    const oddsRanges = [
      { min: -10000, max: -200, range: 'Heavy Favorite (-200+)', wins: 0, losses: 0, profit: 0 },
      { min: -200, max: -100, range: 'Favorite (-200 to -100)', wins: 0, losses: 0, profit: 0 },
      { min: -100, max: 100, range: 'Pick em (-100 to +100)', wins: 0, losses: 0, profit: 0 },
      { min: 100, max: 200, range: 'Underdog (+100 to +200)', wins: 0, losses: 0, profit: 0 },
      { min: 200, max: 500, range: 'Big Underdog (+200 to +500)', wins: 0, losses: 0, profit: 0 },
      { min: 500, max: null, range: 'Longshot (+500+)', wins: 0, losses: 0, profit: 0 }
    ];

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        reportType: 'roi-by-odds-range',
        generatedAt: new Date().toISOString(),
        ranges: oddsRanges.map(r => ({
          ...r,
          total: r.wins + r.losses,
          winRate: r.wins + r.losses > 0 ? ((r.wins / (r.wins + r.losses)) * 100).toFixed(1) : '0.0',
          roi: r.profit !== 0 ? ((r.profit / 100) * 100).toFixed(1) : '0.0'
        })),
        bestRange: 'Heavy Favorite (-200+)'
      });
    }

    // Human-readable HTML format
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Progno Admin Reports</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d0f14; color: #e6e9f0; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #00d4aa; border-bottom: 2px solid #2a2e3d; padding-bottom: 10px; }
    h2 { color: #667eea; margin-top: 30px; }
    .report-card { background: #161922; border: 1px solid #2a2e3d; border-radius: 8px; padding: 20px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #1e212b; color: #8b90a4; padding: 12px; text-align: left; font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid #2a2e3d; }
    tr:hover { background: #1e212b; }
    .metric { font-size: 24px; font-weight: 700; color: #00d4aa; }
    .metric-label { color: #8b90a4; font-size: 12px; text-transform: uppercase; }
    .positive { color: #22c55e; }
    .negative { color: #ef4444; }
    .neutral { color: #64748b; }
    .btn { background: #00d4aa; color: #0d0f14; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; margin: 10px 5px; }
    .btn:hover { background: #00a884; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #1e212b; padding: 15px; border-radius: 6px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Progno Admin Reports</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>

    <div class="grid">
      <div class="stat-card">
        <div class="metric-label">Total Predictions</div>
        <div class="metric">${metrics.totalPredictions || 0}</div>
      </div>
      <div class="stat-card">
        <div class="metric-label">Win Rate</div>
        <div class="metric ${(metrics.winRate || 0) >= 50 ? 'positive' : 'negative'}">${(metrics.winRate || 0).toFixed(1)}%</div>
      </div>
      <div class="stat-card">
        <div class="metric-label">ROI</div>
        <div class="metric ${(metrics.roi || 0) >= 0 ? 'positive' : 'negative'}">${(metrics.roi || 0).toFixed(1)}%</div>
      </div>
      <div class="stat-card">
        <div class="metric-label">Profit</div>
        <div class="metric ${(metrics.totalProfit || 0) >= 0 ? 'positive' : 'negative'}">$${(metrics.totalProfit || 0).toFixed(2)}</div>
      </div>
    </div>

    <div class="report-card">
      <h2>ROI by Odds Range</h2>
      <table>
        <thead>
          <tr>
            <th>Range</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Total</th>
            <th>Win Rate</th>
            <th>Profit</th>
            <th>ROI</th>
          </tr>
        </thead>
        <tbody>
          ${oddsRanges.map(r => {
      const total = r.wins + r.losses;
      const winRate = total > 0 ? ((r.wins / total) * 100).toFixed(1) : '0.0';
      const roi = r.profit !== 0 ? ((r.profit / 100) * 100).toFixed(1) : '0.0';
      const profitClass = r.profit > 0 ? 'positive' : r.profit < 0 ? 'negative' : 'neutral';
      return `
          <tr>
            <td><strong>${r.range}</strong></td>
            <td class="positive">${r.wins}</td>
            <td class="negative">${r.losses}</td>
            <td>${total}</td>
            <td>${winRate}%</td>
            <td class="${profitClass}">$${r.profit.toFixed(2)}</td>
            <td class="${profitClass}">${roi}%</td>
          </tr>`;
    }).join('')}
        </tbody>
      </table>
    </div>

    <div class="report-card">
      <h2>By Sport</h2>
      <table>
        <thead>
          <tr>
            <th>Sport</th>
            <th>Predictions</th>
            <th>Win Rate</th>
            <th>ROI</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(metrics.bySport || {}).map(([sport, data]: [string, any]) => `
          <tr>
            <td><strong>${sport.toUpperCase()}</strong></td>
            <td>${data.total || 0}</td>
            <td class="${(data.winRate || 0) >= 50 ? 'positive' : 'negative'}">${(data.winRate || 0).toFixed(1)}%</td>
            <td class="${(data.roi || 0) >= 0 ? 'positive' : 'negative'}">${(data.roi || 0).toFixed(1)}%</td>
          </tr>
          `).join('') || '<tr><td colspan="4" class="neutral">No data available</td></tr>'}
        </tbody>
      </table>
    </div>

    <div style="margin-top: 30px;">
      <a href="/api/admin/reports?format=json" class="btn">⬇️ Export JSON</a>
      <a href="/api/admin/reports?format=csv" class="btn">⬇️ Export CSV</a>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error: any) {
    console.error('❌ Error fetching admin reports:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch reports'
    }, { status: 500 });
  }
}
