// Main Auspicio App Page - Redirect to Forge
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuspicioHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the Forge interface
    router.push("/forge");
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a1a2e, #16213e)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚀</div>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
          Welcome to Auspicio Forge
        </h1>
        <p style={{ fontSize: "1.2rem", opacity: 0.8, marginBottom: "2rem" }}>
          Redirecting to AI Agent Forge...
        </p>
        <div style={{
          width: "50px",
          height: "50px",
          border: "3px solid #00ff88",
          borderTop: "3px solid transparent",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto"
        }} />
        <p style={{ marginTop: "2rem", fontSize: "0.9rem", opacity: 0.6 }}>
          If not redirected automatically, <a href="/forge" style={{ color: "#00ff88" }}>click here</a>
        </p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
