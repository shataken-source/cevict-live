"use client";

import Link from "next/link";

export default function VegasAnalysisInfo() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e, #16213e)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "2rem"
    }}>
      <div style={{
        textAlign: "center",
        maxWidth: "600px",
        background: "rgba(255, 255, 255, 0.1)",
        padding: "3rem",
        borderRadius: "16px",
        backdropFilter: "blur(10px)"
      }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📊</div>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem", fontWeight: "bold" }}>
          Vegas Analysis
        </h1>
        <p style={{ fontSize: "1.2rem", opacity: 0.9, marginBottom: "2rem", lineHeight: "1.6" }}>
          This feature is part of the <strong>Progno</strong> app, not Auspicio.
        </p>
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          padding: "1.5rem",
          borderRadius: "12px",
          marginBottom: "2rem",
          textAlign: "left"
        }}>
          <p style={{ marginBottom: "1rem", fontSize: "1rem" }}>
            <strong>To access Vegas Analysis:</strong>
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>
              📍 Navigate to the <strong>Progno</strong> app
            </li>
            <li style={{ marginBottom: "0.75rem", fontSize: "0.95rem" }}>
              🔗 Or visit: <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: "4px" }}>http://localhost:3008/vegas-analysis</code>
            </li>
            <li style={{ fontSize: "0.95rem" }}>
              🚀 Make sure the Progno dev server is running
            </li>
          </ul>
        </div>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/forge"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "1rem",
              display: "inline-block"
            }}
          >
            ← Back to Forge
          </Link>
          <a
            href="http://localhost:3008/vegas-analysis"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "1rem",
              display: "inline-block"
            }}
          >
            Open Progno →
          </a>
        </div>
      </div>
    </div>
  );
}

