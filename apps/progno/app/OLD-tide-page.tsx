"use client";

import { useState, useEffect } from "react";
import { getTidePredictionsForLocation, getCoordinatesFromLocation } from "./free-data-fetcher";

interface TidePrediction {
  time: Date;
  height: number;
  type: 'High' | 'Low';
}

interface TideData {
  stationId: string;
  stationName: string;
  predictions: TidePrediction[];
  source: string;
  fetchedAt: Date;
}

export default function TidePage() {
  const [location, setLocation] = useState("Panama City, FL");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [tideData, setTideData] = useState<TideData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage
    const savedLocation = localStorage.getItem('tide_location');
    if (savedLocation) setLocation(savedLocation);
  }, []);

  async function fetchTides() {
    setLoading(true);
    setError(null);

    try {
      // Get coordinates from location name
      const coords = await getCoordinatesFromLocation(location);
      if (!coords) {
        throw new Error('Could not find location. Please try a more specific location (e.g., "Panama City, FL").');
      }

      // Fetch tide predictions
      const data = await getTidePredictionsForLocation(coords, days);
      const predictions: TidePrediction[] = (data || []).map(t => {
        const tt = String((t as any).type || '').toLowerCase();
        const type: TidePrediction["type"] = tt === 'low' ? 'Low' : 'High';
        return { ...t, type };
      });

      setTideData({
        stationId: "mock-station",
        stationName: location,
        predictions,
        source: "NOAA (mock/free-data-fetcher)",
        fetchedAt: new Date()
      });
      localStorage.setItem('tide_location', location);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tide data');
      console.error('Tide fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Group predictions by date
  const groupedByDate = tideData ? (() => {
    const groups: Record<string, TidePrediction[]> = {};
    tideData.predictions.forEach(tide => {
      const dateKey = tide.time.toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(tide);
    });
    return groups;
  })() : {};

  return (
    <div style={{ padding: "40px", color: "white", fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ marginBottom: "30px" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "5px", background: "linear-gradient(90deg, #00ffaa, #00b4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            🌊 TIDE PREDICTIONS
          </h1>
          <p style={{ color: "#888", fontSize: "14px" }}>
            Get accurate tide predictions from NOAA CO-OPS (FREE - Official Government Data)
          </p>
        </div>

        {/* Controls */}
        <div style={{ background: "#111", padding: "30px", borderRadius: "12px", marginBottom: "30px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Panama City, FL"
                style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
                onKeyPress={(e) => e.key === 'Enter' && fetchTides()}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#aaa" }}>Days</label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(Math.max(1, Math.min(14, parseInt(e.target.value) || 7)))}
                min="1"
                max="14"
                style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={fetchTides}
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
                {loading ? "🌊 Loading..." : "🔮 Get Tide Predictions"}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#330000", padding: "20px", borderRadius: "12px", marginBottom: "30px", border: "1px solid #ff4444" }}>
            <p style={{ color: "#ff6666", margin: 0 }}>❌ {error}</p>
          </div>
        )}

        {/* Results */}
        {tideData && (
          <div style={{ background: "#111", padding: "40px", borderRadius: "12px", border: "1px solid #333" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
              <div>
                <h2 style={{ fontSize: "28px", margin: "0 0 5px 0", color: "#00ffaa" }}>
                  🌊 Tides for {location}
                </h2>
                <p style={{ color: "#888", margin: 0, fontSize: "14px" }}>
                  Station: {tideData.stationName} ({tideData.stationId})
                </p>
              </div>
              <span style={{
                padding: "6px 12px",
                background: "rgba(0, 255, 170, 0.2)",
                borderRadius: "12px",
                fontSize: "11px",
                color: "#00ffaa"
              }}>
                📡 {tideData.source}
              </span>
            </div>

            {/* Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "30px" }}>
              <div style={{ background: "#222", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Total Predictions</div>
                <div style={{ color: "#00ffaa", fontSize: "24px", fontWeight: "bold" }}>{tideData.predictions.length}</div>
              </div>
              <div style={{ background: "#222", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>High Tides</div>
                <div style={{ color: "#00b4ff", fontSize: "24px", fontWeight: "bold" }}>
                  {tideData.predictions.filter(t => t.type === 'High').length}
                </div>
              </div>
              <div style={{ background: "#222", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Low Tides</div>
                <div style={{ color: "#888", fontSize: "24px", fontWeight: "bold" }}>
                  {tideData.predictions.filter(t => t.type === 'Low').length}
                </div>
              </div>
              <div style={{ background: "#222", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Max Height</div>
                <div style={{ color: "#00ffaa", fontSize: "24px", fontWeight: "bold" }}>
                  {Math.max(...tideData.predictions.map(t => t.height)).toFixed(1)}ft
                </div>
              </div>
            </div>

            {/* Daily Tide Charts */}
            {Object.entries(groupedByDate).map(([date, tides]) => (
              <div key={date} style={{ marginBottom: "30px", background: "#1a1a1a", padding: "20px", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "18px", marginBottom: "15px", color: "#00b4ff" }}>
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
                  {tides.map((tide, i) => (
                    <div
                      key={i}
                      style={{
                        background: tide.type === 'High' ? "rgba(0, 180, 255, 0.1)" : "rgba(136, 136, 136, 0.1)",
                        border: `1px solid ${tide.type === 'High' ? '#00b4ff' : '#666'}`,
                        padding: "15px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "14px", color: "#aaa", marginBottom: "5px" }}>
                          {tide.type === 'High' ? '⬆️' : '⬇️'} {tide.type} Tide
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: tide.type === 'High' ? "#00b4ff" : "#888" }}>
                          {tide.height.toFixed(2)}ft
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fff" }}>
                          {tide.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: "12px", color: "#888" }}>
                          {tide.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* All Tides Timeline */}
            <div style={{ marginTop: "30px", background: "#1a1a1a", padding: "20px", borderRadius: "8px" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "15px", color: "#00b4ff" }}>📅 Complete Timeline</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {tideData.predictions.map((tide, i) => (
                  <div
                    key={i}
                    style={{
                      background: tide.type === 'High' ? "rgba(0, 180, 255, 0.15)" : "rgba(136, 136, 136, 0.15)",
                      border: `1px solid ${tide.type === 'High' ? '#00b4ff' : '#666'}`,
                      padding: "10px 15px",
                      borderRadius: "6px",
                      fontSize: "13px"
                    }}
                  >
                    <span style={{ color: "#aaa" }}>
                      {tide.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {tide.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {' - '}
                    <span style={{ color: tide.type === 'High' ? "#00b4ff" : "#888", fontWeight: "bold" }}>
                      {tide.type} {tide.height.toFixed(1)}ft
                    </span>
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

