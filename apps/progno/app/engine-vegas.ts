// app/engine-vegas.ts
// THE REAL PROBABILITY ENGINE (Fixed & Hardened)

export interface VegasInput {
  homeTeam: string;
  awayTeam: string;
  spread: number;     
  total: number;      
  homeMoneyline: number; 
  awayMoneyline: number; 
}

export interface VegasResult {
  fairWinProbability: number; 
  impliedWinProbability: number;
  vegasEdge: number; 
  pick: string;
  confidence: number;
}

// Helper: Convert American Odds to Probability
function getImpliedProb(odds: number): number {
  if (!odds || isNaN(odds)) return 0; // SAFETY FIX: Prevents crashes on bad data
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

// THE ENGINE LOGIC
export function runVegasPrediction(input: VegasInput): VegasResult {
  // SAFETY CHECK: Return defaults if data is missing instead of crashing
  if (!input || !input.homeMoneyline || !input.awayMoneyline) {
    return {
        fairWinProbability: 50,
        impliedWinProbability: 50,
        vegasEdge: 0,
        pick: "Waiting for Odds...",
        confidence: 0
    };
  }

  const homeImplied = getImpliedProb(input.homeMoneyline);
  const awayImplied = getImpliedProb(input.awayMoneyline);
  const totalImplied = homeImplied + awayImplied;
  
  // Safety: Avoid division by zero
  const homeFair = totalImplied > 0 ? (homeImplied / totalImplied) : 0;

  // Safety: Default spread to 0 if missing
  const safeSpread = input.spread || 0;

  // Calculate spread-adjusted probability
  const spreadAdj = safeSpread * 0.03; // 3% per point of spread
  const adjustedProb = Math.min(1, Math.max(0, homeFair + spreadAdj));

  // Calculate edge
  const vegasEdge = (adjustedProb - homeFair) * 100;

  // Determine pick
  const pick = adjustedProb >= 0.5 ? input.homeTeam : input.awayTeam;

  // Calculate confidence (0-100)
  const confidence = Math.round(Math.abs(adjustedProb - 0.5) * 200);

  return {
    fairWinProbability: Math.round(homeFair * 100),
    impliedWinProbability: Math.round(homeImplied * 100),
    vegasEdge: Math.round(vegasEdge * 10) / 10,
    pick,
    confidence: Math.min(100, confidence),
  };
}