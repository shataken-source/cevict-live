"use client";

import { useState } from "react";

interface GuideStep {
  id: number;
  title: string;
  description: string;
  example: string;
  tips: string[];
}

export default function GettingStartedGuide() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const guideSteps: GuideStep[] = [
    {
      id: 1,
      title: "🎯 Understanding AI Bubbles",
      description: "Bubbles are collaborative AI workspaces where specialized agents work together on your projects.",
      example: "Think of a Bubble as a virtual team meeting room where AI experts collaborate.",
      tips: [
        "Each Bubble can have multiple AI agents with different skills",
        "Bubbles maintain conversation history and context",
        "You can create multiple Bubbles for different projects",
        "All work happens in real-time with live updates"
      ]
    },
    {
      id: 2,
      title: "🤖 Choosing the Right AI Agents",
      description: "Select agents based on your specific project needs and goals.",
      example: "For a product launch, you might want Marketing Strategy + Risk Assessment + Business Analysis agents.",
      tips: [
        "Business Analysis: Perfect for market research and strategic planning",
        "Product Development: Great for feature design and optimization",
        "Marketing Strategy: Ideal for campaigns and growth planning",
        "Risk Assessment: Essential for identifying potential issues",
        "Sentiment Analysis: Best for customer feedback and market research",
        "Data Intelligence: Perfect for complex data analysis and insights"
      ]
    },
    {
      id: 3,
      title: "💬 Writing Effective Commands",
      description: "Use natural language to give clear, specific instructions to your AI team.",
      example: "Instead of 'analyze data', try 'Analyze customer feedback from Q3 2023 and identify top 3 improvement areas for our mobile app'.",
      tips: [
        "Be specific about what you want analyzed",
        "Include context and relevant timeframes",
        "Ask for actionable insights and recommendations",
        "Use conversational language - no coding required",
        "Break complex tasks into multiple steps if needed"
      ]
    },
    {
      id: 4,
      title: "📊 Monitoring and Iteration",
      description: "Track progress in real-time and refine your approach based on AI insights.",
      example: "Review the agent responses, identify gaps, and ask follow-up questions to dive deeper.",
      tips: [
        "Watch the real-time progress indicators",
        "Review agent confidence scores and reasoning",
        "Ask follow-up questions to explore insights further",
        "Use the logs to understand agent decision-making",
        "Iterate on your commands based on results"
      ]
    }
  ];

  const quickCommands = [
    "Analyze customer feedback sentiment and identify key themes",
    "Create a marketing strategy for a new SaaS product launch",
    "Identify potential business risks for expanding to European markets",
    "Suggest product improvements based on user reviews and support tickets",
    "Develop a competitive analysis for our main product features",
    "Generate recommendations for improving team productivity"
  ];

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(0, 255, 136, 0.05), rgba(0, 136, 255, 0.05))",
      border: "1px solid rgba(0, 255, 136, 0.2)",
      borderRadius: "12px",
      padding: "24px",
      marginBottom: "24px"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "20px"
      }}>
        <div style={{ fontSize: "32px" }}>📚</div>
        <div>
          <h2 style={{
            fontSize: "20px",
            fontWeight: "bold",
            color: "#00ff88",
            margin: 0,
            marginBottom: "4px"
          }}>
            Complete Getting Started Guide
          </h2>
          <p style={{ fontSize: "14px", color: "#aaa", margin: 0 }}>
            Master the Forge in 5 minutes - Everything you need to know
          </p>
        </div>
      </div>

      {/* Quick Commands */}
      <div style={{
        background: "rgba(0, 0, 0, 0.2)",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "20px"
      }}>
        <h3 style={{ color: "#fff", fontSize: "16px", marginBottom: "12px" }}>
          ⚡ Quick Start Commands (Copy & Paste These)
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {quickCommands.map((cmd, i) => (
            <span
              key={i}
              style={{
                padding: "8px 12px",
                background: "rgba(0, 255, 136, 0.1)",
                border: "1px solid rgba(0, 255, 136, 0.3)",
                borderRadius: "16px",
                fontSize: "12px",
                color: "#00ff88",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              onClick={() => {
                navigator.clipboard.writeText(cmd);
                // In a real app, you'd show a toast notification here
              }}
              title="Click to copy"
            >
              📋 {cmd.substring(0, 40)}...
            </span>
          ))}
        </div>
      </div>

      {/* Guide Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {guideSteps.map((step) => (
          <div
            key={step.id}
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              overflow: "hidden",
              transition: "all 0.3s ease"
            }}
          >
            <div
              style={{
                padding: "16px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
              onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{
                  color: "#00ff88",
                  fontSize: "16px",
                  fontWeight: "bold",
                  margin: 0,
                  marginBottom: "4px"
                }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: "13px", color: "#aaa", margin: 0 }}>
                  {step.description}
                </p>
              </div>
              <div style={{
                fontSize: "20px",
                color: "#666",
                transition: "transform 0.3s ease",
                transform: expandedStep === step.id ? "rotate(180deg)" : "rotate(0deg)"
              }}>
                ▼
              </div>
            </div>
            
            {expandedStep === step.id && (
              <div style={{
                padding: "0 16px 16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)"
              }}>
                <div style={{
                  background: "rgba(0, 255, 136, 0.1)",
                  border: "1px solid rgba(0, 255, 136, 0.3)",
                  borderRadius: "6px",
                  padding: "12px",
                  marginBottom: "12px"
                }}>
                  <div style={{ fontSize: "12px", color: "#00ff88", fontWeight: "bold", marginBottom: "4px" }}>
                    💡 Example:
                  </div>
                  <div style={{ fontSize: "13px", color: "#ccc", fontStyle: "italic" }}>
                    {step.example}
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: "12px", color: "#fff", fontWeight: "bold", marginBottom: "8px" }}>
                    ✨ Pro Tips:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "16px" }}>
                    {step.tips.map((tip, i) => (
                      <li key={i} style={{ fontSize: "13px", color: "#aaa", marginBottom: "4px" }}>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Success Tips */}
      <div style={{
        marginTop: "20px",
        padding: "16px",
        background: "linear-gradient(90deg, rgba(0, 255, 136, 0.1), rgba(0, 136, 255, 0.1))",
        border: "1px solid rgba(0, 255, 136, 0.3)",
        borderRadius: "8px"
      }}>
        <h3 style={{ color: "#00ff88", fontSize: "16px", marginBottom: "8px" }}>
          🎉 Keys to Success
        </h3>
        <div style={{ fontSize: "13px", color: "#ccc", lineHeight: "1.5" }}>
          <strong>Start Simple:</strong> Begin with clear, specific commands and build complexity as you get comfortable.<br />
          <strong>Iterate:</strong> Use follow-up questions to dive deeper into insights.<br />
          <strong>Combine Agents:</strong> Mix different agent types for comprehensive analysis.<br />
          <strong>Review Results:</strong> Always check confidence scores and reasoning to validate outputs.
        </div>
      </div>
    </div>
  );
}
