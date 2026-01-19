"use client";

// Progno Weekly Analysis — rebuilt for live odds + Vegas-style engine
import { useEffect, useState } from "react";
import ConfidenceGauge from "./components/ConfidenceGauge";
import { addPrediction, hasPendingPredictionForGameId } from "./prediction-tracker";
import { analyzeWeeklyGames, Game, WeeklyAnalysis } from "./weekly-analyzer";
import { fetchLiveOddsTheOddsApi, fetchScheduleFromOddsApi, fetchScoresAndUpdatePredictions, mergeOddsIntoGames } from "./weekly-page.helpers";

export default function WeeklyAnalysisPage() {
  const [sport, setSport] = useState<"NFL" | "NBA" | "MLB" | "NHL" | "NCAAF" | "NCAAB">("NFL");
  const [bankroll, setBankroll] = useState("1000");
  const [riskProfile, setRiskProfile] = useState<"safe" | "balanced" | "aggressive">("balanced");
  const [minConfidence, setMinConfidence] = useState(60);
  const [analysis, setAnalysis] = useState<WeeklyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingOdds, setFetchingOdds] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [liveOdds, setLiveOdds] = useState<any[]>([]);
  const [theOddsApiKey, setTheOddsApiKey] = useState(
    process.env.NEXT_PUBLIC_ODDS_API_KEY || ""
  );
  const [savedOddsApiKeys, setSavedOddsApiKeys] = useState<string[]>([]);
  const [showAddKeyInput, setShowAddKeyInput] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState("");

  // Load saved keys from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("saved_odds_api_keys");
      if (stored) {
        try {
          const keys = JSON.parse(stored);
          setSavedOddsApiKeys(keys);
          // If no current key is set, use the first saved key
          if (!theOddsApiKey && keys.length > 0) {
            setTheOddsApiKey(keys[0]);
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }, []);

  // Save keys to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && savedOddsApiKeys.length > 0) {
      localStorage.setItem("saved_odds_api_keys", JSON.stringify(savedOddsApiKeys));
    }
  }, [savedOddsApiKeys]);

  function handleAddKey() {
    if (!newKeyValue.trim()) return;
    const trimmed = newKeyValue.trim();
    // Add to saved keys if not already there
    if (!savedOddsApiKeys.includes(trimmed)) {
      setSavedOddsApiKeys([...savedOddsApiKeys, trimmed]);
    }
    setTheOddsApiKey(trimmed);
    setNewKeyValue("");
    setShowAddKeyInput(false);
  }

  function handleDeleteKey(keyToDelete: string) {
    setSavedOddsApiKeys(savedOddsApiKeys.filter(k => k !== keyToDelete));
    // If the deleted key was the current one, switch to first available or clear
    if (theOddsApiKey === keyToDelete) {
      const remaining = savedOddsApiKeys.filter(k => k !== keyToDelete);
      setTheOddsApiKey(remaining.length > 0 ? remaining[0] : "");
    }
  }
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null);
  const [updatingScores, setUpdatingScores] = useState(false);
  const [scoreUpdateNote, setScoreUpdateNote] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [loadingAllOdds, setLoadingAllOdds] = useState(false);
  const [updatingAllScores, setUpdatingAllScores] = useState(false);
  const [allLeaguesOdds, setAllLeaguesOdds] = useState<Record<string, any[]>>({});
  const [allLeaguesScores, setAllLeaguesScores] = useState<Record<string, any>>({});

  async function loadGames() {
    setError(null);
    if (!theOddsApiKey) {
      setError("Odds API Key required for live schedule.");
      setGames([]);
      return;
    }

    setLoadingSchedule(true);
    try {
      const sched = await fetchScheduleFromOddsApi(theOddsApiKey, sport);
      if (sched.length > 0) {
        setGames(sched);
      } else {
        setError("No upcoming games found for " + sport);
        setGames([]);
      }
    } catch (err: any) {
      console.error("Schedule fetch failed", err);
      setError(err.message || "Live schedule unavailable.");
      setGames([]);
    } finally {
      setLoadingSchedule(false);
    }
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setSaveNote(null);
    try {
      let loadedGames = games;
      if (loadedGames.length === 0) {
        setError("No games loaded to analyze.");
        setLoading(false);
        return;
      }
      if (liveOdds.length > 0) {
        loadedGames = mergeOddsIntoGames(loadedGames, liveOdds);
      }
      const result = await analyzeWeeklyGames(loadedGames);
      setAnalysis(result);

      // Persist picks locally so the "Import Final Scores" button can grade them later.
      // (Avoid duplicates by gameId.)
      try {
        for (const p of result.predictions || []) {
          if (!p?.gameId) continue;
          if (hasPendingPredictionForGameId(p.gameId)) continue;
          addPrediction(p.gameId, p, p.game?.sport || sport);
        }
      } catch (e) {
        // If localStorage is unavailable, don't break the UI.
        console.warn("Prediction persistence skipped", e);
      }
    } catch (err) {
      console.error("Analyze failed", err);
    } finally {
      setLoading(false);
    }
  }

  function saveToLocal(key: string, value: any) {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("Save skipped", e);
      return false;
    }
  }

  function handleSaveOdds() {
    const ok = saveToLocal("progno_weekly_odds", liveOdds);
    setSaveNote(ok ? "Weekly odds saved." : "Unable to save odds (storage unavailable).");
  }

  function handleSavePicks() {
    if (!analysis) {
      setSaveNote("Run Analyze first to generate picks.");
      return;
    }
    const ok = saveToLocal("progno_weekly_picks", analysis.predictions);
    setSaveNote(ok ? "Weekly picks saved." : "Unable to save picks (storage unavailable).");
  }

  async function fetchLiveOdds() {
    if (!theOddsApiKey) return;
    setFetchingOdds(true);
    setError(null);
    try {
      const odds = await fetchLiveOddsTheOddsApi(theOddsApiKey, sport);
      setLiveOdds(odds);
      setLastLiveUpdate(new Date());
    } catch (err) {
      console.error("Failed to fetch live odds", err);
      setError("Live odds unavailable right now.");
    } finally {
      setFetchingOdds(false);
    }
  }

  async function fetchAllLeaguesOdds() {
    if (!theOddsApiKey) {
      setError("Please enter The Odds API key first.");
      return;
    }
    setLoadingAllOdds(true);
    setError(null);
    const allLeagues: string[] = ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB"];
    const results: Record<string, any[]> = {};
    let successCount = 0;
    let errorCount = 0;

    try {
      // Fetch odds for all leagues in parallel
      const promises = allLeagues.map(async (league) => {
        try {
          const odds = await fetchLiveOddsTheOddsApi(theOddsApiKey, league as any);
          results[league] = odds;
          successCount++;
          return { league, success: true, count: odds.length };
        } catch (err) {
          console.error(`Failed to fetch odds for ${league}:`, err);
          results[league] = [];
          errorCount++;
          return { league, success: false, count: 0 };
        }
      });

      await Promise.all(promises);
      setAllLeaguesOdds(results);

      // Save all odds to localStorage
      const ok = saveToLocal("progno_all_leagues_odds", results);
      setSaveNote(
        ok
          ? `Loaded odds for ${successCount} league(s). ${errorCount > 0 ? `${errorCount} failed.` : ''}`
          : "Odds loaded but couldn't save to storage."
      );
      setLastLiveUpdate(new Date());
    } catch (err) {
      console.error("Failed to fetch all leagues odds", err);
      setError("Some leagues failed to load. Check console for details.");
    } finally {
      setLoadingAllOdds(false);
    }
  }

  async function updateResultsFromScores() {
    if (!theOddsApiKey) {
      setError("Please enter The Odds API key first.");
      return;
    }

    setUpdatingScores(true);
    setScoreUpdateNote(null);
    setSaveNote(null);
    try {
      const result = await fetchScoresAndUpdatePredictions(theOddsApiKey, sport, games);
      saveToLocal("progno_weekly_finals", result);
      setScoreUpdateNote(
        `Imported finals: ${result.completedGames} completed game(s). Updated ${result.predictionsUpdated} prediction(s).`
      );
    } catch (err) {
      console.error("Failed to update results", err);
      setError("Score update failed; retry later.");
    } finally {
      setUpdatingScores(false);
    }
  }

  async function updateAllLeaguesScores() {
    if (!theOddsApiKey) {
      setError("Please enter The Odds API key first.");
      return;
    }

    setUpdatingAllScores(true);
    setScoreUpdateNote(null);
    setSaveNote(null);
    const allLeagues: string[] = ["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB"];
    const results: Record<string, any> = {};
    let totalCompleted = 0;
    let totalUpdated = 0;
    let successCount = 0;
    let errorCount = 0;

    try {
      // Update scores for all leagues in parallel
      const promises = allLeagues.map(async (league) => {
        try {
          // Load games for this league first
          let leagueGames: Game[] = [];
          try {
            leagueGames = await fetchScheduleFromOddsApi(theOddsApiKey, league as any);
          } catch {
            // If schedule fetch fails, continue with empty games array
          }

          const result = await fetchScoresAndUpdatePredictions(theOddsApiKey, league as any, leagueGames);
          results[league] = result;
          totalCompleted += result.completedGames;
          totalUpdated += result.predictionsUpdated;
          successCount++;
          return { league, success: true, ...result };
        } catch (err) {
          console.error(`Failed to update scores for ${league}:`, err);
          results[league] = { completedGames: 0, predictionsUpdated: 0, cursorLearnGames: 0 };
          errorCount++;
          return { league, success: false };
        }
      });

      await Promise.all(promises);
      setAllLeaguesScores(results);

      // Save all results to localStorage
      const ok = saveToLocal("progno_all_leagues_finals", results);
      setScoreUpdateNote(
        `All Leagues: ${totalCompleted} completed games, ${totalUpdated} predictions updated. ${successCount} league(s) processed. ${errorCount > 0 ? `${errorCount} failed.` : ''}`
      );
      if (ok) {
        setSaveNote("All leagues scores saved.");
      }
    } catch (err) {
      console.error("Failed to update all leagues scores", err);
      setError("Some leagues failed to update. Check console for details.");
    } finally {
      setUpdatingAllScores(false);
    }
  }

  function handleSaveFinalScoresOnly() {
    if (!scoreUpdateNote) {
      setSaveNote("Import finals first, then save.");
      return;
    }
    const ok = saveToLocal("progno_weekly_finals_note", { note: scoreUpdateNote, ts: Date.now() });
    setSaveNote(ok ? "Final scores saved." : "Unable to save finals (storage unavailable).");
  }

  useEffect(() => {
    loadGames();
  }, [sport]);

  // Close add key input when clicking outside
  useEffect(() => {
    if (!showAddKeyInput) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.odds-key-dropdown')) {
        setShowAddKeyInput(false);
        setNewKeyValue("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddKeyInput]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold">Weekly Vegas Analysis</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="border rounded px-2 py-1"
            value={sport}
            onChange={e => setSport(e.target.value as any)}
          >
            {["NFL","NBA","MLB","NHL","NCAAF","NCAAB"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            className="border rounded px-2 py-1 w-28"
            value={bankroll}
            onChange={e => setBankroll(e.target.value)}
            placeholder="Bankroll"
          />
          <select
            className="border rounded px-2 py-1"
            value={riskProfile}
            onChange={e => setRiskProfile(e.target.value as any)}
          >
            <option value="safe">Safe</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
          <input
            className="border rounded px-2 py-1 w-14"
            type="number"
            value={minConfidence}
            onChange={e => setMinConfidence(Number(e.target.value))}
            placeholder="Conf%"
          />
          <div className="relative flex items-center gap-1 odds-key-dropdown">
            <select
              className="border rounded px-2 py-1 w-48 bg-white text-black"
              value={theOddsApiKey}
              onChange={e => {
                const selected = e.target.value;
                setTheOddsApiKey(selected);
                // If user selects "Add new..." option, show input
                if (selected === "__add_new__") {
                  setShowAddKeyInput(true);
                  setTheOddsApiKey("");
                }
              }}
            >
              <option value="">Select API key...</option>
              {savedOddsApiKeys.map((key, idx) => (
                <option key={idx} value={key}>
                  {key.length > 12 ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : key}
                </option>
              ))}
              <option value="__add_new__">+ Add new key...</option>
            </select>
            {showAddKeyInput && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded p-2 shadow-lg z-50 w-64 odds-key-dropdown">
                <input
                  type="text"
                  className="border rounded px-2 py-1 w-full mb-2 text-black"
                  value={newKeyValue}
                  onChange={e => setNewKeyValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      handleAddKey();
                    } else if (e.key === "Escape") {
                      setShowAddKeyInput(false);
                      setNewKeyValue("");
                    }
                  }}
                  placeholder="Enter new API key"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    className="bg-green-600 text-white px-2 py-1 rounded text-sm"
                    onClick={handleAddKey}
                  >
                    Save
                  </button>
                  <button
                    className="bg-gray-400 text-white px-2 py-1 rounded text-sm"
                    onClick={() => {
                      setShowAddKeyInput(false);
                      setNewKeyValue("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {theOddsApiKey && savedOddsApiKeys.includes(theOddsApiKey) && (
              <button
                className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                onClick={() => handleDeleteKey(theOddsApiKey)}
                title="Delete this API key"
              >
                ×
              </button>
            )}
            {theOddsApiKey && !savedOddsApiKeys.includes(theOddsApiKey) && theOddsApiKey.length > 0 && (
              <button
                className="bg-green-600 text-white px-2 py-1 rounded text-sm"
                onClick={() => {
                  if (!savedOddsApiKeys.includes(theOddsApiKey)) {
                    setSavedOddsApiKeys([...savedOddsApiKeys, theOddsApiKey]);
                  }
                }}
                title="Save current key"
              >
                💾
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-500 space-y-1">
        {loadingSchedule && <div>Loading schedule...</div>}
        {lastLiveUpdate && <div>Live odds updated {lastLiveUpdate.toLocaleString()}</div>}
        {scoreUpdateNote && <div className="text-emerald-700">{scoreUpdateNote}</div>}
        {saveNote && <div className="text-emerald-700">{saveNote}</div>}
        {error && <div className="text-red-600">{error}</div>}
      </div>

      {/* Primary workflow buttons, in logical order, under the line info */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          className="bg-slate-600 text-white px-3 py-1 rounded"
          onClick={fetchLiveOdds}
          disabled={fetchingOdds}
        >
          {fetchingOdds ? "Fetching odds..." : "Fetch Live Odds"}
        </button>
        <button
          className="bg-purple-600 text-white px-3 py-1 rounded font-semibold"
          onClick={fetchAllLeaguesOdds}
          disabled={loadingAllOdds}
        >
          {loadingAllOdds ? "Loading All Leagues..." : "🚀 Load All Leagues Odds"}
        </button>
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
        <button
          className="bg-slate-700 text-white px-3 py-1 rounded"
          onClick={handleSaveOdds}
          disabled={fetchingOdds}
        >
          Save Weekly Odds
        </button>
        <button
          className="bg-emerald-700 text-white px-3 py-1 rounded"
          onClick={handleSavePicks}
          disabled={!analysis}
        >
          Save Weekly Picks
        </button>
        <button
          className="bg-emerald-600 text-white px-3 py-1 rounded"
          onClick={updateResultsFromScores}
          disabled={updatingScores}
        >
          {updatingScores ? "Importing Scores..." : "Import Final Scores (Current League)"}
        </button>
        <button
          className="bg-orange-600 text-white px-3 py-1 rounded font-semibold"
          onClick={updateAllLeaguesScores}
          disabled={updatingAllScores}
        >
          {updatingAllScores ? "Updating All Leagues..." : "📊 Update All Leagues Scores (Tue)"}
        </button>
        <button
          className="bg-emerald-800 text-white px-3 py-1 rounded"
          onClick={handleSaveFinalScoresOnly}
          disabled={updatingScores}
        >
          Save Final Scores
        </button>
      </div>

      {analysis && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="font-semibold">Best Bets: {analysis.summary.bestBets.length}</div>
            <div className="font-semibold">Upset Alerts: {analysis.summary.upsetAlerts.length}</div>
            <div className="font-semibold">Avg Score: {analysis.summary.trendAnalysis.averageScore.toFixed(1)}</div>
          </div>
          {analysis.summary.bestBets.length === 0 && (
            <div className="text-sm text-gray-600">No best bets above the current thresholds; showing all picks below.</div>
          )}

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              {(analysis.summary.bestBets.length > 0 ? analysis.summary.bestBets : analysis.predictions)
                .filter(bet => bet.confidence * 100 >= minConfidence)
                .map(bet => (
                  <div key={bet.gameId} className="border rounded p-3 space-y-1">
                    <div className="font-semibold">{bet.game.homeTeam} vs {bet.game.awayTeam}</div>
                    <div>Pick: {bet.pick} (conf {(bet.confidence * 100).toFixed(1)}%) edge {(bet.edge * 100).toFixed(1)}%</div>
                    <div>Predicted: {bet.predictedScore.home} - {bet.predictedScore.away}</div>
                    <div className="text-sm text-gray-500">{bet.keyFactors.join("; ")}</div>
                    <div className="flex items-center gap-2">
                      <span>Risk: {bet.riskLevel}</span>
                      <ConfidenceGauge confidence={bet.confidence} />
                    </div>
                  </div>
                ))}
            </div>

            <div className="space-y-2">
              <div className="text-lg font-semibold">Top Picks (all)</div>
              <div className="grid md:grid-cols-2 gap-3">
                {[...analysis.predictions]
                  .sort((a, b) => b.confidence - a.confidence)
                  .slice(0, 12)
                  .map(bet => (
                    <div key={`all-${bet.gameId}`} className="border rounded p-3 space-y-1">
                      <div className="font-semibold">{bet.game.homeTeam} vs {bet.game.awayTeam}</div>
                      <div>Pick: {bet.pick} (conf {(bet.confidence * 100).toFixed(1)}%) edge {(bet.edge * 100).toFixed(1)}%</div>
                      <div>Predicted: {bet.predictedScore.home} - {bet.predictedScore.away}</div>
                      <div className="text-sm text-gray-500">{bet.keyFactors.join("; ")}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

