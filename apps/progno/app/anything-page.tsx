"use client";

import { useCallback, useEffect, useState } from "react";
import { getAnythingLearningStats, learnFromAnythingResult } from "./anything-learner";
import { analyzeQuestionType, analyzeSearchResults, AnythingInput, predictAnything, searchWeb, validateQuestion } from "./anything-predictor";
import ConfidenceGauge from "./components/ConfidenceGauge";
import { handleError } from "./utils/error-handling";
import { sanitizeInput } from "./utils/validation";

export default function AnythingPredictionPage() {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [riskProfile, setRiskProfile] = useState<"safe" | "balanced" | "aggressive">("balanced");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<import('./anything-predictor').AnythingPrediction | null>(null);
  const [questionType, setQuestionType] = useState<string>("");
  const [learningStats, setLearningStats] = useState<ReturnType<typeof import('./anything-learner').getAnythingLearningStats> | null>(null);
  const [outcomeMarked, setOutcomeMarked] = useState(false);
  const [webSearchResults, setWebSearchResults] = useState<{ recommendation: string; factors: any[]; learningData?: any } | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load learning stats on mount
  useEffect(() => {
    const stats = getAnythingLearningStats();
    setLearningStats(stats);
  }, []);

  const handlePredict = useCallback(async () => {
    // Validate input
    const validation = validateQuestion(question);
    if (!validation.valid) {
      setError(validation.error || 'Invalid question');
      return;
    }

    // Use sanitized question
    const questionText = sanitizeInput(question.trim());
    const hasMultipleQuestions = (questionText.match(/["']/g) || []).length >= 2 ||
                                 questionText.split('?').filter(q => q.trim().length > 10).length > 1;

    if (hasMultipleQuestions) {
      const proceed = confirm("I detected multiple questions. I'll analyze the first one. Would you like to continue, or would you prefer to enter one question at a time?");
      if (!proceed) {
        return;
      }
    }

    setLoading(true);
    setOutcomeMarked(false);
    setWebSearchResults(null);
    setError(null);

    try {
      const input: AnythingInput = {
        question: questionText,
        context: context.trim() || undefined,
        timeframe: timeframe.trim() || undefined,
        riskProfile
      };

      // AI-powered prediction (now async)
      const result = await predictAnything(input);
      const detectedType = analyzeQuestionType(questionText); // Use the processed question
      setQuestionType(detectedType.type);

      setPrediction(result);

      // If it's a recommendation question, perform web search
      if (detectedType.type === 'advice' && (questionText.toLowerCase().includes('best') ||
          questionText.toLowerCase().includes('lawfirm') || questionText.toLowerCase().includes('law firm') ||
          questionText.toLowerCase().includes('lawyer') || questionText.toLowerCase().includes('attorney'))) {
        setSearching(true);
        try {
          const searchQuery = questionText.replace(/["']/g, '').trim();
          const results = await searchWeb(searchQuery);
          if (results.length > 0) {
            // Get Gemini key for learning system
            const geminiKey = typeof window !== 'undefined' ? localStorage.getItem('google_gemini_api_key') || undefined : undefined;
            const analysis = await analyzeSearchResults(results);
            const webResults = {
              recommendation: analysis.summary,
              factors: analysis.keyFactors,
              learningData: {
                sentiment: analysis.sentiment,
                confidence: analysis.confidence
              }
            };
            setWebSearchResults(webResults);
            // Update prediction with search results
            setPrediction({
              ...result,
              prediction: webResults.recommendation
            });
          } else {
            setError('No search results found. Try rephrasing your question.');
          }
        } catch (searchError) {
          const errorInfo = handleError(searchError);
          setError(errorInfo.message + ' Prediction still available above.');
        } finally {
          setSearching(false);
        }
      }

      // Refresh learning stats
      const stats = getAnythingLearningStats();
      setLearningStats(stats);
    } catch (err) {
      const errorInfo = handleError(err);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  }, [question, context, timeframe, riskProfile]);

  function handleMarkOutcome(wasCorrect: boolean) {
    if (!prediction || !questionType || outcomeMarked) return;

    learnFromAnythingResult(
      question,
      prediction.prediction,
      prediction.confidence,
      wasCorrect ? 'correct' : 'incorrect'
    );
    setOutcomeMarked(true);

    // Refresh learning stats
    const stats = getAnythingLearningStats();
    setLearningStats(stats);

    alert(wasCorrect
      ? `✅ Marked as correct! PROGNO has learned from this result.`
      : `❌ Marked as incorrect. PROGNO will adjust future predictions.`
    );
  }

  function handleReset() {
    setQuestion("");
    setContext("");
    setTimeframe("");
    setRiskProfile("balanced");
    setPrediction(null);
  }

  return (
    <div style={{ padding: "40px", color: "white", fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "48px", marginBottom: "10px", background: "linear-gradient(90deg, #00ffaa, #00b4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          🔮 PREDICT ANYTHING
        </h1>
        <p style={{ color: "#888", marginBottom: "40px", fontSize: "18px" }}>
          Ask PROGNO any question and get AI-powered odds and analysis
        </p>

        {/* Input Form */}
        <div style={{ background: "#111", padding: "30px", borderRadius: "12px", marginBottom: "20px" }}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#aaa", fontSize: "16px", fontWeight: "bold" }}>
              What do you want to predict? *
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g., What are the odds that I get my domain theblues.com back from rob monster?"
              rows={3}
              style={{
                padding: "15px",
                width: "100%",
                background: "#222",
                color: "white",
                border: "1px solid #333",
                borderRadius: "6px",
                fontSize: "16px",
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", color: "#aaa", fontSize: "14px" }}>
              Additional Context (Optional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Any additional information that might help the prediction..."
              rows={2}
              style={{
                padding: "12px",
                width: "100%",
                background: "#222",
                color: "white",
                border: "1px solid #333",
                borderRadius: "6px",
                fontSize: "14px",
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#aaa", fontSize: "14px" }}>
                Timeframe (Optional)
              </label>
              <input
                type="text"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="e.g., Within 6 months, By end of year"
                style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "8px", color: "#aaa", fontSize: "14px" }}>
                Risk Profile
              </label>
              <select
                value={riskProfile}
                onChange={(e) => setRiskProfile(e.target.value as any)}
                style={{ padding: "12px", width: "100%", background: "#222", color: "white", border: "1px solid #333", borderRadius: "6px" }}
              >
                <option value="safe">Safe</option>
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </div>
          </div>

          {/* Google API Keys (optional, for enhanced search) */}
          <details style={{ marginBottom: "20px", background: "#1a1a1a", padding: "15px", borderRadius: "8px", border: "1px solid #333" }}>
            <summary style={{ color: "#00b4ff", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
              🔑 Google API Keys (Optional - for enhanced AI search)
            </summary>
            <div style={{ marginTop: "10px", marginBottom: "10px" }}>
              <a
                href="/progno/GOOGLE_API_KEYS_GUIDE.md"
                target="_blank"
                style={{
                  color: "#00ffaa",
                  textDecoration: "underline",
                  fontSize: "12px",
                  display: "inline-block",
                  marginBottom: "10px"
                }}
              >
                📖 Click here for step-by-step guide to get your API keys
              </a>
            </div>
            <div style={{ marginTop: "15px", display: "grid", gap: "10px" }}>
              <div>
                <label style={{ color: "#aaa", fontSize: "12px", display: "block", marginBottom: "5px" }}>
                  Google Custom Search API Key
                </label>
                <input
                  type="text"
                  placeholder="Get free key at console.cloud.google.com"
                  defaultValue={typeof window !== 'undefined' ? localStorage.getItem('google_search_api_key') || '' : ''}
                  onChange={(e) => {
                    if (typeof window !== 'undefined') {
                      if (e.target.value.trim()) {
                        localStorage.setItem('google_search_api_key', e.target.value.trim());
                      } else {
                        localStorage.removeItem('google_search_api_key');
                      }
                    }
                  }}
                  style={{ width: "100%", padding: "8px", background: "#0a0a0a", border: "1px solid #333", borderRadius: "4px", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ color: "#aaa", fontSize: "12px", display: "block", marginBottom: "5px" }}>
                  Google Custom Search Engine ID
                </label>
                <input
                  type="text"
                  placeholder="Create at programmablesearch.google.com"
                  defaultValue={typeof window !== 'undefined' ? localStorage.getItem('google_search_engine_id') || '' : ''}
                  onChange={(e) => {
                    if (typeof window !== 'undefined') {
                      if (e.target.value.trim()) {
                        localStorage.setItem('google_search_engine_id', e.target.value.trim());
                      } else {
                        localStorage.removeItem('google_search_engine_id');
                      }
                    }
                  }}
                  style={{ width: "100%", padding: "8px", background: "#0a0a0a", border: "1px solid #333", borderRadius: "4px", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ color: "#aaa", fontSize: "12px", display: "block", marginBottom: "5px" }}>
                  Google Gemini API Key (for AI-enhanced analysis)
                </label>
                <input
                  type="text"
                  placeholder="Get free key at makersuite.google.com/app/apikey"
                  defaultValue={typeof window !== 'undefined' ? localStorage.getItem('google_gemini_api_key') || '' : ''}
                  onChange={(e) => {
                    if (typeof window !== 'undefined') {
                      if (e.target.value.trim()) {
                        localStorage.setItem('google_gemini_api_key', e.target.value.trim());
                      } else {
                        localStorage.removeItem('google_gemini_api_key');
                      }
                    }
                  }}
                  style={{ width: "100%", padding: "8px", background: "#0a0a0a", border: "1px solid #333", borderRadius: "4px", color: "#fff" }}
                />
              </div>
              <p style={{ color: "#888", fontSize: "11px", marginTop: "10px", lineHeight: "1.4" }}>
                💡 <strong>Free tier available:</strong> Google Custom Search API provides 100 free searches/day.
                Gemini API has a generous free tier. Without keys, PROGNO uses DuckDuckGo (free, unlimited).
              </p>
            </div>
          </details>

          <div style={{ display: "flex", gap: "15px" }}>
            <button
              onClick={handlePredict}
              disabled={loading || !question.trim()}
              style={{
                flex: 1,
                padding: "20px 40px",
                background: loading || !question.trim() ? "#333" : "linear-gradient(90deg, #00ffaa, #00b4ff)",
                color: "black",
                fontSize: "20px",
                fontWeight: "bold",
                borderRadius: "12px",
                border: "none",
                cursor: loading || !question.trim() ? "not-allowed" : "pointer",
                boxShadow: loading || !question.trim() ? "none" : "0 4px 20px rgba(0, 255, 170, 0.3)",
              }}
            >
              {loading ? "🔮 ANALYZING..." : "🔮 PREDICT"}
            </button>
            <button
              onClick={handleReset}
              disabled={loading}
              style={{
                padding: "20px 30px",
                background: loading ? "#333" : "#444",
                color: "white",
                fontSize: "18px",
                fontWeight: "bold",
                borderRadius: "12px",
                border: "1px solid #666",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Results */}
        {prediction && (
          <div style={{ background: "#111", padding: "40px", borderRadius: "12px", border: "1px solid #333" }}>
            <h2 style={{ fontSize: "32px", marginBottom: "30px", background: "linear-gradient(90deg, #00ffaa, #00b4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {prediction ? 'Prediction Results' : 'Analysis Results'}
            </h2>

            {/* Web Search Loading Indicator */}
            {searching && (
              <div style={{
                background: "#1a1a1a",
                padding: "20px",
                borderRadius: "8px",
                border: "2px solid #00b4ff",
                marginBottom: "20px",
                textAlign: "center"
              }}>
                <p style={{ color: "#00b4ff", fontSize: "18px", marginBottom: "10px" }}>
                  🔍 Searching the web for recommendations...
                </p>
                <p style={{ color: "#888", fontSize: "14px" }}>
                  Analyzing search results to provide data-driven recommendations
                </p>
              </div>
            )}

            {/* Main Prediction or Advice */}
            <div style={{ marginBottom: "30px", background: "#1a1a1a", padding: "25px", borderRadius: "8px", border: "2px solid #00ffaa" }}>
              <h3 style={{ fontSize: "20px", marginBottom: "15px", color: "#00ffaa" }}>Question</h3>
              <p style={{ color: "#aaa", fontSize: "16px", marginBottom: "20px", fontStyle: "italic" }}>"{question}"</p>

              {prediction && (
                <>
                  <h3 style={{ fontSize: "24px", marginBottom: "15px", color: "#00ffaa" }}>Prediction</h3>
                  <p style={{ fontSize: "20px", marginBottom: "15px", lineHeight: "1.6" }}>{prediction.prediction}</p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginTop: "20px" }}>
                    <div style={{ padding: "15px", background: "#0a0a0a", borderRadius: "6px" }}>
                      <p style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Confidence</p>
                      <p style={{ fontSize: "28px", fontWeight: "bold", color: "#00ffaa" }}>{Math.round(prediction.confidence * 100)}%</p>
                    </div>
                    <div style={{ padding: "15px", background: "#0a0a0a", borderRadius: "6px" }}>
                      <p style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Risk Level</p>
                      <p style={{ fontSize: "28px", fontWeight: "bold", color: "#ff6b6b" }}>{prediction.riskLevel}</p>
                    </div>
                  </div>

                  <div style={{ marginTop: "20px", padding: "15px", background: "#0a0a0a", borderRadius: "6px" }}>
                    <p style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Reasoning</p>
                    <p style={{ color: "#aaa", fontSize: "14px", lineHeight: "1.6" }}>{prediction.reasoning}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Confidence Gauge */}
        <ConfidenceGauge confidence={prediction?.confidence || 0} />

        {/* Web Search Results */}
        {webSearchResults && (
          <div style={{ marginBottom: "30px", background: "#1a1a1a", padding: "25px", borderRadius: "8px", border: "1px solid #00b4ff" }}>
            <h3 style={{ fontSize: "20px", marginBottom: "15px", color: "#00b4ff" }}>🔍 Web Search Analysis</h3>
            <div style={{ marginBottom: "15px" }}>
              <p style={{ color: "#aaa", fontSize: "14px", lineHeight: "1.6" }}>{webSearchResults.recommendation}</p>
            </div>
            {webSearchResults.factors && webSearchResults.factors.length > 0 && (
              <div>
                <h4 style={{ fontSize: "16px", marginBottom: "10px", color: "#888" }}>Key Factors:</h4>
                <ul style={{ color: "#aaa", fontSize: "14px", paddingLeft: "20px" }}>
                  {webSearchResults.factors.map((factor, idx) => (
                    <li key={idx} style={{ marginBottom: "5px" }}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Learning Stats */}
        {learningStats && (
          <div style={{ marginBottom: "30px", background: "#1a1a1a", padding: "25px", borderRadius: "8px", border: "1px solid #333" }}>
            <h3 style={{ fontSize: "20px", marginBottom: "15px", color: "#00ffaa" }}>📊 Learning Statistics</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#00ffaa" }}>{learningStats.totalPredictions}</p>
                <p style={{ color: "#888", fontSize: "12px" }}>Total Predictions</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#00b4ff" }}>{learningStats.successfulPredictions}</p>
                <p style={{ color: "#888", fontSize: "12px" }}>Correct</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#ff6b6b" }}>{learningStats.totalPredictions - learningStats.successfulPredictions}</p>
                <p style={{ color: "#888", fontSize: "12px" }}>Incorrect</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#ffd93d" }}>{Math.round(learningStats.accuracyRate * 100)}%</p>
                <p style={{ color: "#888", fontSize: "12px" }}>Accuracy</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {prediction && (
          <div style={{ display: "flex", gap: "15px", justifyContent: "center", marginTop: "30px" }}>
            <button
              onClick={() => handleMarkOutcome(true)}
              disabled={outcomeMarked}
              style={{
                padding: "12px 24px",
                background: outcomeMarked ? "#333" : "rgba(0, 255, 170, 0.2)",
                color: outcomeMarked ? "#666" : "#00ffaa",
                border: "1px solid #00ffaa",
                borderRadius: "8px",
                cursor: outcomeMarked ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "bold"
              }}
            >
              ✅ Mark as Correct
            </button>
            <button
              onClick={() => handleMarkOutcome(false)}
              disabled={outcomeMarked}
              style={{
                padding: "12px 24px",
                background: outcomeMarked ? "#333" : "rgba(255, 68, 68, 0.2)",
                color: outcomeMarked ? "#666" : "#ff4444",
                border: "1px solid #ff4444",
                borderRadius: "8px",
                cursor: outcomeMarked ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "bold"
              }}
            >
              ❌ Mark as Incorrect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
