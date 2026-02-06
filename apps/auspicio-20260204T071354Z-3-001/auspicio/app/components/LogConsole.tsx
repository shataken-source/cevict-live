import { useState, useEffect } from "react";
import WorkflowResultsModal from "./WorkflowResultsModal";

export default function LogConsole({ bubbleId }: { bubbleId: string | null }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(bubbleId);
  const [isPolling, setIsPolling] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>("");
  const [showResultsModal, setShowResultsModal] = useState(false);

  // Update active bubble when prop changes - this is the source of truth
  useEffect(() => {
    setActiveBubbleId(bubbleId);
  }, [bubbleId]);

  useEffect(() => {
    if (!activeBubbleId) {
      setLogs([{
        t: "--:--:--",
        tag: "WAIT",
        msg: "No active bubble. Create a bubble first."
      }]);
      return;
    }

    const fetchLogs = () => {
      if (!activeBubbleId) {
        setLogs([{
          t: "--:--:--",
          tag: "WAIT",
          msg: "No active bubble. Create a bubble first.",
          id: 'wait'
        }]);
        return;
      }
      
      setIsPolling(true);
      const fetchStart = Date.now();
      
      // Add timestamp to prevent caching
      fetch(`/api/bubble/message?bubbleId=${activeBubbleId}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          const fetchTime = Date.now() - fetchStart;
          setLastFetchTime(new Date().toLocaleTimeString());
          // Only log if there's a significant delay or error (reduce console noise)
          if (fetchTime > 100) {
            console.log(`[LogConsole] Slow fetch: ${fetchTime}ms`);
          }
          
          if (data.success && data.messages) {
            // IMMUTABLE: Format messages and create new array reference
            // Using functional update ensures React always detects the change
            const formattedLogs = data.messages.map((msg: any, index: number) => {
              let tag = "INFO";
              let text = "";
              
              if (msg.message_type === 'request') {
                tag = "CMD";
                text = `${msg.from_agent} -> ${msg.to_agent}: ${msg.payload?.task || msg.payload?.commandText || "Task"}`;
              } else if (msg.message_type === 'response') {
                tag = "RESP";
                const responseText = msg.payload?.response || msg.payload?.code_snippet || JSON.stringify(msg.payload);
                text = `${msg.from_agent}: ${responseText.substring(0, 100)}...`;
              } else if (msg.message_type === 'notification') {
                tag = "NOTIF";
                const notifMsg = msg.payload?.message || msg.payload?.type || "Notification";
                const summary = msg.payload?.summary ? ` | ${JSON.stringify(msg.payload.summary)}` : "";
                // Show final_output if available (this contains the actual work from agents)
                const finalOutput = msg.payload?.final_output ? `\n\n📋 OUTPUT:\n${msg.payload.final_output.substring(0, 500)}...` : "";
                text = `${msg.from_agent} -> ${msg.to_agent}: ${notifMsg}${summary}${finalOutput}`;
              } else {
                tag = "MSG";
                text = `${msg.from_agent}: ${JSON.stringify(msg.payload)}`;
              }

              // Use a safe date format that won't cause hydration issues
              const date = new Date(msg.created_at);
              const timeStr = date.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });
              
              // Ensure unique ID: use msg.id if available, otherwise generate one
              const uniqueId = msg.id || `msg-${msg.created_at}-${index}-${Math.random().toString(36).substring(2, 9)}`;
              
              return {
                t: timeStr,
                tag,
                msg: text,
                id: uniqueId // Always unique ID for React key
              };
            });
            
            // IMMUTABLE: Create new array reversed (don't mutate original)
            // Always create new array reference to ensure React detects change
            const reversedLogs = [...formattedLogs].reverse(); // Show newest first
            setLogs(reversedLogs); // Direct set is fine - we're creating new array
          } else {
            console.warn("LogConsole: No messages in response", data);
          }
        })
        .catch(err => {
          console.error("[LogConsole] Failed to fetch logs:", err);
          setLastFetchTime(new Date().toLocaleTimeString());
          // Show error in logs - use crypto.randomUUID() for truly unique keys
          const errorId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          setLogs(prev => [{
            t: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            tag: "ERR",
            msg: `Failed to fetch: ${err.message}`,
            id: errorId
          }, ...prev.slice(0, 9)]); // Keep last 10 entries
        })
        .finally(() => {
          setIsPolling(false);
        });
    };

    // Fetch immediately
    fetchLogs();
    
    // Then poll every 1 second
    const interval = setInterval(fetchLogs, 1000);
    
    // Force initial render
    return () => {
      clearInterval(interval);
    };
  }, [activeBubbleId]);

  return (
    <section className="auspicio-card" style={{ border: '2px solid rgba(0, 255, 170, 0.3)' }}>
      <div className="auspicio-card-header">
        <h2>📋 Log Console - Bubble Output</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="auspicio-status-pill auspicio-status-online">
            LIVE FEED
          </span>
          <span style={{ 
            fontSize: "10px", 
            color: isPolling ? "#00ffaa" : "#888",
            animation: isPolling ? "pulse 0.5s infinite" : "pulse 2s infinite"
          }} title={`Showing ${logs.length} log entries. Last fetch: ${lastFetchTime || 'never'}`}>
            {isPolling ? "🔄" : "●"} {logs.length} entries
          </span>
        </div>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <p className="auspicio-card-subtitle">
        Real-time agent telemetry from Bubble Bus. Scroll to see all messages. Newest messages appear at the top.
      </p>
      <div className="auspicio-log">
        {logs.length === 0 ? (
          <div className="auspicio-log-line">
            <span className="auspicio-log-timestamp">--:--:--</span>
            <span className="auspicio-log-tag">WAIT</span>
            <span className="auspicio-log-message">Waiting for agent activity...</span>
          </div>
        ) : (
          logs.map((log, index) => (
            <div className="auspicio-log-line" key={log.id || `log-${log.t}-${log.tag}-${index}-${Math.random().toString(36).substring(2, 9)}`}>
              <span className="auspicio-log-timestamp">{log.t}</span>
              <span
                className={
                  "auspicio-log-tag " +
                  (log.tag === "WARN" ? "warn" : log.tag === "ERR" ? "err" : "")
                }
              >
                {log.tag}
              </span>
              <span className="auspicio-log-message">{log.msg}</span>
              {log.tag === "NOTIF" && log.msg.includes("VALIDATOR -> USER") && (
                <button
                  onClick={() => setShowResultsModal(true)}
                  style={{
                    marginLeft: "12px",
                    padding: "4px 12px",
                    background: "linear-gradient(90deg, #00ff88, #00cc88)",
                    color: "#000",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "bold"
                  }}
                >
                  📋 View Results
                </button>
              )}
            </div>
          ))
        )}
      </div>
      {showResultsModal && activeBubbleId && (
        <WorkflowResultsModal 
          bubbleId={activeBubbleId} 
          onClose={() => setShowResultsModal(false)} 
        />
      )}
    </section>
  );
}
