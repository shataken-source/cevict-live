"use client";

import { useState, useEffect } from "react";
// Dynamic import for client component - agent registry is server-side
// We'll fetch agent info from the API instead

interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'WORKING' | 'WAITING' | 'IDLE' | 'PROCESSING';
  icon?: string;
}

export default function AgentStatusCard({ bubbleId }: { bubbleId: string | null }) {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [bubbleAgents, setBubbleAgents] = useState<string[]>([]);

  // Load bubble agents
  useEffect(() => {
    if (!bubbleId) {
      setAgents([]);
      return;
    }

    fetch("/api/bubble/create")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.bubbles) {
          const bubble = data.bubbles.find((b: any) => b.id === bubbleId);
          if (bubble) {
            setBubbleAgents(bubble.agents || []);
            // Initialize agents from bubble
            // Fetch agent configs from API
            fetch(`/api/bubble/invite-agent?_t=${Date.now()}`, { cache: 'no-store' })
              .then(res => res.json())
              .then((agentData: any) => {
                if (agentData.success && agentData.agents) {
                  const agentMap = new Map(agentData.agents.map((a: any) => [a.id, a]));
                  const initialAgents: AgentStatus[] = bubble.agents
                    .filter((id: string) => id !== 'USER' && id !== 'SYSTEM')
                    .map((id: string) => {
                      const config: any = agentMap.get(id);
                      if (config) {
                        return {
                          id: config.id,
                          name: config.name,
                          role: `${config.specialization}`,
                          status: 'IDLE' as const,
                          icon: config.icon
                        };
                      }
                      // Fallback for unknown agents
                      return {
                        id,
                        name: id,
                        role: 'Agent',
                        status: 'IDLE' as const
                      };
                    });
                  setAgents(initialAgents);
                } else {
                  // Fallback if API fails
                  const fallbackAgents: AgentStatus[] = bubble.agents
                    .filter((id: string) => id !== 'USER' && id !== 'SYSTEM')
                    .map((id: string) => ({
                      id,
                      name: id,
                      role: 'Agent',
                      status: 'IDLE' as const
                    }));
                  setAgents(fallbackAgents);
                }
              })
              .catch(() => {
                // Fallback if API fails
                const fallbackAgents: AgentStatus[] = bubble.agents
                  .filter((id: string) => id !== 'USER' && id !== 'SYSTEM')
                  .map((id: string) => ({
                    id,
                    name: id,
                    role: 'Agent',
                    status: 'IDLE' as const
                  }));
                setAgents(fallbackAgents);
              });
          }
        }
      })
      .catch(err => console.error("Failed to load bubble:", err));
  }, [bubbleId]);

  useEffect(() => {
    if (!bubbleId) {
      setAgents(prev => prev.map(a => ({ ...a, status: 'IDLE' as const })));
      return;
    }

    const checkStatus = () => {
      if (!bubbleId) return;

      // Fetch both messages and bubble info to ensure we have all agents
      Promise.all([
        fetch(`/api/bubble/message?bubbleId=${bubbleId}&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }).then(res => res.json()),
        fetch(`/api/bubble/create?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        }).then(res => res.json())
      ])
        .then(([messageData, bubbleData]) => {
          if (messageData.success && messageData.messages) {
            const messages = messageData.messages;
            const bubble = bubbleData.success && bubbleData.bubbles
              ? bubbleData.bubbles.find((b: any) => b.id === bubbleId)
              : null;
            const allBubbleAgents: string[] = (bubble?.agents as string[] | undefined) ?? bubbleAgents ?? [];

            setAgents(prev => {
              // Ensure we update ALL agents from the bubble
              const agentIds = new Set(prev.map(a => a.id));
              const allAgentIds = new Set(allBubbleAgents.filter((id: string) => id !== 'USER' && id !== 'SYSTEM'));

              // Create a new array with all agents
              const updatedAgents = [...prev];

              // Add any missing agents
              allAgentIds.forEach(id => {
                if (!agentIds.has(id)) {
                  updatedAgents.push({
                    id,
                    name: id,
                    role: 'Agent',
                    status: 'IDLE' as const
                  });
                }
              });

              // Check if workflow is complete (VALIDATOR sent notification to USER)
              const workflowComplete = messages.some((m: any) =>
                m.from_agent === 'VALIDATOR' &&
                m.to_agent === 'USER' &&
                m.message_type === 'notification'
              );

              return updatedAgents.map(agent => {
                // If workflow is complete, all agents should be IDLE
                if (workflowComplete) {
                  return { ...agent, status: 'IDLE' as const };
                }

                // Check for pending requests TO this agent
                const hasPendingRequest = messages.some((m: any) =>
                  m.to_agent === agent.id &&
                  m.message_type === 'request' &&
                  !m.read_at
                );

                // Check for recent responses FROM this agent (within last 2 minutes for better visibility)
                const recentResponse = messages.some((m: any) =>
                  m.from_agent === agent.id &&
                  m.message_type === 'response' &&
                  new Date(m.created_at).getTime() > Date.now() - 120000 // 2 minutes instead of 30 seconds
                );

                // Check for active processing (request exists but no response yet)
                const isProcessing = messages.some((m: any) =>
                  m.to_agent === agent.id &&
                  m.message_type === 'request' &&
                  !m.read_at &&
                  !messages.some((r: any) =>
                    r.from_agent === agent.id &&
                    r.message_type === 'response' &&
                    new Date(r.created_at) > new Date(m.created_at)
                  )
                );

                if (recentResponse) {
                  return { ...agent, status: 'WORKING' as const };
                } else if (isProcessing) {
                  return { ...agent, status: 'PROCESSING' as const };
                } else if (hasPendingRequest) {
                  return { ...agent, status: 'WAITING' as const };
                } else {
                  return { ...agent, status: 'IDLE' as const };
                }
              });
            });
          }
        })
        .catch(err => console.error("Failed to fetch agent status:", err));
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000); // Check every 1 second for more responsive updates

    // Force initial check
    return () => {
      clearInterval(interval);
    };
  }, [bubbleId]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'WORKING': return 'auspicio-status-pill auspicio-status-online';
      case 'PROCESSING': return 'auspicio-status-pill auspicio-status-online';
      case 'WAITING': return 'auspicio-status-pill auspicio-status-idle';
      default: return 'auspicio-status-pill';
    }
  };

  return (
    <section className="auspicio-card">
      <div className="auspicio-card-header">
        <h2>Agent Status</h2>
        <span className="auspicio-status-pill auspicio-status-idle">
          TRI-ENGINE SYNCED
        </span>
      </div>
      <p className="auspicio-card-subtitle">
        Snapshot of the three core operators inside this Bubble.
      </p>
      <div className="auspicio-agent-list">
        {agents.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
            No agents in bubble. Invite agents to get started.
          </div>
        ) : (
          agents.map(agent => (
            <div key={agent.id} className="auspicio-agent-row">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {agent.icon && <span>{agent.icon}</span>}
                <div>
                  <div className="auspicio-agent-name">{agent.name}</div>
                  <div className="auspicio-agent-role">{agent.role}</div>
                </div>
              </div>
              <span className={getStatusClass(agent.status)}>
                {agent.status}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
