"use client";

import { useEffect, useState } from "react";
import { validateBet, ValidationResult } from "./bet-validator";
import { getHistory, HistoricalBet, updateBetResult } from "./history-tracker";
import { Game } from "./weekly-analyzer";
// Using inline styles to match PROGNO design

export default function PendingBetsPage() {
  const [pendingBets, setPendingBets] = useState<HistoricalBet[]>([]);
  const [editingBetId, setEditingBetId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, { home: string; away: string }>>({});
  const [playerStats, setPlayerStats] = useState<Record<string, { qbTds?: string; qbYards?: string; wrReceptions?: string }>>({});

  useEffect(() => {
    loadPendingBets();
  }, []);

  const loadPendingBets = () => {
    const history = getHistory();
    // Get bets without actualResult (pending)
    const pending = history.filter(bet => bet.result === 'pending');
    // Sort by game date (most recent first)
    pending.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setPendingBets(pending);
  };

  const handleAddScore = (bet: HistoricalBet) => {
    setEditingBetId(bet.id);
    setScoreInputs({
      ...scoreInputs,
      [bet.id]: {
        home: '',
        away: ''
      }
    });
  };

  const handleSaveScore = (bet: HistoricalBet) => {
    const scores = scoreInputs[bet.id];
    if (!scores || !scores.home || !scores.away) {
      alert('Please enter both home and away scores');
      return;
    }

    const homeScore = parseFloat(scores.home);
    const awayScore = parseFloat(scores.away);

    if (isNaN(homeScore) || isNaN(awayScore)) {
      alert('Please enter valid numbers');
      return;
    }

    const actualScore = { home: homeScore, away: awayScore };

    // Build game object from bet data
    const [homeTeam, awayTeam] = bet.game.split(' vs ');
    const game: Game = {
      id: bet.id,
      sport: 'Unknown', // Not available in HistoricalBet
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      date: bet.date,
      odds: {
        home: bet.odds,
        away: -bet.odds, // Calculate away odds
        spread: 0, // Not available in HistoricalBet
        total: 0 // Not available in HistoricalBet
      },
      venue: 'Unknown' // Not available in HistoricalBet
    };

    // Build player stats for prop bets
    const stats = playerStats[bet.id] || {};
    const playerStatsForValidation = bet.betType === 'prop' ? {
      homeQB: stats.qbTds ? { passingTDs: parseFloat(stats.qbTds) } : undefined,
      awayQB: stats.qbYards ? { passingYards: parseFloat(stats.qbYards) } : undefined,
      homeWR: stats.wrReceptions ? { receptions: parseFloat(stats.wrReceptions) } : undefined,
    } : undefined;

    // Validate the bet
    const result: ValidationResult = validateBet({
      game: bet.game,
      betType: bet.betType,
      selection: bet.selection,
      odds: bet.odds,
      amount: bet.amount
    });

    // Simple win/loss logic based on actual score (simplified)
    const won = result.isValid; // Use isValid as a simple win indicator
    const payout = won ? bet.amount * (bet.odds / 100) : 0;

    // Update the bet
    updateBetResult(bet.id, won ? 'win' : 'lose', `${actualScore.home}-${actualScore.away}`);

    // Reload pending bets
    loadPendingBets();
    setEditingBetId(null);
    setScoreInputs({ ...scoreInputs, [bet.id]: { home: '', away: '' } });
  };

  const handleCancel = (betId: string) => {
    setEditingBetId(null);
    setScoreInputs({ ...scoreInputs, [betId]: { home: '', away: '' } });
  };

  if (pendingBets.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#fff", background: "#0a0a0a", minHeight: "100vh" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "20px", color: "#00ffaa" }}>📋 Pending Bets</h1>
        <div style={{ maxWidth: "600px", margin: "0 auto", background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "40px" }}>
          <div style={{ fontSize: "64px", textAlign: "center", marginBottom: "20px" }}>✅</div>
          <h2 style={{ fontSize: "24px", marginBottom: "10px", color: "#fff", textAlign: "center" }}>All Caught Up!</h2>
          <p style={{ color: "#aaa", textAlign: "center" }}>You don't have any pending bets. All your bets have been calculated.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "10px", color: "#00ffaa" }}>📋 Pending Bets</h1>
        <p style={{ color: "#aaa", marginBottom: "30px" }}>
          You have <strong style={{ color: "#00ffaa" }}>{pendingBets.length}</strong> bet(s) waiting for final scores
        </p>

        <div style={{ display: "grid", gap: "20px" }}>
          {pendingBets.map((bet) => (
            <div key={bet.id} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
              <div style={{ marginBottom: "15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <h3 style={{ color: "#00ffaa", fontSize: "20px", marginBottom: "5px" }}>
                      Unknown • {bet.betType.toUpperCase()}
                    </h3>
                    <p style={{ color: "#aaa", fontSize: "16px" }}>
                      {bet.game}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: "#00b4ff", fontSize: "18px", fontWeight: "bold", marginBottom: "5px" }}>
                      {bet.selection}
                    </p>
                    <p style={{ color: "#aaa", fontSize: "14px" }}>
                      Confidence: <span style={{ color: "#00ffaa" }}>{bet.confidence}%</span>
                    </p>
                    <p style={{ color: "#aaa", fontSize: "14px" }}>
                      Stake: <span style={{ color: "#fff" }}>${bet.amount.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "15px", padding: "15px", background: "#0a0a0a", borderRadius: "6px" }}>
                  <div>
                    <p style={{ color: "#aaa", fontSize: "12px", marginBottom: "5px" }}>Game Date</p>
                    <p style={{ color: "#fff", fontSize: "14px" }}>
                      {new Date(bet.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "#aaa", fontSize: "12px", marginBottom: "5px" }}>Edge</p>
                    <p style={{ color: "#00ffaa", fontSize: "14px" }}>+0.00 pts</p>
                  </div>
                  <div>
                    <p style={{ color: "#aaa", fontSize: "12px", marginBottom: "5px" }}>Rationale</p>
                    <p style={{ color: "#aaa", fontSize: "14px" }}>No rationale available</p>
                  </div>
                </div>

                {editingBetId === bet.id ? (
                  <div style={{ padding: "15px", background: "#0a0a0a", borderRadius: "6px", border: "2px solid #00b4ff" }}>
                    <h4 style={{ color: "#00b4ff", marginBottom: "15px" }}>Enter Final Score</h4>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                      <div>
                        <label style={{ display: "block", color: "#aaa", marginBottom: "5px", fontSize: "14px" }}>
                          {bet.game.split(' vs ')[0]} (Home)
                        </label>
                        <input
                          type="number"
                          value={scoreInputs[bet.id]?.home || ''}
                          onChange={(e) => setScoreInputs({
                            ...scoreInputs,
                            [bet.id]: {
                              ...scoreInputs[bet.id],
                              home: e.target.value
                            }
                          })}
                          placeholder="Home score"
                          style={{ width: "100%", padding: "10px", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "4px", fontSize: "16px" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", color: "#aaa", marginBottom: "5px", fontSize: "14px" }}>
                          {bet.game.split(' vs ')[1]} (Away)
                        </label>
                        <input
                          type="number"
                          value={scoreInputs[bet.id]?.away || ''}
                          onChange={(e) => setScoreInputs({
                            ...scoreInputs,
                            [bet.id]: {
                              ...scoreInputs[bet.id],
                              away: e.target.value
                            }
                          })}
                          placeholder="Away score"
                          style={{ width: "100%", padding: "10px", background: "#222", border: "1px solid #444", color: "#fff", borderRadius: "4px", fontSize: "16px" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => handleSaveScore(bet)}
                        style={{ flex: 1, padding: "12px", background: "#00ffaa", color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "16px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        ✅ Save Score
                      </button>
                      <button
                        onClick={() => handleCancel(bet.id)}
                        style={{ flex: 1, padding: "12px", background: "#222", color: "#fff", border: "1px solid #444", borderRadius: "6px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddScore(bet)}
                    style={{ width: "100%", padding: "12px", background: "#00b4ff", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "16px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    📅 Add Final Score
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

