"use client";

import { useState, useCallback, useEffect } from "react";
import ConfidenceGauge from "./components/ConfidenceGauge";
import { Game, predictGame, GamePrediction } from "./weekly-analyzer";
import { getTeamsForSport, normalizeTeamName } from "./team-names";

const defaultGame: Game = {
  id: "single",
  homeTeam: "Home",
  awayTeam: "Away",
  sport: "NFL",
  date: new Date(),
  venue: "TBD",
  odds: { home: -110, away: -110, spread: -1.5, total: 44 },
  homeFieldAdvantage: 0.05
};

// Default prediction while loading
const defaultPrediction: GamePrediction = {
  game: defaultGame,
  gameId: "single",
  predictedWinner: "Home",
  confidence: 0.5,
  predictedScore: { home: 0, away: 0 },
  keyFactors: ["Loading..."],
  riskLevel: 'medium',
  stake: 0,
  edge: 0,
  pick: "Home",
  rationale: "Loading...",
};

interface SimulationResults {
  winRate: number;
  confidence: number;
  iterations: number;
  homeWins: number;
  awayWins: number;
  avgConfidence: number;
  stdDev: number;
}

export default function SingleGamePage() {
  const [game, setGame] = useState<Game>(defaultGame);
  const [prediction, setPrediction] = useState<GamePrediction>(defaultPrediction);
  const [homeOddsInput, setHomeOddsInput] = useState<string>("-110");
  const [awayOddsInput, setAwayOddsInput] = useState<string>("-110");
  const [simulationIterations, setSimulationIterations] = useState(100);
  const [simulationResults, setSimulationResults] = useState<SimulationResults | null>(null);
  const [runningSimulation, setRunningSimulation] = useState(false);

  // Initialize prediction on mount
  useEffect(() => {
    predictGame(defaultGame).then(setPrediction);
  }, []);

  function update<K extends keyof Game>(key: K, value: Game[K]) {
    const next = { ...game, [key]: value };
    setGame(next);
    predictGame(next).then(setPrediction);
  }

  function parseAmericanOdds(value: string): number | null {
    // Handle American odds format: -175, +154, -130, 0175 -> -175, etc.
    const cleaned = value.trim();
    if (!cleaned) return null;

    // Allow user to type "-" or "+" without parsing yet
    if (cleaned === "-" || cleaned === "+") return null;

    // Handle explicit negative odds: -130, -175, etc.
    if (cleaned.startsWith("-")) {
      const num = parseInt(cleaned);
      return isNaN(num) ? null : num;
    }

    // Handle explicit positive odds: +150, +200, etc.
    if (cleaned.startsWith("+")) {
      const num = parseInt(cleaned);
      return isNaN(num) ? null : num;
    }

    // If it starts with 0 and has 3+ digits, assume it's missing the minus sign
    if (/^0\d{3,}$/.test(cleaned)) {
      return -parseInt(cleaned);
    }

    // If it's all digits and > 100, assume it's missing the minus sign (favorites)
    if (/^\d{3,}$/.test(cleaned) && parseInt(cleaned) > 100) {
      return -parseInt(cleaned);
    }

    // Otherwise parse normally (handles both positive and negative)
    const num = parseInt(cleaned);
    return isNaN(num) ? null : num;
  }

  function updateOdds(field: "home" | "away" | "spread" | "total", value: number | string) {
    let numValue: number;
    if (typeof value === 'string') {
      // For moneyline, use special parsing
      if (field === "home" || field === "away") {
        const parsed = parseAmericanOdds(value);
        // If parsing returns null (incomplete input), keep current value
        if (parsed === null) {
          // Update input state but don't change the odds value
          if (field === "home") setHomeOddsInput(value);
          if (field === "away") setAwayOddsInput(value);
          return;
        }
        numValue = parsed;
        // Update input state with the parsed value
        if (field === "home") setHomeOddsInput(value);
        if (field === "away") setAwayOddsInput(value);
      } else {
        numValue = parseFloat(value) || 0;
      }
    } else {
      numValue = value;
    }

    const next = { ...game, odds: { ...game.odds, [field]: numValue } };
    setGame(next);
    predictGame(next).then(setPrediction);
    // Clear simulation results when game changes
    setSimulationResults(null);
  }

  // Monte Carlo simulation function
  const runSimulation = useCallback(async () => {
    if (runningSimulation) return;

    setRunningSimulation(true);
    setSimulationResults(null);

    // Run simulations in batches to avoid blocking the UI
    const batchSize = 50;
    const batches = Math.ceil(simulationIterations / batchSize);
    let homeWins = 0;
    let awayWins = 0;
    const confidences: number[] = [];

    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, simulationIterations);

      for (let i = batchStart; i < batchEnd; i++) {
        // Add small random variations to simulate game variability
        const variation = {
          odds: {
            home: game.odds.home + (Math.random() - 0.5) * 20, // ±10 point variation
            away: game.odds.away + (Math.random() - 0.5) * 20,
            spread: game.odds.spread ? game.odds.spread + (Math.random() - 0.5) * 2 : undefined,
            total: game.odds.total ? game.odds.total + (Math.random() - 0.5) * 4 : undefined,
          },
          weather: game.weather ? {
            ...game.weather,
            temperature: game.weather.temperature + (Math.random() - 0.5) * 10,
            windSpeed: Math.max(0, game.weather.windSpeed + (Math.random() - 0.5) * 5),
          } : undefined,
          injuries: game.injuries ? {
            homeImpact: game.injuries.homeImpact ? game.injuries.homeImpact + (Math.random() - 0.5) * 0.02 : undefined,
            awayImpact: game.injuries.awayImpact ? game.injuries.awayImpact + (Math.random() - 0.5) * 0.02 : undefined,
          } : undefined,
          turnoversPerGame: game.turnoversPerGame ? {
            home: game.turnoversPerGame.home ? game.turnoversPerGame.home + (Math.random() - 0.5) * 0.3 : undefined,
            away: game.turnoversPerGame.away ? game.turnoversPerGame.away + (Math.random() - 0.5) * 0.3 : undefined,
          } : undefined,
          homeFieldAdvantage: game.homeFieldAdvantage ?
            game.homeFieldAdvantage + (Math.random() - 0.5) * 0.02 : undefined,
        };

        const simulatedGame: Game = {
          ...game,
          ...variation,
        };

        const simPrediction = await predictGame(simulatedGame);
        confidences.push(simPrediction.confidence);

        if (simPrediction.predictedWinner === game.homeTeam) {
          homeWins++;
        } else {
          awayWins++;
        }
      }

      // Update UI periodically
      if (batch % 2 === 0 || batch === batches - 1) {
        const currentIterations = batchEnd;
        const winRate = homeWins / currentIterations;
        const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
        const variance = confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidences.length;
        const stdDev = Math.sqrt(variance);

        setSimulationResults({
          winRate,
          confidence: avgConfidence,
          iterations: currentIterations,
          homeWins,
          awayWins,
          avgConfidence,
          stdDev,
        });
      }

      // Yield to UI every batch
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    setRunningSimulation(false);
  }, [game, simulationIterations, runningSimulation]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Single Game Edge</h1>
      <p className="text-gray-400 text-sm">Enter Monday Night Football teams and odds to get predictions</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3 border rounded p-3">
          <h3 className="font-semibold text-lg mb-2">Game Details</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Sport</label>
              <select
                className="border rounded px-2 py-1 w-full bg-white text-black"
                value={game.sport}
                onChange={e => update("sport", e.target.value)}
              >
                <option value="NFL">NFL</option>
                <option value="MLB">MLB</option>
                <option value="NBA">NBA</option>
                <option value="NHL">NHL</option>
                <option value="NCAAF">NCAAF (College Football)</option>
                <option value="NCAAB">NCAAB (College Basketball)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Home Team</label>
              <select
                className="border rounded px-2 py-1 w-full bg-white text-black"
                value={game.homeTeam}
                onChange={e => {
                  const normalized = normalizeTeamName(e.target.value, game.sport);
                  update("homeTeam", normalized);
                }}
              >
                <option value="">Select Home Team...</option>
                {getTeamsForSport(game.sport).map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Away Team</label>
              <select
                className="border rounded px-2 py-1 w-full bg-white text-black"
                value={game.awayTeam}
                onChange={e => {
                  const normalized = normalizeTeamName(e.target.value, game.sport);
                  update("awayTeam", normalized);
                }}
              >
                <option value="">Select Away Team...</option>
                {getTeamsForSport(game.sport).map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-4 mb-2">Money Line Odds</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Home ML</label>
              <input
                className="border rounded px-2 py-1 w-full"
                type="text"
                value={homeOddsInput}
                onChange={e => {
                  setHomeOddsInput(e.target.value);
                  updateOdds("home", e.target.value);
                }}
                onBlur={() => {
                  // On blur, ensure the input matches the stored value
                  const current = game.odds.home > 0 ? `+${game.odds.home}` : game.odds.home.toString();
                  setHomeOddsInput(current);
                }}
                placeholder="-175 or +150"
              />
              <p className="text-xs text-gray-500 mt-1">Enter American odds: -175 (favorite) or +150 (underdog)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Away ML</label>
              <input
                className="border rounded px-2 py-1 w-full"
                type="text"
                value={awayOddsInput}
                onChange={e => {
                  setAwayOddsInput(e.target.value);
                  updateOdds("away", e.target.value);
                }}
                onBlur={() => {
                  // On blur, ensure the input matches the stored value
                  const current = game.odds.away > 0 ? `+${game.odds.away}` : game.odds.away.toString();
                  setAwayOddsInput(current);
                }}
                placeholder="-154 or +130"
              />
              <p className="text-xs text-gray-500 mt-1">Enter American odds: -154 (favorite) or +130 (underdog)</p>
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-4 mb-2">Spread & Total</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Spread (Home -)</label>
              <input className="border rounded px-2 py-1 w-full" type="number" value={game.odds.spread ?? 0} onChange={e => updateOdds("spread", Number(e.target.value))} placeholder="-3" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total (O/U)</label>
              <input className="border rounded px-2 py-1 w-full" type="number" value={game.odds.total ?? 44} onChange={e => updateOdds("total", Number(e.target.value))} placeholder="42.5" />
            </div>
          </div>

          <h3 className="font-semibold text-lg mt-4 mb-2">Simulation</h3>
          <div className="space-y-2 mb-4">
            <label className="block text-sm font-medium">
              Simulations: {simulationIterations} runs
            </label>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={simulationIterations}
              onChange={(e) => setSimulationIterations(parseInt(e.target.value))}
              className="w-full"
              disabled={runningSimulation}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>20</span>
              <span>250</span>
              <span>500</span>
            </div>
            <button
              onClick={runSimulation}
              disabled={runningSimulation || game.homeTeam === "Home" || game.awayTeam === "Away"}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium"
            >
              {runningSimulation ? `Running... ${simulationResults?.iterations || 0}/${simulationIterations}` : 'Run Simulation'}
            </button>
            {simulationResults && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                <div>Win Rate: {(simulationResults.winRate * 100).toFixed(1)}% ({simulationResults.homeWins} home, {simulationResults.awayWins} away)</div>
                <div>Avg Confidence: {(simulationResults.avgConfidence * 100).toFixed(1)}%</div>
                <div>Std Dev: {(simulationResults.stdDev * 100).toFixed(1)}%</div>
              </div>
            )}
          </div>

          <h3 className="font-semibold text-lg mt-4 mb-2">Advanced (Optional)</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Home Field Edge</label>
              <input className="border rounded px-2 py-1 w-full" type="number" value={game.homeFieldAdvantage ?? 0.05} step="0.01" onChange={e => update("homeFieldAdvantage", Number(e.target.value))} placeholder="0.05" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wind (mph)</label>
              <input
                className="border rounded px-2 py-1 w-full"
                type="number"
                value={game.weather?.windSpeed ?? 0}
                onChange={e =>
                  update("weather", {
                    ...(game.weather || { temperature: 70, conditions: "Clear", windSpeed: 0 }),
                    windSpeed: Number(e.target.value)
                  })
                }
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Home Injuries</label>
              <input className="border rounded px-2 py-1 w-full" type="number" value={game.injuries?.homeImpact ?? 0} step="0.01" onChange={e => update("injuries", { ...(game.injuries || {}), homeImpact: Number(e.target.value) })} placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Away Injuries</label>
              <input className="border rounded px-2 py-1 w-full" type="number" value={game.injuries?.awayImpact ?? 0} step="0.01" onChange={e => update("injuries", { ...(game.injuries || {}), awayImpact: Number(e.target.value) })} placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Home TO/Game</label>
              <input className="border rounded px-2 py-1 w-full" type="number" value={game.turnoversPerGame?.home ?? 1.2} step="0.01" onChange={e => update("turnoversPerGame", { ...(game.turnoversPerGame || {}), home: Number(e.target.value) })} placeholder="1.2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Away TO/Game</label>
              <input className="border rounded px-2 py-1 w-full" type="number" value={game.turnoversPerGame?.away ?? 1.2} step="0.01" onChange={e => update("turnoversPerGame", { ...(game.turnoversPerGame || {}), away: Number(e.target.value) })} placeholder="1.2" />
            </div>
          </div>
        </div>

        <div className="space-y-3 border rounded p-3">
          <div className="text-xl font-semibold">Pick: {prediction.pick}</div>
          <div>Confidence: {(prediction.confidence * 100).toFixed(1)}% | Edge {(prediction.edge * 100).toFixed(1)}%</div>
          {simulationResults && (
            <div className="p-2 bg-blue-50 rounded border border-blue-200">
              <div className="font-semibold text-blue-900 mb-1">Simulation Results ({simulationResults.iterations} runs):</div>
              <div className="text-sm text-blue-800">
                <div>Simulated Win Rate: {(simulationResults.winRate * 100).toFixed(1)}%</div>
                <div>Average Confidence: {(simulationResults.avgConfidence * 100).toFixed(1)}%</div>
                <div>Confidence Range: {((simulationResults.avgConfidence - simulationResults.stdDev) * 100).toFixed(1)}% - {((simulationResults.avgConfidence + simulationResults.stdDev) * 100).toFixed(1)}%</div>
              </div>
            </div>
          )}
          <div>Predicted score: {prediction.predictedScore.home} - {prediction.predictedScore.away}</div>
          <div>Risk: {prediction.riskLevel} | Stake suggestion: ${prediction.stake}</div>
          <ConfidenceGauge confidence={simulationResults ? simulationResults.avgConfidence : prediction.confidence} />
          <div className="text-sm text-gray-600 space-y-1">
            {prediction.keyFactors.map((f, i) => <div key={i}>{f}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

