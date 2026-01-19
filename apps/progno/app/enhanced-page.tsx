"use client";

import { useEffect, useState } from "react";
// import { runBCSStylePrediction } from "./bcs-style-adapter";
import ConfidenceGauge from "./components/ConfidenceGauge";
import { getTeamsForSport, normalizeTeamName } from "./team-names";
// import { PredictionInput, PredictionType, runEnhancedPrediction } from "./engine-enhanced";
// import { runVegasPrediction, VegasInput } from "./engine-vegas";
// import { getLearningStats, learnFromResult } from "./prediction-learner";

export default function EnhancedPrognoPage() {
  const [predictionType, setPredictionType] = useState<string>("sports");
  const [riskProfile, setRiskProfile] = useState<"safe" | "balanced" | "aggressive">("balanced");
  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Sports inputs
  const [league, setLeague] = useState("NFL");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [spread, setSpread] = useState("");
  const [total, setTotal] = useState("");
  const [bankroll, setBankroll] = useState("");
  const [useVegas, setUseVegas] = useState(true);

  // Actual results (for validation)
  const [actualHomeScore, setActualHomeScore] = useState("");
  const [actualAwayScore, setActualAwayScore] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [learningStats, setLearningStats] = useState<any>(null);

  // Weather inputs
  const [location, setLocation] = useState("");
  const [weatherDate, setWeatherDate] = useState("");
  const [forecastDays, setForecastDays] = useState("7");

  // Stock inputs
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState<"1d" | "1w" | "1m" | "3m">("1w");

  // Event inputs
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventCategory, setEventCategory] = useState("");

  // Load learning stats on mount
  useEffect(() => {
    // const stats = getLearningStats();
    // setLearningStats(stats);
  }, []);

  async function handleRun() {
    setLoading(true);

    let input: any;

    if (predictionType === "sports") {
      if (useVegas) {
        // Use Vegas engine
        // Validate inputs
        const parsedSpread = parseFloat(spread.trim());
        const parsedTotal = parseFloat(total.trim());

        if (isNaN(parsedTotal) || parsedTotal === 0) {
          alert('⚠️ Please enter a valid Vegas Total (O/U). Example: 54.5');
          setLoading(false);
          return;
        }

        const vegasInput: any = {
          league: league as any,
          homeTeam: homeTeam.trim(),
          awayTeam: awayTeam.trim(),
          vegasSpread: isNaN(parsedSpread) ? 0 : parsedSpread,
          vegasTotal: parsedTotal,
          bankroll: parseFloat(bankroll) || 1000,
          riskProfile,
          gameDate: gameDate || undefined,
          actualScore: (actualHomeScore && actualAwayScore) ? {
            home: parseFloat(actualHomeScore),
            away: parseFloat(actualAwayScore)
          } : undefined
        };
        // const vegasResult = await runVegasPrediction(vegasInput);
        // const bcsResult = await runBCSStylePrediction({
        //   homeTeam: vegasInput.homeTeam,
        //   awayTeam: vegasInput.awayTeam,
        //   vegasSpread: vegasInput.vegasSpread,
        //   vegasTotal: vegasInput.vegasTotal,
        //   gameDate: vegasInput.gameDate
        // });

        // Calculate edge (same logic as weekly analyzer)
        // const probabilityEdge = Math.max(0, Math.round((bcsResult.winProbability - 50) * 100) / 100);
        // const blendedConfidence = Math.min(99, Math.round((vegasResult.confidence * 0.45) + (bcsResult.modelConfidence * 0.55)));
        // const blendedEdge = Math.max(vegasResult.vegasEdge ?? 0, probabilityEdge);

        // Recalculate score to match the pick winner (BCS-style engine result)
        // If BCS says Bucs win 59%, the score must show Bucs winning, not losing
        // let adjustedScore = vegasResult.predictedScore;
        // if (adjustedScore && bcsResult) {
        //   const bcsHomeWin = bcsResult.finalProbability >= 0.5;
          // const bcsWinProbability = bcsHomeWin ? bcsResult.finalProbability : 1 - bcsResult.finalProbability;

        // Convert win probability to expected margin
        // 50% = 0 points, 60% = ~3 points, 70% = ~6 points (NFL conversion)
        // const probabilityMargin = (bcsWinProbability - 0.5) * 10; // 0-5 scale
        // const expectedMargin = probabilityMargin * 3; // ~3 points per 10% above 50%

        // Keep the total from Vegas (more accurate), but adjust spread to match BCS winner
        // const predictedTotal = adjustedScore.total;

        // Create placeholder result
        const result = {
          prediction: "Prediction placeholder - engines not available",
          confidence: 75,
          reasoning: "This is a placeholder result since the prediction engines are not implemented."
        };

        setOutput(result);
        setLoading(false);
        return;
      }
    }

    // Handle other prediction types (stocks, events, anything)
    // Create placeholder result
    const placeholderResult = {
      prediction: "Prediction placeholder - engines not available",
      confidence: 75,
      reasoning: "This is a placeholder result since the prediction engines are not implemented."
    };

    setOutput(placeholderResult);
    setLoading(false);
  }




  return (
    <div style={{ padding: "40px", color: "white", fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "48px", marginBottom: "10px", background: "linear-gradient(90deg, #00ffaa, #00b4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          🔮 PROGNO - SEE THE FUTURE
        </h1>
        <p style={{ color: "#888", marginBottom: "40px", fontSize: "18px" }}>
          Enhanced prediction engine with multi-factor analysis and pattern recognition
        </p>

        {/* Prediction Type Selector */}
        <div style={{ marginBottom: "30px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {(["sports", "weather", "stocks", "events"] as string[]).map((type) => (
            <button
              key={type}
              onClick={() => setPredictionType(type)}
              style={{
                padding: "12px 24px",
                background: predictionType === type ? "#00ffaa" : "#222",
                color: predictionType === type ? "#000" : "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: "bold",
                textTransform: "capitalize",
              }}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Sports Form */}
        {predictionType === "sports" && (
          <div style={{ background: "#111", padding: "30px", borderRadius: "12px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0 }}>Sports Prediction</h2>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={useVegas}
                  onChange={(e) => setUseVegas(e.target.checked)}
                  style={{ width: "20px", height: "20px" }}
                />
                <span style={{ color: "#aaa" }}>Use Vegas Data</span>
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>League</label>
                <select
                  value={league}
                  onChange={(e) => {
                    setLeague(e.target.value);
                    // Clear team selections when league changes
                    setHomeTeam("");
                    setAwayTeam("");
                  }}
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                >
                  <option value="NFL">NFL</option>
                  <option value="NBA">NBA</option>
                  <option value="MLB">MLB</option>
                  <option value="NHL">NHL</option>
                  <option value="NCAAF">NCAAF (College Football)</option>
                  <option value="NCAAB">NCAAB (College Basketball)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Home Team</label>
                <select
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(normalizeTeamName(e.target.value, league))}
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                >
                  <option value="">Select Home Team...</option>
                  {getTeamsForSport(league).map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Away Team</label>
                <select
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(normalizeTeamName(e.target.value, league))}
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                >
                  <option value="">Select Away Team...</option>
                  {getTeamsForSport(league).map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>
                  {useVegas ? "Vegas Spread" : "Spread"}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={spread}
                  onChange={(e) => setSpread(e.target.value)}
                  placeholder={useVegas ? "Vegas line: -3.5" : "-3.5"}
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>
                  {useVegas ? "Vegas Total (O/U)" : "Total"}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  placeholder={useVegas ? "Vegas total: 42.5" : "42.5"}
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Bankroll</label>
                <input
                  type="number"
                  value={bankroll}
                  onChange={(e) => setBankroll(e.target.value)}
                  placeholder="1000"
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Game Date (Optional)</label>
                <input
                  type="date"
                  value={gameDate}
                  onChange={(e) => setGameDate(e.target.value)}
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
            </div>

            {/* Actual Results Section (for validation) */}
            <div style={{ marginTop: "20px", padding: "20px", background: "#1a1a1a", borderRadius: "8px", border: "1px solid #333" }}>
              <h3 style={{ marginBottom: "15px", color: "#00ffaa" }}>Actual Results (For Validation)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Home Score</label>
                  <input
                    type="number"
                    value={actualHomeScore}
                    onChange={(e) => setActualHomeScore(e.target.value)}
                    placeholder="e.g. 3"
                    style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Away Score</label>
                  <input
                    type="number"
                    value={actualAwayScore}
                    onChange={(e) => setActualAwayScore(e.target.value)}
                    placeholder="e.g. 25"
                    style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    onClick={() => {
                      setActualHomeScore("");
                      setActualAwayScore("");
                    }}
                    style={{
                      padding: "12px 20px",
                      background: "#333",
                      color: "white",
                      border: "1px solid #444",
                      borderRadius: "6px",
                      cursor: "pointer",
                      width: "100%"
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <p style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                Enter actual scores to validate prediction accuracy
              </p>
            </div>
          </div>
        )}

        {/* Weather Form */}
        {predictionType === "weather" && (
          <div style={{ background: "#111", padding: "30px", borderRadius: "12px", marginBottom: "20px" }}>
            <h2 style={{ marginBottom: "20px" }}>Weather Prediction</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Location</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Panama City, FL"
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Date</label>
                <input
                  type="date"
                  value={weatherDate}
                  onChange={(e) => setWeatherDate(e.target.value)}
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Forecast Days</label>
                <input
                  type="number"
                  value={forecastDays}
                  onChange={(e) => setForecastDays(e.target.value)}
                  placeholder="7"
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stocks Form */}
        {predictionType === "stocks" && (
          <div style={{ background: "#111", padding: "30px", borderRadius: "12px", marginBottom: "20px" }}>
            <h2 style={{ marginBottom: "20px" }}>Stock Prediction</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Symbol</label>
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                >
                  <option value="1d">1 Day</option>
                  <option value="1w">1 Week</option>
                  <option value="1m">1 Month</option>
                  <option value="3m">3 Months</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Events Form */}
        {predictionType === "events" && (
          <div style={{ background: "#111", padding: "30px", borderRadius: "12px", marginBottom: "20px" }}>
            <h2 style={{ marginBottom: "20px" }}>Event Prediction</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Event Name</label>
                <input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Super Bowl"
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Event Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Category</label>
                <input
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value)}
                  placeholder="e.g. Sports, Politics, Entertainment"
                  style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Risk Profile */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Risk Profile</label>
          <select
            value={riskProfile}
            onChange={(e) => setRiskProfile(e.target.value as any)}
            style={{ padding: "12px", width: "300px", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
          >
            <option value="safe">Safe</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>

        {/* RUN BUTTON */}
        <button
          onClick={handleRun}
          disabled={loading}
          style={{
            padding: "20px 40px",
            background: loading ? "#333" : "linear-gradient(90deg, #00ffaa, #00b4ff)",
            color: "black",
            fontSize: "20px",
            fontWeight: "bold",
            borderRadius: "12px",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: "40px",
            boxShadow: "0 4px 20px rgba(0, 255, 170, 0.3)",
          }}
        >
          {loading ? "🔮 SEEING THE FUTURE..." : "🔮 SEE THE FUTURE"}
        </button>

        {/* OUTPUT */}
        {output && (
          <div style={{ background: "#111", padding: "40px", borderRadius: "12px", border: "1px solid #333" }}>
            <h2 style={{ fontSize: "32px", marginBottom: "30px", background: "linear-gradient(90deg, #00ffaa, #00b4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {output.isVegas ? "🎰 Vegas Prediction Results" : "Prediction Results"}
            </h2>

            {/* Vegas Prediction Display */}
            {output.isVegas && (
              <>
                {/* Share Buttons */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      const vegasSpreadDisplay = output.vegasSpread !== undefined ? `Vegas Line: ${output.vegasSpread > 0 ? '+' : ''}${output.vegasSpread}` : '';
                      const vegasTotalDisplay = output.vegasTotal !== undefined ? `Vegas Total: ${output.vegasTotal}` : '';
                      const betSlip = `🎰 PROGNO SINGLE GAME PICK\n\n${league}: ${homeTeam} vs ${awayTeam}\nPick: ${output.pick}\nType: ${output.pickType.toUpperCase()}\n${vegasSpreadDisplay ? vegasSpreadDisplay + '\n' : ''}${vegasTotalDisplay ? vegasTotalDisplay + '\n' : ''}Confidence: ${output.confidence}%\nStake: $${output.stake.toFixed(2)}\nVegas Edge: ${output.vegasEdge > 0 ? '+' : ''}${output.vegasEdge.toFixed(2)} points\n\n${output.predictedScore ? `Predicted Score:\n${homeTeam}: ${output.predictedScore.home}\n${awayTeam}: ${output.predictedScore.away}\nTotal: ${output.predictedScore.total}\nPredicted Spread: ${output.predictedScore.spread > 0 ? '+' : ''}${output.predictedScore.spread}\n\n` : ''}${output.rationale}\n\nGenerated by PROGNO Prediction Engine`;

                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(betSlip).then(() => {
                          alert('✅ Bet slip copied to clipboard!\n\nShare this with your betting buddies.');
                        }).catch(() => {
                          prompt('Copy this bet slip:', betSlip);
                        });
                      } else {
                        prompt('Copy this bet slip:', betSlip);
                      }
                    }}
                    style={{
                      padding: "10px 20px",
                      background: "linear-gradient(90deg, #00ffaa, #00b4ff)",
                      color: "black",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "bold"
                    }}
                  >
                    📋 Copy Bet Slip
                  </button>

                  {learningStats && learningStats.totalGames > 0 && (
                    <button
                      onClick={() => {
                        const statsText = `📊 PROGNO PERFORMANCE STATS\n\nTotal Games: ${learningStats.totalGames}\n\nTop Performing Factors:\n${learningStats.factorInsights.slice(0, 5).map((f: any) => `• ${f.name}: ${f.winRate}% (${f.games} games)`).join('\n')}\n\nLeague Performance:\n${learningStats.leaguePerformance.map((l: any) => `• ${l.league}: Spread ${l.spreadAccuracy}% | Total ${l.totalAccuracy}% (${l.games} games)`).join('\n')}\n\nPROGNO learns from every game to improve predictions!`;

                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(statsText).then(() => {
                            alert('✅ Performance stats copied!\n\nShare this to show PROGNO\'s learning progress.');
                          }).catch(() => {
                            prompt('Copy these stats:', statsText);
                          });
                        } else {
                          prompt('Copy these stats:', statsText);
                        }
                      }}
                      style={{
                        padding: "10px 20px",
                        background: "#333",
                        color: "#00ffaa",
                        border: "1px solid #00ffaa",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold"
                      }}
                    >
                      📊 Share Stats ({learningStats.totalGames} games)
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: "30px", background: "#1a1a1a", padding: "25px", borderRadius: "8px", border: "2px solid #00ffaa" }}>
                  <h3 style={{ fontSize: "24px", marginBottom: "15px", color: "#00ffaa" }}>Pick: {output.pick}</h3>
                  <p style={{ color: "#aaa", fontSize: "16px", marginBottom: "10px" }}>Type: {output.pickType.toUpperCase()}</p>
                  {output.vegasSpread !== undefined && (
                    <p style={{ color: "#aaa", fontSize: "16px", marginBottom: "10px" }}>Vegas Line: {output.vegasSpread > 0 ? '+' : ''}{output.vegasSpread}</p>
                  )}
                  {output.vegasTotal !== undefined && (
                    <p style={{ color: "#aaa", fontSize: "16px", marginBottom: "10px" }}>Vegas Total: {output.vegasTotal}</p>
                  )}
                  <p style={{ color: "#aaa", fontSize: "16px", marginBottom: "10px" }}>Stake: ${output.stake}</p>
                  <p style={{ color: "#aaa", fontSize: "16px", marginBottom: "15px" }}>Vegas Edge: {output.vegasEdge > 0 ? '+' : ''}{output.vegasEdge.toFixed(2)} points</p>

                  {/* Predicted Score */}
                  {output.predictedScore && (
                    <div style={{ marginTop: "20px", padding: "15px", background: "#0a0a0a", borderRadius: "6px", border: "1px solid #00b4ff" }}>
                      <h4 style={{ color: "#00b4ff", marginBottom: "10px", fontSize: "18px" }}>📊 Predicted Score</h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px", justifyContent: "center" }}>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Home ({homeTeam})</p>
                          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#00ffaa" }}>{output.predictedScore.home}</p>
                        </div>
                        <p style={{ fontSize: "24px", color: "#666" }}>vs</p>
                        <div style={{ textAlign: "center" }}>
                          <p style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Away ({awayTeam})</p>
                          <p style={{ fontSize: "32px", fontWeight: "bold", color: "#00b4ff" }}>{output.predictedScore.away}</p>
                        </div>
                      </div>
                      <div style={{ marginTop: "15px", display: "flex", justifyContent: "center", gap: "20px", fontSize: "14px", color: "#888" }}>
                        <span>Total: <strong style={{ color: "#fff" }}>{output.predictedScore.total}</strong></span>
                        <span>Spread: <strong style={{ color: "#fff" }}>{output.predictedScore.spread > 0 ? '+' : ''}{output.predictedScore.spread}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Validation Result */}
                  {output.actualResult && (
                    <div style={{ marginTop: "20px", padding: "15px", background: "#1a1a1a", borderRadius: "6px", border: "2px solid #333" }}>
                      {/* Bet Result */}
                      <div style={{ marginBottom: "15px", padding: "10px", background: output.actualResult.won ? "rgba(0, 255, 170, 0.1)" : "rgba(255, 68, 68, 0.1)", borderRadius: "4px", border: `1px solid ${output.actualResult.won ? "#00ffaa" : "#ff4444"}` }}>
                        <h4 style={{ color: output.actualResult.won ? "#00ffaa" : "#ff4444", marginBottom: "8px", fontSize: "16px" }}>
                          {output.actualResult.won ? "✅ BET CORRECT!" : "❌ BET WRONG"}
                        </h4>
                        <p style={{ color: "#aaa", fontSize: "14px" }}>
                          Pick: {output.pick} - {output.actualResult.won ? "Won" : "Lost"}
                        </p>
                        {output.actualResult.payout > 0 && (
                          <p style={{ color: "#00ffaa", fontSize: "14px", marginTop: "5px" }}>
                            Payout: ${output.actualResult.payout.toFixed(2)}
                          </p>
                        )}
                      </div>

                      {/* Score Prediction Accuracy */}
                      {output.predictedScore && output.actualResult.scoreError && (
                        <div style={{ marginBottom: "15px", padding: "10px", background: output.actualResult.scoreAccurate ? "rgba(0, 255, 170, 0.1)" : "rgba(255, 200, 0, 0.1)", borderRadius: "4px", border: `1px solid ${output.actualResult.scoreAccurate ? "#00ffaa" : "#ffc800"}` }}>
                          <h4 style={{ color: output.actualResult.scoreAccurate ? "#00ffaa" : "#ffc800", marginBottom: "8px", fontSize: "16px" }}>
                            {output.actualResult.scoreAccurate ? "✅ SCORE PREDICTION ACCURATE" : "⚠️ SCORE PREDICTION OFF"}
                          </h4>
                          <div style={{ color: "#aaa", fontSize: "14px", lineHeight: "1.6" }}>
                            <p><strong>Predicted:</strong> {homeTeam} {output.predictedScore.home} - {awayTeam} {output.predictedScore.away} (Total: {output.predictedScore.total}, Spread: {output.predictedScore.spread > 0 ? '+' : ''}{output.predictedScore.spread})</p>
                            <p><strong>Actual:</strong> {homeTeam} {output.actualResult.actualScore.home} - {awayTeam} {output.actualResult.actualScore.away} (Total: {output.actualResult.actualScore.home + output.actualResult.actualScore.away}, Spread: {output.actualResult.actualScore.home - output.actualResult.actualScore.away > 0 ? '+' : ''}{output.actualResult.actualScore.home - output.actualResult.actualScore.away})</p>
                            <p style={{ marginTop: "8px", color: "#ffc800" }}>
                              <strong>Error:</strong> Home ±{output.actualResult.scoreError.home} | Away ±{output.actualResult.scoreError.away} | Total ±{output.actualResult.scoreError.total} | Spread ±{output.actualResult.scoreError.spread}
                            </p>
                          </div>
                        </div>
                      )}

                      <p style={{ color: "#aaa", fontSize: "12px", marginTop: "10px" }}>
                        Winner: {output.actualResult.actualScore.home > output.actualResult.actualScore.away ? homeTeam : awayTeam}
                      </p>
                      <p style={{ color: "#00b4ff", fontSize: "12px", marginTop: "10px", fontStyle: "italic" }}>
                        🧠 PROGNO has learned from this result and will refine future predictions!
                      </p>
                    </div>
                  )}
                </div>

                <ConfidenceGauge confidence={output.confidence} />
              </>
            )}

            {/* Standard Prediction Display */}
            {!output.isVegas && (
              <>
                <div style={{ marginBottom: "30px" }}>
                  <h3 style={{ fontSize: "24px", marginBottom: "10px" }}>{output.prediction}</h3>
                  <p style={{ color: "#888", fontSize: "16px" }}>Timeframe: {output.timeframe}</p>
                </div>

                <ConfidenceGauge confidence={output.confidence} />
              </>
            )}

            <div style={{ marginTop: "30px", marginBottom: "30px" }}>
              <h3 style={{ fontSize: "20px", marginBottom: "15px" }}>Confidence: {output.confidence}%</h3>
              {output.historicalAccuracy && (
                <p style={{ color: "#888" }}>Historical Accuracy: {output.historicalAccuracy}%</p>
              )}
              {output.isVegas && output.rationale && (
                <p style={{ color: "#aaa", marginTop: "10px", fontStyle: "italic" }}>{output.rationale}</p>
              )}
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ fontSize: "20px", marginBottom: "15px" }}>
                {output.isVegas ? "Vegas Analysis Factors" : "Prediction Factors"}
              </h3>
              <div style={{ display: "grid", gap: "15px" }}>
                {output.factors.map((factor: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: "#1a1a1a",
                      padding: "20px",
                      borderRadius: "8px",
                      borderLeft: `4px solid ${factor.impact === "positive" ? "#00ffaa" : factor.impact === "negative" ? "#ff4444" : "#888"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontWeight: "bold", fontSize: "16px" }}>{factor.name}</span>
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          background:
                            factor.impact === "positive"
                              ? "rgba(0, 255, 170, 0.2)"
                              : factor.impact === "negative"
                              ? "rgba(255, 68, 68, 0.2)"
                              : "rgba(136, 136, 136, 0.2)",
                          color: factor.impact === "positive" ? "#00ffaa" : factor.impact === "negative" ? "#ff4444" : "#888",
                          fontSize: "12px",
                          textTransform: "uppercase",
                        }}
                      >
                        {factor.impact}
                      </span>
                    </div>
                    <p style={{ color: "#aaa", fontSize: "14px", marginTop: "8px" }}>
                      {factor.description || (factor.value ? `${factor.name}: ${factor.value}` : factor.name)}
                    </p>
                    {factor.value && typeof factor.value !== 'string' && (
                      <p style={{ color: "#888", fontSize: "12px", marginTop: "4px" }}>Value: {factor.value}</p>
                    )}
                    <div style={{ marginTop: "8px" }}>
                      <div style={{ background: "#222", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${factor.weight * 100}%`,
                            height: "100%",
                            background: factor.impact === "positive" ? "#00ffaa" : factor.impact === "negative" ? "#ff4444" : "#888",
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "12px", color: "#666", marginTop: "4px", display: "block" }}>
                        Weight: {(factor.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#1a1a1a", padding: "25px", borderRadius: "8px", border: "2px solid #00ffaa" }}>
              <h3 style={{ fontSize: "20px", marginBottom: "15px", color: "#00ffaa" }}>
                {output.isVegas ? "Analysis" : "Recommendation"}
              </h3>
              <p style={{ fontSize: "16px", lineHeight: "1.6" }}>
                {output.isVegas ? output.rationale : output.recommendation}
              </p>
              {!output.isVegas && (
                <div style={{ marginTop: "15px", padding: "12px", background: "#0a0a0a", borderRadius: "6px" }}>
                  <span style={{ color: "#888", fontSize: "14px" }}>Risk Level: </span>
                  <span
                    style={{
                      color: output.riskLevel === "low" ? "#00ffaa" : output.riskLevel === "medium" ? "#ffaa00" : "#ff4444",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    {output.riskLevel}
                  </span>
                </div>
              )}
            </div>

            {/* Learning Insights */}
            {output.isVegas && learningStats && learningStats.totalGames > 0 && (
              <div style={{ marginTop: "30px", background: "#1a1a1a", padding: "25px", borderRadius: "8px", border: "2px solid #00b4ff" }}>
                <h3 style={{ fontSize: "20px", marginBottom: "15px", color: "#00b4ff" }}>
                  🧠 Learning Insights ({learningStats.totalGames} games analyzed)
                </h3>
                {learningStats.factorInsights.length > 0 && (
                  <div style={{ marginBottom: "20px" }}>
                    <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "10px" }}>Top Performing Factors:</p>
                    {learningStats.factorInsights.slice(0, 3).map((factor: any, idx: number) => (
                      <div key={idx} style={{ padding: "10px", background: "#0a0a0a", borderRadius: "6px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#fff", fontSize: "14px" }}>{factor.name}</span>
                          <span style={{ color: factor.winRate > 60 ? "#00ffaa" : factor.winRate < 40 ? "#ff4444" : "#ffaa00", fontSize: "14px", fontWeight: "bold" }}>
                            {factor.winRate}% ({factor.games} games)
                          </span>
                        </div>
                        <p style={{ color: "#666", fontSize: "12px", marginTop: "5px" }}>{factor.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
                {learningStats.leaguePerformance.length > 0 && (
                  <div>
                    <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "10px" }}>League Performance:</p>
                    {learningStats.leaguePerformance.map((league: any, idx: number) => (
                      <div key={idx} style={{ padding: "10px", background: "#0a0a0a", borderRadius: "6px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#fff", fontSize: "14px", fontWeight: "bold" }}>{league.league}</span>
                          <span style={{ color: "#00b4ff", fontSize: "12px" }}>
                            Spread: {league.spreadAccuracy}% | Total: {league.totalAccuracy}% ({league.games} games)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ color: "#666", fontSize: "12px", marginTop: "15px", fontStyle: "italic" }}>
                  PROGNO automatically adjusts factor weights and confidence based on historical results.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

