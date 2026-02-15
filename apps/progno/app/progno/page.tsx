// app/progno/page.tsx
'use client';

import { useState, useEffect } from 'react';

export default function LiveDashboard() {
  const [sport, setSport] = useState('nhl');
  const [games, setGames] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [predictingAll, setPredictingAll] = useState(false);
  const [predictingProgress, setPredictingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const gamesRes = await fetch(`/api/progno/v2?action=games&sport=${sport}`);
      const gamesData = await gamesRes.json();
      if (!gamesData.success) throw new Error(gamesData.error?.message || 'Failed to load games');
      setGames(gamesData.data || []);

      const scoresRes = await fetch(`/api/progno/v2?action=live-scores&sport=${sport}`);
      const scoresData = await scoresRes.json();
      if (!scoresData.success) throw new Error(scoresData.error?.message || 'Failed to load scores');
      setScores(scoresData.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const predictGame = async (game: any) => {
    try {
      const res = await fetch(`/api/progno/v2?action=prediction&gameId=${game.id}&sport=${sport}`);
      const data = await res.json();

      if (data.success) {
        setPredictions(prev => ({
          ...prev,
          [game.id]: data.data
        }));
      } else {
        alert(`Prediction failed for ${game.homeTeam} vs ${game.awayTeam}: ${data.error?.message}`);
      }
    } catch (err) {
      alert(`Error predicting ${game.homeTeam} vs ${game.awayTeam}`);
    }
  };

  const runAllPredictions = async () => {
    if (games.length === 0) return;
    setPredictingAll(true);
    setError(null);
    let done = 0;
    let failed = 0;
    const total = games.length;
    for (let i = 0; i < total; i++) {
      const game = games[i];
      try {
        const res = await fetch(`/api/progno/v2?action=prediction&gameId=${game.id}`);
        const data = await res.json();
        if (data.success) {
          setPredictions(prev => ({ ...prev, [game.id]: data.data }));
          done++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      // Allow UI to update progress (batch state updates)
      if (i < total - 1) await new Promise(r => setTimeout(r, 0));
    }
    setPredictingAll(false);
    if (failed > 0) {
      setError(`${done} predictions loaded; ${failed} failed.`);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sport]);

  const mergedGames = games.map(game => ({
    ...game,
    scoreInfo: scores.find(s => s.id === game.id),
    prediction: predictions[game.id]
  }));

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>PROGNO — Live Sports Dashboard</h1>

      <div style={{ margin: '20px 0' }}>
        <label>Sport: </label>
        <select value={sport} onChange={e => setSport(e.target.value)}>
          <option value="nhl">NHL</option>
          <option value="nba">NBA</option>
          <option value="nfl">NFL</option>
          <option value="ncaab">NCAAB</option>
          <option value="ncaaf">NCAAF</option>
          <option value="mlb">MLB</option>
          <option value="nascar">NASCAR</option>
        </select>
        <a href="/progno/admin" style={{ marginLeft: '20px', fontSize: '14px', color: '#666' }}>Admin</a>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{ marginLeft: '15px', padding: '8px 16px', background: loading ? '#ccc' : '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {loading ? 'Refreshing...' : 'Refresh Now'}
        </button>
        <button
          onClick={runAllPredictions}
          disabled={loading || predictingAll || games.length === 0}
          style={{ marginLeft: '10px', padding: '8px 16px', background: loading || predictingAll || games.length === 0 ? '#ccc' : '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {predictingAll ? `Running… (${predictingProgress}/${games.length})` : 'Run All Predictions'}
        </button>
      </div>

      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>Error: {error}</p>}

      {loading && <p>Loading live games...</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '20px' }}>
        {mergedGames.length === 0 && !loading && (
          <p>No games or odds available for {sport.toUpperCase()} right now.</p>
        )}

        {mergedGames.map(game => {
          const isLive = game.scoreInfo && !game.scoreInfo.completed;
          const isCompleted = game.scoreInfo?.completed;

          return (
            <div key={game.id} style={{ border: '1px solid #ddd', padding: '16px', borderRadius: '8px', background: '#fff' }}>
              <h3 style={{ margin: '0 0 8px' }}>
                {game.homeTeam} vs {game.awayTeam}
              </h3>
              <p style={{ margin: '4px 0', color: '#555' }}>
                {new Date(game.startTime).toLocaleString()} • {game.venue}
              </p>

              {isLive && (
                <p style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#28a745' }}>
                  LIVE: {game.scoreInfo?.homeScore ?? '?'} - {game.scoreInfo?.awayScore ?? '?'}
                </p>
              )}
              {isCompleted && (
                <p style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                  FINAL: {game.scoreInfo?.homeScore ?? '?'} - {game.scoreInfo?.awayScore ?? '?'}
                </p>
              )}

              <div style={{ margin: '12px 0' }}>
                <strong>Moneyline:</strong><br />
                {game.homeTeam}: {game.odds?.moneyline?.home ?? 'N/A'}<br />
                {game.awayTeam}: {game.odds?.moneyline?.away ?? 'N/A'}
              </div>

              <div>
                <strong>Spread:</strong> {game.homeTeam} {game.odds?.spread?.home ?? 'N/A'} • Total: {game.odds?.total?.line ?? 'N/A'}
              </div>

              {game.prediction ? (
                <div style={{ marginTop: '12px', padding: '10px', background: '#e6f3ff', borderRadius: '6px' }}>
                  <strong>Prediction:</strong> {game.prediction.winner} wins<br />
                  Confidence: {((game.prediction.confidence ?? 0) * 100).toFixed(1)}%<br />
                  Projected: {game.prediction.score?.home ?? '?'} - {game.prediction.score?.away ?? '?'}
                  {game.prediction.keyFactors && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>Key Factors:</strong>
                      <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                        {game.prediction.keyFactors.map((factor: string, i: number) => (
                          <li key={i}>{factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => predictGame(game)}
                  style={{ marginTop: '12px', padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Run Prediction
                </button>
              )}
            </div>
          );
        })}
      </div>

      <footer style={{ marginTop: '40px', textAlign: 'center', color: '#777' }}>
        © 2026 PROGNO • Cevict Flux v2.0 • Claude Effect Engine<br />
        For entertainment purposes only. Gamble responsibly.
      </footer>
    </div>
  );
}
