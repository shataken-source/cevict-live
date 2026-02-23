'use client';

import { useState } from 'react';

interface Pick {
  sport: string;
  league?: string;
  home_team: string;
  away_team: string;
  pick: string;
  pick_type: string;
  recommended_line?: number;
  odds: number;
  confidence: number;
  game_time: string;
  game_id?: string;
  expected_value?: number;
  value_bet_edge?: number;
  mc_predicted_score?: { home: number; away: number };
  total?: {
    prediction?: string;
    line?: number;
    edge?: number;
  };
}

interface PicksData {
  date: string;
  generatedAt: string;
  count: number;
  message: string;
  earlyLines: boolean;
  picks: Pick[];
}

interface PrintBetsSectionProps {
  date: string;
}

export default function PrintBetsSection({ date }: PrintBetsSectionProps) {
  const [loading, setLoading] = useState(false);
  const [picksData, setPicksData] = useState<PicksData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPicks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/progno/picks?date=${date}`);
      if (!response.ok) {
        throw new Error('Failed to load picks');
      }
      const data = await response.json();
      setPicksData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const generatePrintableSheet = () => {
    if (!picksData || !picksData.picks || picksData.picks.length === 0) {
      alert('No picks to print. Load picks first.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the betting sheet.');
      return;
    }

    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const formatTime = (timeStr: string) => {
      const d = new Date(timeStr);
      return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    };

    const formatOdds = (odds: number) => {
      return odds > 0 ? `+${odds}` : `${odds}`;
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Betting Tracker - ${date}</title>
  <style>
    @page { size: auto; margin: 0.5in; }
    @media print {
      .no-print { display: none !important; }
      body { background: white; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #333;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header h1 { margin: 0; font-size: 28px; }
    .header .date {
      font-size: 16px;
      color: #666;
      margin-top: 5px;
    }
    .summary {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 15px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-item .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-item .value {
      font-size: 20px;
      font-weight: bold;
      color: #333;
    }
    .bet-card {
      border: 2px solid #333;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    .bet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    }
    .bet-number {
      font-size: 14px;
      font-weight: bold;
      color: #666;
    }
    .sport-tag {
      background: #333;
      color: white;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .teams {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .pick-info {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .pick-info-item {
      font-size: 14px;
    }
    .pick-info-item .label {
      color: #666;
      font-size: 12px;
    }
    .pick-info-item .value {
      font-weight: bold;
    }
    .odds-positive { color: #28a745; }
    .odds-negative { color: #dc3545; }
    .confidence-high { color: #28a745; }
    .confidence-medium { color: #ffc107; }
    .confidence-low { color: #dc3545; }

    .checkbox-section {
      display: flex;
      gap: 30px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px dashed #ccc;
    }
    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .checkbox {
      width: 24px;
      height: 24px;
      border: 2px solid #333;
      border-radius: 4px;
      display: inline-block;
    }
    .checkbox-label {
      font-size: 14px;
      font-weight: bold;
    }

    .notes-section {
      margin-top: 10px;
    }
    .notes-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    .notes-line {
      border-bottom: 1px solid #ccc;
      height: 20px;
      margin-bottom: 5px;
    }

    .score-prediction {
      background: #f0f4f8;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 13px;
      margin-top: 8px;
    }

    .totals-section {
      margin-top: 8px;
      font-size: 13px;
      color: #555;
    }

    .totals-highlight {
      background: #fff3cd;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: bold;
    }

    .print-btn {
      display: block;
      width: 100%;
      padding: 15px;
      background: #0070f3;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      margin-top: 20px;
    }
    .print-btn:hover {
      background: #0051a8;
    }

    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #333;
      text-align: center;
      font-size: 12px;
      color: #666;
    }

    .daily-summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .daily-summary-table th,
    .daily-summary-table td {
      border: 1px solid #333;
      padding: 10px;
      text-align: left;
    }
    .daily-summary-table th {
      background: #f0f0f0;
      font-weight: bold;
    }
    .summary-row td {
      font-weight: bold;
      background: #f8f9fa;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 CEVICT BETTING TRACKER</h1>
      <div class="date">${formatDate(date)} | ${picksData.picks.length} Picks</div>
    </div>

    <div class="summary">
      <div class="summary-item">
        <div class="label">Total Bets</div>
        <div class="value">${picksData.picks.length}</div>
      </div>
      <div class="summary-item">
        <div class="label">Avg Confidence</div>
        <div class="value">${Math.round(picksData.picks.reduce((acc, p) => acc + p.confidence, 0) / picksData.picks.length)}%</div>
      </div>
      <div class="summary-item">
        <div class="label">Avg Edge</div>
        <div class="value">${(picksData.picks.reduce((acc, p) => acc + (p.value_bet_edge || 0), 0) / picksData.picks.length).toFixed(1)}%</div>
      </div>
    </div>

    ${picksData.picks.map((pick, index) => `
    <div class="bet-card">
      <div class="bet-header">
        <span class="bet-number">Bet #${index + 1}</span>
        <span class="sport-tag">${pick.sport}</span>
      </div>

      <div class="teams">
        ${pick.away_team} @ ${pick.home_team}
      </div>

      <div class="pick-info">
        <div class="pick-info-item">
          <div class="label">PICK</div>
          <div class="value">${pick.pick}</div>
        </div>
        <div class="pick-info-item">
          <div class="label">TYPE</div>
          <div class="value">${pick.pick_type}${pick.recommended_line != null ? ` ${pick.recommended_line > 0 ? '+' : ''}${pick.recommended_line}` : ''}</div>
        </div>
        <div class="pick-info-item">
          <div class="label">ODDS</div>
          <div class="value ${pick.odds > 0 ? 'odds-positive' : 'odds-negative'}">${formatOdds(pick.odds)}</div>
        </div>
        <div class="pick-info-item">
          <div class="label">CONFIDENCE</div>
          <div class="value ${pick.confidence >= 85 ? 'confidence-high' : pick.confidence >= 70 ? 'confidence-medium' : 'confidence-low'}">${pick.confidence}%</div>
        </div>
        ${pick.expected_value ? `
        <div class="pick-info-item">
          <div class="label">EV</div>
          <div class="value">$${pick.expected_value}</div>
        </div>
        ` : ''}
      </div>

      ${pick.mc_predicted_score ? `
      <div class="score-prediction">
        🎯 Predicted Score: ${pick.mc_predicted_score.away} - ${pick.mc_predicted_score.home}
      </div>
      ` : ''}

      ${pick.total && pick.total.prediction ? `
      <div class="totals-section">
        📊 Total: <span class="totals-highlight">${pick.total.prediction.toUpperCase()} ${pick.total.line}</span>
        (Edge: ${pick.total.edge?.toFixed(1)}%)
      </div>
      ` : ''}

      <div class="pick-info" style="margin-top: 8px;">
        <div class="pick-info-item">
          <div class="label">GAME TIME</div>
          <div class="value">${formatTime(pick.game_time)}</div>
        </div>
      </div>

      <div class="checkbox-section">
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span class="checkbox-label">WIN ✓</span>
        </div>
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span class="checkbox-label">LOSS ✗</span>
        </div>
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span class="checkbox-label">PUSH ➖</span>
        </div>
        <div class="checkbox-item">
          <span class="checkbox"></span>
          <span class="checkbox-label">NO BET</span>
        </div>
      </div>

      <div class="notes-section">
        <div class="notes-label">Notes:</div>
        <div class="notes-line"></div>
        <div class="notes-line"></div>
      </div>
    </div>
    `).join('')}

    <div class="footer">
      <p><strong>End of Day Summary</strong></p>
      <table class="daily-summary-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Bets Placed</td>
            <td>_______</td>
          </tr>
          <tr>
            <td>Wins</td>
            <td>_______</td>
          </tr>
          <tr>
            <td>Losses</td>
            <td>_______</td>
          </tr>
          <tr>
            <td>Pushes</td>
            <td>_______</td>
          </tr>
          <tr class="summary-row">
            <td>Net Result ($)</td>
            <td>$_______</td>
          </tr>
          <tr class="summary-row">
            <td>ROI (%)</td>
            <td>_______%</td>
          </tr>
        </tbody>
      </table>

      <p style="margin-top: 20px; font-style: italic;">
        Generated by Cevict Flex AI • ${new Date().toLocaleString()}
      </p>
    </div>

    <button class="print-btn no-print" onclick="window.print()">
      🖨️ Print This Sheet
    </button>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={loadPicks}
          disabled={loading}
          style={{
            padding: '10px 16px',
            background: loading ? '#ccc' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          {loading ? 'Loading…' : '📂 Load Picks for Date'}
        </button>

        <button
          onClick={generatePrintableSheet}
          disabled={!picksData}
          style={{
            padding: '10px 16px',
            background: picksData ? '#28a745' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: picksData ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          🖨️ Generate Printable Sheet
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          background: '#ffe6e6',
          borderRadius: '6px',
          color: '#c00',
          marginBottom: '16px'
        }}>
          Error: {error}
        </div>
      )}

      {picksData && (
        <div style={{
          padding: '12px 16px',
          background: '#d4edda',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <strong>✓ Loaded {picksData.picks.length} picks</strong> for {date}
          <br />
          <span style={{ fontSize: '13px', color: '#555' }}>
            Click "Generate Printable Sheet" to create your pen & paper tracking sheet
          </span>
        </div>
      )}
    </div>
  );
}
