"use client";

import { useState } from "react";
import { predictTravelTimeline, TravelTimelinePrediction } from "./travel-timeline-predictor";

export default function TravelTimelinePage() {
  const [location, setLocation] = useState("Panama City, FL");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  });
  const [prioritizeWeather, setPrioritizeWeather] = useState(false);
  const [prioritizeFishing, setPrioritizeFishing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<TravelTimelinePrediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyzeTimeline() {
    setLoading(true);
    setError(null);

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        throw new Error('Start date must be before end date');
      }

      const daysRequested = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

      if (daysRequested > 30) {
        // Auto-adjust to 30 days and show a message
        const adjustedEnd = new Date(start);
        adjustedEnd.setDate(start.getDate() + 29); // 30 days total (0-29 = 30 days)
        setEndDate(adjustedEnd.toISOString().split('T')[0]);

        // Show info message instead of error
        alert(`⚠️ Maximum 30 days can be analyzed at once.\n\nYour range was ${Math.round(daysRequested)} days.\n\nAnalyzing first 30 days: ${startDate} to ${adjustedEnd.toISOString().split('T')[0]}\n\nTo analyze the full range, split it into multiple requests.`);

        // Continue with adjusted date
        const adjustedResult = await predictTravelTimeline({
          origin: "Home",
          destination: location,
          departureDate: start,
          returnDate: adjustedEnd,
          transportMode: "car",
          preferences: [
            prioritizeWeather ? "weather" : "",
            prioritizeFishing ? "fishing" : ""
          ].filter(Boolean)
        });

        setPrediction(adjustedResult);
        localStorage.setItem('travel_location', location);
        return;
      }

      const result = await predictTravelTimeline({
        origin: "Home",
        destination: location,
        departureDate: start,
        returnDate: end,
        transportMode: "car",
        preferences: [
          prioritizeWeather ? "weather" : "",
          prioritizeFishing ? "fishing" : ""
        ].filter(Boolean)
      });

      setPrediction(result);
      localStorage.setItem('travel_location', location);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze travel timeline');
      console.error('Travel timeline error:', err);
    } finally {
      setLoading(false);
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return "#00ffaa";
    if (score >= 65) return "#00b4ff";
    if (score >= 50) return "#ffaa00";
    return "#ff6666";
  }

  function getRecommendationColor(rec: string): string {
    if (rec === 'excellent') return "#00ffaa";
    if (rec === 'good') return "#00b4ff";
    if (rec === 'fair') return "#ffaa00";
    return "#ff6666";
  }

  return (
    <div style={{ padding: "40px", color: "white", fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "30px" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "5px", background: "linear-gradient(90deg, #00ffaa, #00b4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🗓️ TRAVEL TIMELINE PREDICTOR
          </h1>
          <p style={{ color: "#888", fontSize: "14px" }}>
            Find the best dates to visit - combines weather, tides, and fishing conditions
          </p>
        </div>

        {/* Controls */}
        <div style={{ background: "#111", padding: "30px", borderRadius: "12px", marginBottom: "30px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Panama City, FL"
                style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                onKeyPress={(e) => e.key === 'Enter' && analyzeTimeline()}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={analyzeTimeline}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 24px",
                  background: loading ? "#333" : "linear-gradient(90deg, #00ffaa, #00b4ff)",
                  color: "black",
                  fontSize: "16px",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "🔮 Analyzing..." : "🔮 Find Best Dates"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={prioritizeWeather}
                onChange={(e) => {
                  setPrioritizeWeather(e.target.checked);
                  if (e.target.checked) setPrioritizeFishing(false);
                }}
                style={{ width: "18px", height: "18px" }}
              />
              <span style={{ color: "#aaa", fontSize: "14px" }}>🌤️ Prioritize Weather</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={prioritizeFishing}
                onChange={(e) => {
                  setPrioritizeFishing(e.target.checked);
                  if (e.target.checked) setPrioritizeWeather(false);
                }}
                style={{ width: "18px", height: "18px" }}
              />
              <span style={{ color: "#aaa", fontSize: "14px" }}>🎣 Prioritize Fishing</span>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#330000", padding: "20px", borderRadius: "12px", marginBottom: "30px", border: "1px solid #ff4444" }}>
            <p style={{ color: "#ff6666", margin: 0 }}>❌ {error}</p>
          </div>
        )}

        {/* Results */}
        {prediction && (
          <div>
            {/* Summary */}
            <div style={{ background: "#111", padding: "30px", borderRadius: "12px", marginBottom: "30px", border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h2 style={{ fontSize: "24px", margin: "0 0 5px 0", color: "#00ffaa" }}>
                    📊 Analysis for {prediction.location}
                  </h2>
                  <p style={{ color: "#888", margin: 0, fontSize: "14px" }}>
                    {prediction.analysisPeriod.startDate} to {prediction.analysisPeriod.endDate} ({prediction.analysisPeriod.daysAnalyzed} days)
                  </p>
                </div>
                <span style={{
                  padding: "6px 12px",
                  background: "rgba(0, 255, 170, 0.2)",
                  borderRadius: "12px",
                  fontSize: "11px",
                  color: "#00ffaa"
                }}>
                  📡 {prediction.dataSource}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "15px", marginBottom: "20px" }}>
                <div style={{ background: "#222", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Avg Score</div>
                  <div style={{ color: "#00ffaa", fontSize: "24px", fontWeight: "bold" }}>{prediction.summary.avgScore}%</div>
                </div>
                <div style={{ background: "#222", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Excellent</div>
                  <div style={{ color: "#00ffaa", fontSize: "24px", fontWeight: "bold" }}>{prediction.summary.excellentDays}</div>
                </div>
                <div style={{ background: "#222", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Good</div>
                  <div style={{ color: "#00b4ff", fontSize: "24px", fontWeight: "bold" }}>{prediction.summary.goodDays}</div>
                </div>
                <div style={{ background: "#222", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Fair</div>
                  <div style={{ color: "#ffaa00", fontSize: "24px", fontWeight: "bold" }}>{prediction.summary.fairDays}</div>
                </div>
                <div style={{ background: "#222", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Poor</div>
                  <div style={{ color: "#ff6666", fontSize: "24px", fontWeight: "bold" }}>{prediction.summary.poorDays}</div>
                </div>
              </div>

              {prediction.summary.bestWeek && (
                <div style={{ background: "rgba(0, 255, 170, 0.1)", border: "1px solid #00ffaa", padding: "15px", borderRadius: "8px" }}>
                  <div style={{ color: "#00ffaa", fontWeight: "bold", marginBottom: "5px" }}>📅 Best Week</div>
                  <div style={{ color: "#fff", fontSize: "18px" }}>{prediction.summary.bestWeek}</div>
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div style={{ background: "#111", padding: "20px", borderRadius: "12px", marginBottom: "30px", border: "1px solid #333" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "15px", color: "#00b4ff" }}>💡 Recommendations</h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#aaa" }}>
                {prediction.recommendations.map((rec, i) => (
                  <li key={i} style={{ marginBottom: "8px" }}>{rec}</li>
                ))}
              </ul>
            </div>

            {/* Best Dates */}
            <div style={{ background: "#111", padding: "30px", borderRadius: "12px", border: "1px solid #333" }}>
              <h3 style={{ fontSize: "22px", marginBottom: "20px", color: "#00ffaa" }}>⭐ Best Dates (Sorted by Score)</h3>
              <div style={{ display: "grid", gap: "15px" }}>
                {prediction.bestDates.map((date, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#1a1a1a",
                      border: `2px solid ${getRecommendationColor(date.recommendation)}`,
                      padding: "20px",
                      borderRadius: "8px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                      <div>
                        <h4 style={{ fontSize: "18px", margin: "0 0 5px 0", color: "#fff" }}>
                          {new Date(date.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h4>
                        <div style={{
                          display: "inline-block",
                          padding: "4px 12px",
                          background: getRecommendationColor(date.recommendation) + "20",
                          color: getRecommendationColor(date.recommendation),
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          textTransform: "uppercase"
                        }}>
                          {date.recommendation}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "32px", fontWeight: "bold", color: getScoreColor(date.overallScore) }}>
                          {date.overallScore}%
                        </div>
                        <div style={{ color: "#888", fontSize: "12px" }}>Overall Score</div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "15px" }}>
                      <div style={{ background: "#222", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
                        <div style={{ color: "#888", fontSize: "11px" }}>Weather</div>
                        <div style={{ color: getScoreColor(date.weatherScore), fontSize: "18px", fontWeight: "bold" }}>
                          {date.weatherScore}%
                        </div>
                      </div>
                      <div style={{ background: "#222", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
                        <div style={{ color: "#888", fontSize: "11px" }}>Tides</div>
                        <div style={{ color: getScoreColor(date.tideScore), fontSize: "18px", fontWeight: "bold" }}>
                          {date.tideScore}%
                        </div>
                      </div>
                      <div style={{ background: "#222", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
                        <div style={{ color: "#888", fontSize: "11px" }}>Fishing</div>
                        <div style={{ color: getScoreColor(date.fishActivityScore), fontSize: "18px", fontWeight: "bold" }}>
                          {date.fishActivityScore}%
                        </div>
                      </div>
                    </div>

                    <div style={{ background: "#222", padding: "12px", borderRadius: "6px" }}>
                      <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Why this date:</div>
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "#aaa", fontSize: "13px" }}>
                        {date.reasons.map((reason, j) => (
                          <li key={j} style={{ marginBottom: "3px" }}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

