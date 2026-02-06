"use client";

import { useEffect, useState } from "react";

interface WorkflowResultsModalProps {
  bubbleId: string;
  onClose: () => void;
}

interface AgentResponse {
  from_agent: string;
  payload: {
    response?: string;
    final_output?: string;
  };
  created_at: string;
}

export default function WorkflowResultsModal({ bubbleId, onClose }: WorkflowResultsModalProps) {
  const [responses, setResponses] = useState<AgentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>("ALL");

  useEffect(() => {
    fetch(`/api/bubble/message?bubbleId=${bubbleId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.messages) {
          const agentResponses = data.messages
            .filter((m: any) => m.message_type === 'response')
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          setResponses(agentResponses);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load responses:", err);
        setLoading(false);
      });
  }, [bubbleId]);

  const exportResults = () => {
    const text = responses
      .map(r => `\n${"=".repeat(80)}\n${r.from_agent}\n${"=".repeat(80)}\n\n${r.payload.response || r.payload.final_output || "No output"}\n`)
      .join("\n");

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-results-${bubbleId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredResponses = selectedAgent === "ALL"
    ? responses
    : responses.filter(r => r.from_agent === selectedAgent);

  const uniqueAgents = ["ALL", ...new Set(responses.map(r => r.from_agent))];

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "20px"
    }}>
      <div style={{
        background: "#1a1a1a",
        border: "1px solid rgba(0, 255, 136, 0.3)",
        borderRadius: "12px",
        width: "90%",
        maxWidth: "1200px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h2 style={{ margin: 0, color: "#00ff88", fontSize: "24px" }}>
              📋 Workflow Results
            </h2>
            <p style={{ margin: "4px 0 0 0", color: "#888", fontSize: "14px" }}>
              Complete output from all agents
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => window.open(`/api/bubble/export?bubbleId=${bubbleId}&format=ai-prompt`, '_blank')}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(90deg, #00ff88, #00cc88)",
                color: "#000",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold"
              }}
              title="Export formatted for AI to build from"
            >
              🤖 Export for AI
            </button>
            <button
              onClick={() => window.open(`/api/bubble/export?bubbleId=${bubbleId}&format=markdown`, '_blank')}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(90deg, #0088ff, #00ccff)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold"
              }}
              title="Export as Markdown"
            >
              📝 Markdown
            </button>
            <button
              onClick={() => window.open(`/api/bubble/export?bubbleId=${bubbleId}&format=json`, '_blank')}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(90deg, #ff8800, #ffaa00)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold"
              }}
              title="Export as JSON"
            >
              📊 JSON
            </button>
            <button
              onClick={exportResults}
              style={{
                padding: "8px 16px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px"
              }}
              title="Export as plain text"
            >
              💾 Text
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "8px 16px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Agent Filter */}
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap"
        }}>
          {uniqueAgents.map(agent => (
            <button
              key={agent}
              onClick={() => setSelectedAgent(agent)}
              style={{
                padding: "6px 12px",
                background: selectedAgent === agent
                  ? "linear-gradient(90deg, #00ff88, #00cc88)"
                  : "rgba(255, 255, 255, 0.05)",
                color: selectedAgent === agent ? "#000" : "#fff",
                border: selectedAgent === agent
                  ? "none"
                  : "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: selectedAgent === agent ? "bold" : "normal"
              }}
            >
              {agent}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: "auto",
          padding: "20px"
        }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
              Loading results...
            </div>
          ) : filteredResponses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#888" }}>
              No results found
            </div>
          ) : (
            filteredResponses.map((response, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "24px",
                  padding: "16px",
                  background: "rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(0, 255, 136, 0.2)",
                  borderRadius: "8px"
                }}
              >
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px"
                }}>
                  <h3 style={{
                    margin: 0,
                    color: "#00ff88",
                    fontSize: "18px"
                  }}>
                    {response.from_agent}
                  </h3>
                  <span style={{
                    fontSize: "12px",
                    color: "#888"
                  }}>
                    {new Date(response.created_at).toLocaleString()}
                  </span>
                </div>
                <pre style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  color: "#ddd",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  fontFamily: "monospace"
                }}>
                  {response.payload.response || response.payload.final_output || "No output"}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
