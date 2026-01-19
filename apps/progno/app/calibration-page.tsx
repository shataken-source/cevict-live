"use client";

import { useState, useEffect } from "react";

interface CalibrationData {
  calibration: {
    spreadBias: number;
    totalBias: number;
    confidenceBias: number;
  };
  metrics: {
    totalPredictions: number;
    correctPredictions: number;
    winRate: number;
    averageConfidence: number;
    roi: number;
  };
  lastUpdated: string | null;
}

export default function CalibrationPage() {
  const [data, setData] = useState<CalibrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCalibration() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/calibration");
      if (!res.ok) throw new Error("Failed to load calibration");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load calibration data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalibration();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px", color: "white", fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>⚙️ Model Calibration</h1>
          <p>Loading calibration data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", color: "white", fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>⚙️ Model Calibration</h1>
          <div style={{ background: "#330000", padding: "20px", borderRadius: "8px", border: "1px solid #ff4444" }}>
            <p style={{ color: "#ff6666" }}>❌ {error}</p>
          </div>
          <button
            onClick={loadCalibration}
            style={{
              marginTop: "20px",
              padding: "12px 24px",
              background: "#00ffaa",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "40px", color: "white", fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>⚙️ Model Calibration</h1>
          <p>No calibration data available yet. Calibration will be generated after the Monday cron job runs.</p>
        </div>
      </div>
    );
  }

  const { calibration, metrics, lastUpdated } = data;

  function formatBias(value: number, label: string): string {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(3)}`;
  }

  function getBiasColor(value: number): string {
    if (Math.abs(value) < 0.01) return "#888";
    if (value > 0) return "#00ffaa";
    return "#ff6666";
  }

  return (
    <div style={{ padding: "40px", color: "white", fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "30px" }}>
          <div>
            <h1 style={{ fontSize: "32px", marginBottom: "5px", background: "linear-gradient(90deg, #00ffaa, #00b4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ⚙️ Model Calibration
            </h1>
            <p style={{ color: "#888", fontSize: "14px" }}>
              Automatic model adjustments based on prediction performance
            </p>
          </div>
          <button
            onClick={loadCalibration}
            style={{
              padding: "10px 20px",
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Calibration Values */}
        <div style={{ background: "#111", padding: "30px", borderRadius: "12px", marginBottom: "30px", border: "1px solid #333" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#00ffaa" }}>📊 Current Calibration Values</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            <div style={{ background: "#1a1a1a", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
              <div style={{ color: "#888", fontSize: "12px", marginBottom: "8px" }}>Spread Bias</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: getBiasColor(calibration.spreadBias), marginBottom: "5px" }}>
                {formatBias(calibration.spreadBias, "spread")}
              </div>
              <div style={{ color: "#666", fontSize: "12px" }}>
                Adjusts predicted point spread
              </div>
            </div>
            <div style={{ background: "#1a1a1a", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
              <div style={{ color: "#888", fontSize: "12px", marginBottom: "8px" }}>Total Bias</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: getBiasColor(calibration.totalBias), marginBottom: "5px" }}>
                {formatBias(calibration.totalBias, "total")}
              </div>
              <div style={{ color: "#666", fontSize: "12px" }}>
                Adjusts predicted total score
              </div>
            </div>
            <div style={{ background: "#1a1a1a", padding: "20px", borderRadius: "8px", border: "1px solid #333" }}>
              <div style={{ color: "#888", fontSize: "12px", marginBottom: "8px" }}>Confidence Bias</div>
              <div style={{ fontSize: "28px", fontWeight: "bold", color: getBiasColor(calibration.confidenceBias), marginBottom: "5px" }}>
                {formatBias(calibration.confidenceBias, "confidence")}
              </div>
              <div style={{ color: "#666", fontSize: "12px" }}>
                Adjusts prediction confidence
              </div>
            </div>
          </div>
          {lastUpdated && (
            <div style={{ marginTop: "20px", padding: "15px", background: "#1a1a1a", borderRadius: "8px" }}>
              <div style={{ color: "#888", fontSize: "12px" }}>
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div style={{ background: "#111", padding: "30px", borderRadius: "12px", marginBottom: "30px", border: "1px solid #333" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#00b4ff" }}>📈 Performance Metrics</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px" }}>
            <div style={{ background: "#1a1a1a", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Total Predictions</div>
              <div style={{ color: "#00ffaa", fontSize: "24px", fontWeight: "bold" }}>{metrics.totalPredictions}</div>
            </div>
            <div style={{ background: "#1a1a1a", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Win Rate</div>
              <div style={{ color: "#00b4ff", fontSize: "24px", fontWeight: "bold" }}>
                {(metrics.winRate * 100).toFixed(1)}%
              </div>
            </div>
            <div style={{ background: "#1a1a1a", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Avg Confidence</div>
              <div style={{ color: "#00b4ff", fontSize: "24px", fontWeight: "bold" }}>
                {(metrics.averageConfidence * 100).toFixed(1)}%
              </div>
            </div>
            <div style={{ background: "#1a1a1a", padding: "15px", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>ROI</div>
              <div style={{ color: metrics.roi >= 0 ? "#00ffaa" : "#ff6666", fontSize: "24px", fontWeight: "bold" }}>
                {metrics.roi >= 0 ? "+" : ""}{metrics.roi.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div style={{ background: "#111", padding: "30px", borderRadius: "12px", border: "1px solid #333" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "15px", color: "#00ffaa" }}>💡 How Calibration Works</h2>
          <div style={{ color: "#aaa", fontSize: "14px", lineHeight: "1.6" }}>
            <p style={{ marginBottom: "10px" }}>
              Calibration is automatically updated every <strong>Monday</strong> after games finish:
            </p>
            <ul style={{ marginLeft: "20px", marginBottom: "10px" }}>
              <li><strong>Spread Bias:</strong> Adjusted based on how close predicted spreads match actual game margins</li>
              <li><strong>Total Bias:</strong> Adjusted based on how close predicted totals match actual combined scores</li>
              <li><strong>Confidence Bias:</strong> Adjusted based on whether the model is overconfident or underconfident</li>
            </ul>
            <p style={{ marginTop: "10px", color: "#888" }}>
              These biases are then applied to all future predictions to improve accuracy over time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

