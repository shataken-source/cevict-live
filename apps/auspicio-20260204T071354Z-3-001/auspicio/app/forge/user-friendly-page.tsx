"use client";

import { useState, useEffect } from "react";
import "../auspicio.css";
import "./forge-styles.css";
import BuildProgress from "../components/BuildProgress";
import AgentStatusCard from "../components/AgentStatusCard";
import LogConsole from "../components/LogConsole";
import FloatingBubbleStatus from "../components/FloatingBubbleStatus";
import CreateBubbleButton from "../../../cevict/app/components/CreateBubbleButton";
import InviteAgentButton from "../../../cevict/app/components/InviteAgentButton";
import HeartbeatMonitor from "../../../cevict/app/components/HeartbeatMonitor";
import RefreshIndicator from "../../../cevict/app/components/RefreshIndicator";
import ManualRefreshButton from "../../../cevict/app/components/ManualRefreshButton";
import CommandInput from "../../../cevict/app/components/CommandInput";
import EngineerWorkbench from "../components/EngineerWorkbench";
import ParticleBackground from "../../../cevict/app/components/ParticleBackground";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  action: string;
  completed: boolean;
}

interface AgentCapability {
  name: string;
  description: string;
  icon: string;
  color: string;
}

export default function UserFriendlyForgePage() {
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<any[]>([]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<'workflow' | 'agents' | 'monitor'>('workflow');
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode

  // Debug function to track bubble state changes
  const handleBubbleChange = (bubbleId: string) => {
    console.log('🎯 Parent bubble change:', {
      from: selectedBubbleId,
      to: bubbleId,
      timestamp: new Date().toISOString()
    });
    setSelectedBubbleId(bubbleId);
  };

  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('forge-dark-mode');
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('forge-dark-mode', JSON.stringify(darkMode));
  }, [darkMode]);

  const tutorialSteps: TutorialStep[] = [
    {
      id: 1,
      title: "🎯 Create Your First AI Bubble",
      description: "A Bubble is your AI workspace where agents collaborate on projects.",
      action: "Click the 'Create New Bubble' button below",
      completed: false
    },
    {
      id: 2,
      title: "🤖 Invite AI Agents",
      description: "Add specialized AI agents to your bubble based on your project needs.",
      action: "Select agents from the available capabilities",
      completed: false
    },
    {
      id: 3,
      title: "💬 Send Your First Command",
      description: "Give instructions to your AI team using natural language.",
      action: "Type a command in the input area below",
      completed: false
    },
    {
      id: 4,
      title: "📊 Monitor Progress",
      description: "Watch your AI agents work in real-time with live updates.",
      action: "Check the status panels and logs",
      completed: false
    }
  ];

  const agentCapabilities: AgentCapability[] = [
    {
      name: "Business Analysis",
      description: "Analyze business metrics, strategies, and growth opportunities",
      icon: "📊",
      color: "#00ff88"
    },
    {
      name: "Product Development",
      description: "Design, improve, and optimize products and features",
      icon: "🔧",
      color: "#0088ff"
    },
    {
      name: "Marketing Strategy",
      description: "Create marketing campaigns and growth strategies",
      icon: "📱",
      color: "#ff8800"
    },
    {
      name: "Risk Assessment",
      description: "Identify and mitigate business risks and threats",
      icon: "🛡️",
      color: "#ff4444"
    },
    {
      name: "Sentiment Analysis",
      description: "Analyze customer feedback and market sentiment",
      icon: "💭",
      color: "#ff00ff"
    },
    {
      name: "Data Intelligence",
      description: "Process and analyze complex datasets",
      icon: "🧮",
      color: "#00ffff"
    }
  ];

  useEffect(() => {
    const fetchBubbles = () => {
      fetch("/api/bubble/create")
        .then(res => res.json())
        .then(data => {
          if (data.success && data.bubbles) {
            const sorted = [...data.bubbles].sort((a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setBubbles(sorted);
            if (sorted.length > 0) {
              setSelectedBubbleId(prev => prev || sorted[0].id);
            }
          }
        })
        .catch(err => console.error("Failed to fetch bubbles:", err));
    };

    fetchBubbles();
    const interval = setInterval(fetchBubbles, 5000);
    return () => clearInterval(interval);
  }, []);

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowTutorial(false);
    }
  };

  const skipTutorial = () => {
    setShowTutorial(false);
  };

  return (
    <div className={`forge-scrollable-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <ParticleBackground />
      <div className="forge-content-wrapper">
        <div className="auspicio-shell" style={{
          position: 'relative',
          zIndex: 1,
          background: darkMode ? 'rgba(5, 6, 11, 0.95)' : 'rgba(248, 250, 252, 0.95)',
          color: darkMode ? '#f5f7ff' : '#1a202c'
        }}>

        {/* Enhanced Header */}
        <header className="auspicio-header-row" style={{
          background: darkMode
            ? "linear-gradient(135deg, rgba(5, 6, 11, 0.98), rgba(26, 26, 46, 0.98))"
            : "linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.98))",
          backdropFilter: "blur(20px)",
          borderBottom: darkMode
            ? "1px solid rgba(0, 255, 136, 0.2)"
            : "1px solid rgba(59, 130, 246, 0.2)",
          boxShadow: darkMode
            ? "0 4px 20px rgba(0, 255, 136, 0.1)"
            : "0 4px 20px rgba(59, 130, 246, 0.1)",
          padding: "20px 24px",
          borderRadius: "12px",
          marginBottom: "24px"
        }}>
          <div>
            <h1 className="auspicio-header-title" style={{
              fontSize: "32px",
              fontWeight: "800",
              marginBottom: "8px",
              background: darkMode
                ? "linear-gradient(135deg, #00ff88, #00b4ff)"
                : "linear-gradient(135deg, #2563eb, #7c3aed)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>
              AUSPICIO <span style={{ opacity: 0.8 }}>// FORGE</span>
            </h1>
            <p className="auspicio-header-subtitle" style={{
              fontSize: "16px",
              color: darkMode ? "#a0aec0" : "#4a5568",
              margin: 0
            }}>
              🚀 Build intelligent applications with AI agents - No coding required!
            </p>
          </div>
          <div className="auspicio-header-meta" style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  padding: "10px 18px",
                  background: darkMode
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.1)",
                  border: `1px solid ${darkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"}`,
                  borderRadius: "8px",
                  color: darkMode ? "#fff" : "#000",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.3s ease",
                  boxShadow: darkMode
                    ? "0 2px 8px rgba(255, 255, 255, 0.1)"
                    : "0 2px 8px rgba(0, 0, 0, 0.1)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = darkMode
                    ? "0 4px 12px rgba(255, 255, 255, 0.2)"
                    : "0 4px 12px rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = darkMode
                    ? "0 2px 8px rgba(255, 255, 255, 0.1)"
                    : "0 2px 8px rgba(0, 0, 0, 0.1)";
                }}
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? "☀️" : "🌙"} {darkMode ? "Light" : "Dark"}
              </button>
              <button
                onClick={() => setShowHelp(!showHelp)}
                style={{
                  padding: "10px 18px",
                  background: "linear-gradient(135deg, rgba(0, 136, 255, 0.2), rgba(0, 136, 255, 0.1))",
                  border: "1px solid rgba(0, 136, 255, 0.5)",
                  borderRadius: "8px",
                  color: "#0088ff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "600",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 8px rgba(0, 136, 255, 0.2)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 136, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 136, 255, 0.2)";
                }}
              >
                ❓ Help
              </button>
              <HeartbeatMonitor />
              <ManualRefreshButton onRefresh={() => window.location.reload()} />
            </div>
            <div style={{
              padding: "8px 16px",
              background: darkMode
                ? "rgba(0, 255, 136, 0.1)"
                : "rgba(16, 185, 129, 0.1)",
              border: `1px solid ${darkMode ? "rgba(0, 255, 136, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
              borderRadius: "8px",
              textAlign: "center"
            }}>
              <span style={{
                color: darkMode ? "#00ff88" : "#10b981",
                fontSize: "13px",
                fontWeight: "bold",
                display: "block"
              }}>
                ✅ BUILD ENGINE ONLINE
              </span>
              <span style={{
                color: darkMode ? "#a0aec0" : "#4a5568",
                fontSize: "11px",
                display: "block",
                marginTop: "4px"
              }}>
                Ready for AI collaboration
              </span>
            </div>
          </div>
        </header>

        {/* Tutorial Overlay */}
        {showTutorial && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.9)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #1a1a2e, #16213e)",
              border: "2px solid #00ff88",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0, 255, 136, 0.3)",
              scrollbarWidth: "thin",
              scrollbarColor: "#00ff88 #1a1a2e"
            }}>
              <style>{`
                div::-webkit-scrollbar {
                  width: 8px;
                }
                div::-webkit-scrollbar-track {
                  background: #1a1a2e;
                }
                div::-webkit-scrollbar-thumb {
                  background: #00ff88;
                  border-radius: 4px;
                }
                div::-webkit-scrollbar-thumb:hover {
                  background: #00cc66;
                }
              `}</style>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎯</div>
                <h2 style={{ color: "#00ff88", fontSize: "24px", marginBottom: "8px" }}>
                  Welcome to Auspicio Forge!
                </h2>
                <p style={{ color: "#aaa", fontSize: "14px" }}>
                  Let's get you started with AI-powered development
                </p>
              </div>

              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "24px"
              }}>
                <div style={{ color: "#00ff88", fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>
                  Step {currentStep + 1} of {tutorialSteps.length}
                </div>
                <h3 style={{ color: "#fff", fontSize: "18px", marginBottom: "8px" }}>
                  {tutorialSteps[currentStep].title}
                </h3>
                <p style={{ color: "#ccc", fontSize: "14px", marginBottom: "12px" }}>
                  {tutorialSteps[currentStep].description}
                </p>
                <div style={{
                  background: "rgba(0, 255, 136, 0.1)",
                  border: "1px solid rgba(0, 255, 136, 0.3)",
                  borderRadius: "6px",
                  padding: "12px",
                  fontSize: "13px",
                  color: "#00ff88"
                }}>
                  💡 {tutorialSteps[currentStep].action}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
                <button
                  onClick={skipTutorial}
                  style={{
                    padding: "12px 24px",
                    background: "transparent",
                    border: "1px solid #666",
                    borderRadius: "8px",
                    color: "#666",
                    cursor: "pointer"
                  }}
                >
                  Skip Tutorial
                </button>
                <button
                  onClick={nextStep}
                  style={{
                    padding: "12px 24px",
                    background: "linear-gradient(90deg, #00ff88, #00cc66)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#000",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  {currentStep === tutorialSteps.length - 1 ? "Start Building!" : "Next Step →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help Panel */}
        {showHelp && (
          <div style={{
            position: "fixed",
            top: "80px",
            right: "20px",
            width: "300px",
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            border: "1px solid #0088ff",
            borderRadius: "12px",
            padding: "20px",
            zIndex: 999,
            boxShadow: "0 10px 30px rgba(0, 136, 255, 0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ color: "#0088ff", fontSize: "16px", margin: 0 }}>📚 Quick Help</h3>
              <button
                onClick={() => setShowHelp(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#666",
                  fontSize: "18px",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "#ccc", lineHeight: "1.5" }}>
              <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "#00ff88" }}>🎯 What is a Bubble?</strong><br />
                A Bubble is your AI workspace where specialized agents collaborate on your projects.
              </div>
              <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "#00ff88" }}>🤖 AI Agents</strong><br />
                Choose agents based on your needs: Business Analysis, Product Development, Marketing, etc.
              </div>
              <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "#00ff88" }}>💬 Commands</strong><br />
                Use natural language to give instructions. Example: "Analyze customer feedback sentiment"
              </div>
              <div>
                <strong style={{ color: "#00ff88" }}>📊 Monitoring</strong><br />
                Watch real-time progress in the status panels and logs below.
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          {[
            { id: 'workflow', label: '🚀 Workflow', icon: '🎯' },
            { id: 'agents', label: '🤖 Agents', icon: '🤖' },
            { id: 'monitor', label: '📊 Monitor', icon: '📊' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "12px 24px",
                background: activeTab === tab.id
                  ? "linear-gradient(90deg, rgba(0, 255, 136, 0.2), rgba(0, 136, 255, 0.2))"
                  : "transparent",
                border: activeTab === tab.id
                  ? "1px solid #00ff88"
                  : "1px solid transparent",
                borderRadius: "8px 8px 0 0",
                color: activeTab === tab.id ? "#00ff88" : "#666",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                borderBottom: activeTab === tab.id ? "2px solid #00ff88" : "none"
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Workflow Tab */}
        {activeTab === 'workflow' && (
          <section style={{
            background: "linear-gradient(135deg, rgba(0, 255, 136, 0.05), rgba(0, 136, 255, 0.05))",
            border: "1px solid rgba(0, 255, 136, 0.2)",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px"
          }}>
            <h2 style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "#00ff88",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>🚀</span>
              Quick Start Workflow - Build Your AI Project in 3 Steps
            </h2>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "16px",
              marginBottom: "20px"
            }}>
              {/* Step 1 */}
              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(0, 255, 136, 0.3)",
                borderRadius: "12px",
                padding: "20px",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "#00ff88",
                  color: "#000",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "4px 8px",
                  borderRadius: "4px"
                }}>
                  STEP 1
                </div>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎯</div>
                <h3 style={{ color: "#00ff88", fontSize: "18px", marginBottom: "8px" }}>
                  Create AI Workspace
                </h3>
                <p style={{ fontSize: "14px", color: "#aaa", marginBottom: "16px", lineHeight: "1.4" }}>
                  Start a new AI project workspace where specialized agents will collaborate on your goals.
                </p>
                <CreateBubbleButton onCreated={(id: string) => setSelectedBubbleId(id)} />
              </div>

              {/* Step 2 */}
              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(0, 136, 255, 0.3)",
                borderRadius: "12px",
                padding: "20px",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "#0088ff",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "4px 8px",
                  borderRadius: "4px"
                }}>
                  STEP 2
                </div>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>🤖</div>
                <h3 style={{ color: "#0088ff", fontSize: "18px", marginBottom: "8px" }}>
                  Add AI Agents
                </h3>
                <p style={{ fontSize: "14px", color: "#aaa", marginBottom: "16px", lineHeight: "1.4" }}>
                  Choose specialist AI agents based on your project needs. Each agent has unique capabilities.
                </p>
                <InviteAgentButton bubbleId={selectedBubbleId} />
              </div>

              {/* Step 3 */}
              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 136, 0, 0.3)",
                borderRadius: "12px",
                padding: "20px",
                position: "relative",
                overflow: "hidden"
              }}>
                <div style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "#ff8800",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "bold",
                  padding: "4px 8px",
                  borderRadius: "4px"
                }}>
                  STEP 3
                </div>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>💬</div>
                <h3 style={{ color: "#ff8800", fontSize: "18px", marginBottom: "8px" }}>
                  Send Commands
                </h3>
                <p style={{ fontSize: "14px", color: "#aaa", marginBottom: "16px", lineHeight: "1.4" }}>
                  Give instructions to your AI team using natural language. No coding required!
                </p>
                <div style={{
                  padding: "12px",
                  background: "rgba(255, 136, 0, 0.1)",
                  border: "1px solid rgba(255, 136, 0, 0.3)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#ff8800",
                  textAlign: "center"
                }}>
                  ⬇️ Command input is below
                </div>
              </div>
            </div>

            {/* Example Commands */}
            <div style={{
              background: "rgba(0, 0, 0, 0.2)",
              borderRadius: "8px",
              padding: "16px",
              marginTop: "16px"
            }}>
              <h4 style={{ color: "#fff", fontSize: "14px", marginBottom: "12px" }}>
                💡 Example Commands to Try:
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {[
                  "Analyze customer feedback sentiment",
                  "Create a marketing strategy for new product",
                  "Identify business risks and mitigation strategies",
                  "Suggest product improvements based on user reviews"
                ].map((cmd, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "6px 12px",
                      background: "rgba(0, 255, 136, 0.1)",
                      border: "1px solid rgba(0, 255, 136, 0.3)",
                      borderRadius: "16px",
                      fontSize: "12px",
                      color: "#00ff88",
                      cursor: "pointer"
                    }}
                  >
                    {cmd}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <section style={{
            background: "linear-gradient(135deg, rgba(0, 136, 255, 0.05), rgba(255, 0, 255, 0.05))",
            border: "1px solid rgba(0, 136, 255, 0.2)",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px"
          }}>
            <h2 style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "#0088ff",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>🤖</span>
              Available AI Agents
            </h2>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px"
            }}>
              {agentCapabilities.map((agent, index) => (
                <div
                  key={index}
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: `1px solid ${agent.color}40`,
                    borderRadius: "12px",
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = `0 8px 20px ${agent.color}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>{agent.icon}</div>
                  <h3 style={{ color: agent.color, fontSize: "16px", marginBottom: "8px" }}>
                    {agent.name}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.4" }}>
                    {agent.description}
                  </p>
                  <div style={{
                    marginTop: "12px",
                    padding: "8px 16px",
                    background: `${agent.color}20`,
                    border: `1px solid ${agent.color}40`,
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: agent.color,
                    textAlign: "center",
                    fontWeight: "bold"
                  }}>
                    Available to Add
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Monitor Tab */}
        {activeTab === 'monitor' && (
          <section style={{
            background: "linear-gradient(135deg, rgba(255, 136, 0, 0.05), rgba(255, 68, 68, 0.05))",
            border: "1px solid rgba(255, 136, 0, 0.2)",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px"
          }}>
            <h2 style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "#ff8800",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>📊</span>
              System Monitoring
            </h2>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "16px",
              marginBottom: "20px"
            }}>
              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(0, 255, 136, 0.3)",
                borderRadius: "8px",
                padding: "16px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#00ff88", marginBottom: "8px" }}>
                  ✅ Online
                </div>
                <div style={{ fontSize: "14px", color: "#aaa" }}>
                  Build Engine Status
                </div>
              </div>

              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(0, 136, 255, 0.3)",
                borderRadius: "8px",
                padding: "16px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0088ff", marginBottom: "8px" }}>
                  {bubbles.length}
                </div>
                <div style={{ fontSize: "14px", color: "#aaa" }}>
                  Active Bubbles
                </div>
              </div>

              <div style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 136, 0, 0.3)",
                borderRadius: "8px",
                padding: "16px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ff8800", marginBottom: "8px" }}>
                  Real-time
                </div>
                <div style={{ fontSize: "14px", color: "#aaa" }}>
                  Agent Updates
                </div>
              </div>
            </div>

            <div style={{
              background: "rgba(0, 0, 0, 0.2)",
              borderRadius: "8px",
              padding: "16px"
            }}>
              <h4 style={{ color: "#fff", fontSize: "14px", marginBottom: "12px" }}>
                🛡️ Security & Monitoring
              </h4>
              <a
                href="/gatekeeper/dashboard"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  background: "linear-gradient(90deg, #ff4444, #ff6b6b)",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "bold"
                }}
              >
                <span>🛡️</span>
                View Security Dashboard
              </a>
            </div>
          </section>
        )}

        {/* Main Content Area */}
        <div className="auspicio-grid-top">
          <BuildProgress bubbleId={selectedBubbleId} />
          <AgentStatusCard bubbleId={selectedBubbleId} />
        </div>

        <EngineerWorkbench bubbleId={selectedBubbleId} />
        <LogConsole bubbleId={selectedBubbleId} />

        <CommandInput
          selectedBubbleId={selectedBubbleId}
          onBubbleChange={handleBubbleChange}
        />

        <div className="auspicio-footer">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <span>CEVlCT · BUBBLE ENGINE · AUSPICIO · v1.0.0 HUD</span>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <span style={{ color: "#00ff88", fontSize: "12px" }}>✅ AI Agents Ready</span>
              <span style={{ color: "#0088ff", fontSize: "12px" }}>🚀 Build Engine Online</span>
            </div>
          </div>
        </div>

        <RefreshIndicator />
      </div>

      {/* Floating Bubble Status Monitor */}
      <FloatingBubbleStatus bubbleId={selectedBubbleId} />
      </div>
    </div>
  );
}
