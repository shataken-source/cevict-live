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

    // Group picks by sport/league for organized printing
    const grouped: Record<string, Pick[]> = {};
    for (const pick of picksData.picks) {
      const league = pick.league || pick.sport || 'OTHER';
      if (!grouped[league]) grouped[league] = [];
      grouped[league].push(pick);
    }
    // Sort each group by game time
    for (const g of Object.values(grouped)) {
      g.sort((a, b) => new Date(a.game_time).getTime() - new Date(b.game_time).getTime());
    }

    let betNum = 0;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Picks - ${date}</title>
  <style>
    @page { size: letter; margin: 0.35in 0.4in; }
    @media print {
      .no-print { display: none !important; }
      body { background: white; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      font-size: 9px;
      line-height: 1.3;
      background: #f5f5f5;
      padding: 10px;
    }
    .page {
      max-width: 7.5in;
      margin: 0 auto;
      background: white;
      padding: 12px 14px;
    }
    .hdr {
      text-align: center;
      border-bottom: 2px solid #222;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .hdr h1 { font-size: 14px; letter-spacing: 1px; }
    .hdr .sub { font-size: 10px; color: #666; margin-top: 1px; }
    .league-hdr {
      background: #222;
      color: #fff;
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      margin: 6px 0 3px 0;
      border-radius: 2px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }
    .card {
      border: 1px solid #999;
      border-radius: 3px;
      padding: 4px 6px;
      page-break-inside: avoid;
      background: #fff;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1px;
    }
    .card-num {
      font-size: 7px;
      color: #999;
      font-weight: 700;
    }
    .card-time {
      font-size: 7px;
      color: #666;
    }
    .matchup {
      font-size: 9px;
      font-weight: 700;
      color: #111;
      margin-bottom: 2px;
    }
    .pick-row {
      display: flex;
      gap: 2px;
      align-items: baseline;
      flex-wrap: wrap;
    }
    .pick-name {
      font-size: 9px;
      font-weight: 700;
      color: #0050a0;
    }
    .tag {
      font-size: 7px;
      padding: 0px 3px;
      border-radius: 2px;
      font-weight: 600;
      display: inline-block;
    }
    .tag-type { background: #e8e8e8; color: #333; }
    .tag-odds { background: #fff3e0; color: #b45000; }
    .tag-conf { font-weight: 700; }
    .conf-hi { color: #1a8d1a; }
    .conf-md { color: #b08800; }
    .conf-lo { color: #c00; }
    .tag-ev { background: #e8f5e9; color: #2e7d32; }
    .score-line {
      font-size: 7px;
      color: #555;
      margin-top: 1px;
    }
    .cb-row {
      display: flex;
      gap: 6px;
      margin-top: 2px;
      padding-top: 2px;
      border-top: 1px dashed #ccc;
    }
    .cb {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 7px;
      color: #444;
      font-weight: 600;
    }
    .cb-box {
      width: 10px;
      height: 10px;
      border: 1.5px solid #555;
      border-radius: 1px;
      display: inline-block;
    }
    .footer {
      text-align: center;
      margin-top: 6px;
      font-size: 7px;
      color: #999;
      border-top: 1px solid #ddd;
      padding-top: 3px;
    }
    .print-btn {
      display: block;
      width: 200px;
      margin: 12px auto;
      padding: 10px;
      background: #0070f3;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .print-btn:hover { background: #0051a8; }
  </style>
</head>
<body>
  <div class="page">
    <div class="hdr">
      <h1>CEVICT PICKS</h1>
      <div class="sub">${formatDate(date)} &bull; ${picksData.picks.length} picks &bull; Avg conf ${Math.round(picksData.picks.reduce((a, p) => a + p.confidence, 0) / picksData.picks.length)}%</div>
    </div>
    ${Object.entries(grouped).map(([league, picks]) => `
    <div class="league-hdr">${league} (${picks.length})</div>
    <div class="grid">
      ${picks.map((pick) => {
      betNum++;
      const typeStr = pick.pick_type + (pick.recommended_line != null ? ` ${pick.recommended_line > 0 ? '+' : ''}${pick.recommended_line}` : '');
      const confClass = pick.confidence >= 80 ? 'conf-hi' : pick.confidence >= 65 ? 'conf-md' : 'conf-lo';
      return `
      <div class="card">
        <div class="card-top">
          <span class="card-num">#${betNum}</span>
          <span class="card-time">${formatTime(pick.game_time)}</span>
        </div>
        <div class="matchup">${pick.away_team} @ ${pick.home_team}</div>
        <div class="pick-row">
          <span class="pick-name">${pick.pick}</span>
          <span class="tag tag-type">${typeStr}</span>
          <span class="tag tag-odds">${formatOdds(pick.odds)}</span>
          <span class="tag tag-conf ${confClass}">${pick.confidence}%</span>
          ${pick.expected_value ? `<span class="tag tag-ev">EV $${pick.expected_value}</span>` : ''}
        </div>
        ${pick.mc_predicted_score ? `<div class="score-line">Pred: ${pick.mc_predicted_score.away} - ${pick.mc_predicted_score.home}</div>` : ''}
        <div class="cb-row">
          <span class="cb"><span class="cb-box"></span>W</span>
          <span class="cb"><span class="cb-box"></span>L</span>
          <span class="cb"><span class="cb-box"></span>P</span>
          <span class="cb"><span class="cb-box"></span>SKIP</span>
        </div>
      </div>`;
    }).join('')}
    </div>
    `).join('')}
    <div class="footer">Cevict Flex AI &bull; ${new Date().toLocaleString()}</div>
    <button class="print-btn no-print" onclick="window.print()">Print</button>
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
