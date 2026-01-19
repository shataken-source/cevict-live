"use client";

import { useCallback, useState } from "react";
import { BankrollOptimizerInput, LiveGameScore, optimizeBankroll, OptimizedBet } from "./bankroll-optimizer";

export default function BankrollOptimizerPage() {
  const [currentBankroll, setCurrentBankroll] = useState(200);
  const [targetBankroll, setTargetBankroll] = useState(500);
  const [riskProfile, setRiskProfile] = useState<'safe' | 'balanced' | 'aggressive'>('balanced');
  const [maxBets, setMaxBets] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Live game scores - pre-populate with current game (Detroit vs Dallas)
  // Game ID can be team name or actual game ID - will match flexibly
  const [liveScores, setLiveScores] = useState<LiveGameScore[]>([
    {
      gameId: 'detroit', // Will match "Detroit Lions" or "Detroit" in team names
      homeScore: 10, // Detroit (home)
      awayScore: 6,  // Dallas (away)
      timeRemaining: '9:12',
      lastUpdated: new Date()
    }
  ]);
  const [newLiveScore, setNewLiveScore] = useState({
    gameId: '',
    homeScore: 0,
    awayScore: 0,
    timeRemaining: '',
    lastUpdated: new Date()
  });

  const handleOptimize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const input: BankrollOptimizerInput = {
        currentBankroll,
        targetBankroll,
        riskProfile,
        maxBets,
        availableGames: [] // Empty array for now
      };

      const optimization = await optimizeBankroll(input);
      setResult(optimization);
    } catch (err: any) {
      setError(err.message || 'Failed to optimize bankroll');
      console.error('Bankroll optimization error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentBankroll, targetBankroll, liveScores, riskProfile, maxBets]);

  const addLiveScore = () => {
    if (newLiveScore.gameId && newLiveScore.homeScore >= 0 && newLiveScore.awayScore >= 0) {
      setLiveScores([...liveScores, {
        gameId: newLiveScore.gameId,
        homeScore: newLiveScore.homeScore,
        awayScore: newLiveScore.awayScore,
        timeRemaining: newLiveScore.timeRemaining || '',
        lastUpdated: new Date()
      }]);
      setNewLiveScore({ gameId: '', homeScore: 0, awayScore: 0, timeRemaining: '', lastUpdated: new Date() });
    }
  };

  const removeLiveScore = (index: number) => {
    setLiveScores(liveScores.filter((_, i) => i !== index));
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", color: "#fff", background: "#0a0a0a", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "32px", marginBottom: "10px", color: "#00ffaa" }}>💰 PROGNO Bankroll Optimizer</h1>
      <p style={{ color: "#aaa", marginBottom: "30px" }}>
        Turn your bankroll into your target by finding the best bets across all sports
      </p>

      {/* Input Section */}
      <div style={{ background: "#1a1a1a", padding: "25px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #333" }}>
        <h2 style={{ fontSize: "20px", marginBottom: "20px", color: "#00b4ff" }}>Bankroll Settings</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginBottom: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#aaa" }}>Current Bankroll ($)</label>
            <input
              type="number"
              value={currentBankroll}
              onChange={(e) => setCurrentBankroll(Number(e.target.value))}
              style={{ width: "100%", padding: "10px", background: "#222", border: "1px solid #444", borderRadius: "4px", color: "#fff", fontSize: "16px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#aaa" }}>Target Bankroll ($)</label>
            <input
              type="number"
              value={targetBankroll}
              onChange={(e) => setTargetBankroll(Number(e.target.value))}
              style={{ width: "100%", padding: "10px", background: "#222", border: "1px solid #444", borderRadius: "4px", color: "#fff", fontSize: "16px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#aaa" }}>Risk Profile</label>
            <select
              value={riskProfile}
              onChange={(e) => setRiskProfile(e.target.value as any)}
              style={{ width: "100%", padding: "10px", background: "#222", border: "1px solid #444", borderRadius: "4px", color: "#fff", fontSize: "16px" }}
            >
              <option value="safe">Safe</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", color: "#aaa" }}>Max Bets</label>
            <input
              type="number"
              value={maxBets}
              onChange={(e) => setMaxBets(Number(e.target.value))}
              min={1}
              max={10}
              style={{ width: "100%", padding: "10px", background: "#222", border: "1px solid #444", borderRadius: "4px", color: "#fff", fontSize: "16px" }}
            />
          </div>
        </div>

        {/* Live Scores Section */}
        <div style={{ marginTop: "25px", paddingTop: "25px", borderTop: "1px solid #333" }}>
          <h3 style={{ fontSize: "18px", marginBottom: "15px", color: "#00b4ff" }}>Live Game Scores (Optional)</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "15px" }}>
            <input
              type="text"
              placeholder="Game ID"
              value={newLiveScore.gameId}
              onChange={(e) => setNewLiveScore({ ...newLiveScore, gameId: e.target.value })}
              style={{ padding: "8px", background: "#222", border: "1px solid #444", borderRadius: "4px", color: "#fff" }}
            />
            <input
              type="number"
              placeholder="Home Score"
              value={newLiveScore.homeScore}
              onChange={(e) => setNewLiveScore({ ...newLiveScore, homeScore: Number(e.target.value) })}
              style={{ padding: "8px", background: "#222", border: "1px solid #444", borderRadius: "4px", color: "#fff" }}
            />
            <input
              type="number"
              placeholder="Away Score"
              value={newLiveScore.awayScore}
              onChange={(e) => setNewLiveScore({ ...newLiveScore, awayScore: Number(e.target.value) })}
              style={{ padding: "8px", background: "#222", border: "1px solid #444", borderRadius: "4px", color: "#fff" }}
            />
            <input
              type="text"
              placeholder="Time (e.g., 9:12)"
              value={newLiveScore.timeRemaining}
              onChange={(e) => setNewLiveScore({ ...newLiveScore, timeRemaining: e.target.value })}
              style={{ padding: "8px", background: "#222", border: "1px solid #444", borderRadius: "4px", color: "#fff" }}
            />
            <button
              onClick={addLiveScore}
              style={{ padding: "8px 16px", background: "#00b4ff", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
            >
              Add Live Score
            </button>
          </div>

          {liveScores.length > 0 && (
            <div style={{ marginTop: "15px" }}>
              <h4 style={{ fontSize: "14px", marginBottom: "10px", color: "#aaa" }}>Active Live Scores:</h4>
              {liveScores.map((score, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", background: "#222", borderRadius: "4px", marginBottom: "5px" }}>
                  <span style={{ color: "#fff" }}>
                    {score.gameId}: {score.homeScore} - {score.awayScore}
                    {score.timeRemaining && ` (${score.timeRemaining})`}
                  </span>
                  <button
                    onClick={() => removeLiveScore(index)}
                    style={{ padding: "4px 8px", background: "#ff4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleOptimize}
          disabled={loading || currentBankroll <= 0 || targetBankroll <= currentBankroll}
          style={{
            marginTop: "25px",
            padding: "15px 30px",
            background: loading ? "#444" : "#00ffaa",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "18px",
            fontWeight: "bold",
            width: "100%"
          }}
        >
          {loading ? "🔄 Optimizing Bankroll..." : "🚀 Find Best Bets to Reach Target"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ background: "#442222", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #ff4444" }}>
          <p style={{ color: "#ff4444", margin: 0 }}>❌ {error}</p>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div style={{ background: "#1a1a1a", padding: "25px", borderRadius: "8px", border: "2px solid #00ffaa" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#00ffaa" }}>💰 Optimized Betting Strategy</h2>

          {/* Summary */}
          <div style={{ background: "#0a0a0a", padding: "20px", borderRadius: "8px", marginBottom: "25px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
              <div>
                <p style={{ color: "#aaa", margin: "0 0 5px 0", fontSize: "14px" }}>Current Bankroll</p>
                <p style={{ color: "#fff", margin: 0, fontSize: "24px", fontWeight: "bold" }}>${result.currentBankroll.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ color: "#aaa", margin: "0 0 5px 0", fontSize: "14px" }}>Target Bankroll</p>
                <p style={{ color: "#00ffaa", margin: 0, fontSize: "24px", fontWeight: "bold" }}>${result.targetBankroll.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ color: "#aaa", margin: "0 0 5px 0", fontSize: "14px" }}>Required Profit</p>
                <p style={{ color: "#00b4ff", margin: 0, fontSize: "24px", fontWeight: "bold" }}>${result.requiredProfit.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ color: "#aaa", margin: "0 0 5px 0", fontSize: "14px" }}>Total Stake</p>
                <p style={{ color: "#fff", margin: 0, fontSize: "24px", fontWeight: "bold" }}>
                  ${result.totalStake.toFixed(2)}
                </p>
                {(() => {
                  const sumOfBets = result.optimizedBets.reduce((sum: number, bet: OptimizedBet) => sum + bet.amount, 0);
                  const difference = Math.abs(result.totalStake - sumOfBets);
                  if (difference > 0.01) {
                    return (
                      <p style={{ color: "#ff4444", margin: "5px 0 0 0", fontSize: "12px" }}>
                        ⚠️ Sum of bets: ${sumOfBets.toFixed(2)} (diff: ${difference.toFixed(2)})
                      </p>
                    );
                  }
                  return (
                    <p style={{ color: "#00ffaa", margin: "5px 0 0 0", fontSize: "12px" }}>
                      ✓ Sum of bets: ${sumOfBets.toFixed(2)}
                    </p>
                  );
                })()}
              </div>
              <div>
                <p style={{ color: "#aaa", margin: "0 0 5px 0", fontSize: "14px" }}>Expected Value</p>
                <p style={{ color: result.expectedReturn > 0 ? "#00ffaa" : "#ff4444", margin: 0, fontSize: "24px", fontWeight: "bold" }}>
                  ${result.expectedReturn.toFixed(2)}
                </p>
              </div>
              <div>
                <p style={{ color: "#aaa", margin: "0 0 5px 0", fontSize: "14px" }}>Risk Score</p>
                <p style={{ color: result.riskScore > 5 ? "#ff4444" : "#00ffaa", margin: 0, fontSize: "24px", fontWeight: "bold" }}>
                  {result.riskScore.toFixed(1)}/10
                </p>
              </div>
            </div>
          </div>

          {/* Strategy Description */}
          <div style={{ background: "#0a0a0a", padding: "15px", borderRadius: "8px", marginBottom: "25px" }}>
            <p style={{ color: "#aaa", margin: 0, whiteSpace: "pre-line", lineHeight: "1.6" }}>
              {result.recommendations.length > 0 ? result.recommendations.join('\n') : 'Optimization complete. Follow the bet recommendations above.'}
            </p>
          </div>

          {/* Optimized Bets */}
          <h3 style={{ fontSize: "20px", marginBottom: "15px", color: "#00b4ff" }}>🎯 Recommended Bets</h3>

          {result.optimizedBets.map((optBet: OptimizedBet, index: number) => (
            <div key={index} style={{ background: "#0a0a0a", padding: "20px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "15px" }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: "18px", margin: "0 0 10px 0", color: "#00ffaa" }}>
                    #{index + 1} {optBet.betType.toUpperCase()}
                  </h4>
                  <p style={{ fontSize: "16px", margin: "0 0 5px 0", color: "#fff", fontWeight: "bold" }}>
                    {optBet.game.teams.home} vs {optBet.game.teams.away}
                  </p>
                  <p style={{ fontSize: "18px", margin: "0 0 10px 0", color: "#00b4ff", fontWeight: "bold" }}>
                    Pick: {optBet.betType}
                  </p>
                  <div style={{ marginBottom: "10px" }}>
                    <p style={{ fontSize: "14px", color: "#aaa", margin: "0 0 8px 0" }}>Analysis:</p>
                    <p style={{ fontSize: "14px", color: "#fff", margin: 0, lineHeight: "1.5" }}>
                      {optBet.reasoning}
                    </p>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", marginLeft: "20px" }}>
                <p style={{ color: "#aaa", margin: "0 0 5px 0", fontSize: "14px" }}>Confidence</p>
                <p style={{ color: "#00ffaa", margin: "0 0 15px 0", fontSize: "24px", fontWeight: "bold" }}>
                  {optBet.confidence}%
                </p>
                <p style={{ color: "#aaa", margin: "0 0 5px 0", fontSize: "14px" }}>Stake</p>
                <p style={{ color: "#fff", margin: "0 0 15px 0", fontSize: "20px", fontWeight: "bold" }}>
                  ${optBet.amount.toFixed(2)}
                </p>
                <p style={{ color: "#aaa", margin: "0 0 5px 0", fontSize: "14px" }}>Expected Value</p>
                <p style={{ color: optBet.expectedValue > 0 ? "#00ffaa" : "#ff4444", margin: 0, fontSize: "18px", fontWeight: "bold" }}>
                  ${optBet.expectedValue.toFixed(2)}
                </p>
              </div>
            </div>
          ))}

          {result.optimizedBets.length === 0 && (
            <div style={{ padding: "20px", background: "#222", borderRadius: "8px", textAlign: "center" }}>
              <p style={{ color: "#aaa", margin: 0 }}>No positive expected value bets found. Try adjusting your risk profile or target bankroll.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

