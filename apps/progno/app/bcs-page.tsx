"use client";

import { useEffect, useState } from "react";

export default function BCSPage() {
  const [odds, setOdds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mock data loading
    setOdds([
      { team: "Georgia", odds: "+150", probability: 0.40 },
      { team: "Michigan", odds: "+200", probability: 0.33 },
      { team: "Washington", odds: "+300", probability: 0.20 },
      { team: "Texas", odds: "+500", probability: 0.07 }
    ]);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>BCS Championship Odds</h1>
      <div style={{ marginTop: 20 }}>
        {odds.map((team, index) => (
          <div key={index} style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 10,
            borderRadius: 5
          }}>
            <h3>{team.team}</h3>
            <p>Odds: {team.odds}</p>
            <p>Probability: {(team.probability * 100).toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
