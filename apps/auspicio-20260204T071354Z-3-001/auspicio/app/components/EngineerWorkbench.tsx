"use client";

import { useState, useEffect } from "react";

export default function EngineerWorkbench({ bubbleId }: { bubbleId: string | null }) {
  const [activeTask, setActiveTask] = useState<any>(null);
  const [code, setCode] = useState("");
  const [isAutomated, setIsAutomated] = useState(true); // Assume automated by default - hide by default

  // Immediate check on mount - assume automated until proven otherwise
  useEffect(() => {
    if (!bubbleId) {
      setActiveTask(null);
      setIsAutomated(true); // Hide if no bubble
      return;
    }

    // Quick check first - if ENGINEER has responded, hide immediately
    const quickCheck = () => {
      fetch(`/api/bubble/message?bubbleId=${bubbleId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.messages) {
            const hasEngineerResponse = data.messages.some((m: any) => 
              m.from_agent === 'ENGINEER' && m.message_type === 'response'
            );
            setIsAutomated(hasEngineerResponse);
            if (hasEngineerResponse) {
              setActiveTask(null);
            }
          }
        })
        .catch(() => setIsAutomated(true)); // Hide on error
    };
    
    quickCheck(); // Check immediately

    const checkTasks = () => {
      fetch(`/api/bubble/message?bubbleId=${bubbleId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.messages) {
            // Check if ENGINEER is automated by looking for ANY responses
            // ENGINEER is automated (ChatGPT) by default - only show workbench if explicitly human
            const engineerResponses = data.messages.filter((m: any) => 
              m.from_agent === 'ENGINEER' && 
              m.message_type === 'response'
            );
            
            // If ENGINEER has EVER responded, it's automated (ChatGPT)
            // Only show workbench if ENGINEER has NEVER responded (human mode)
            const appearsAutomated = engineerResponses.length > 0;
            setIsAutomated(appearsAutomated);
            
            // Completely skip if automated - don't even look for tasks
            if (appearsAutomated) {
              setActiveTask(null);
              return;
            }

            // Find tasks (Architect -> Engineer)
            const tasks = data.messages
              .filter((m: any) => m.to_agent === 'ENGINEER' && m.from_agent === 'ARCHITECT')
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Find responses (Engineer -> Validator)
            const responses = data.messages
              .filter((m: any) => m.from_agent === 'ENGINEER' && m.to_agent === 'VALIDATOR');

            // Find the latest UNANSWERED task
            const latestTask = tasks[0];
            if (latestTask) {
              const isAnswered = responses.some((r: any) => 
                r.payload?.task_id === latestTask.id && 
                new Date(r.created_at) > new Date(latestTask.created_at)
              );
              
              if (!isAnswered) {
                setActiveTask(latestTask);
              } else {
                setActiveTask(null);
              }
            } else {
              setActiveTask(null);
            }
          }
        });
    };

    const interval = setInterval(checkTasks, 2000);
    return () => clearInterval(interval);
  }, [bubbleId]);

  const handleSubmit = async () => {
    if (!bubbleId || !code) return;

    await fetch("/api/bubble/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bubbleId,
        fromAgent: "ENGINEER",
        toAgent: "VALIDATOR",
        messageType: "response", // Engineer responding with code
        payload: {
          task_id: activeTask?.id,
          task: `Review this implementation code:\n\n${code}`, // Standardize for Validator
          response: code, // For LogConsole display
          code_snippet: code,
          status: "completed"
        }
      })
    });

    alert("✅ Code submitted to Validator!");
    setCode("");
    
    // Trigger validator processing
    fetch("/api/bubble/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bubbleId })
    });
  };

  // Completely hide workbench if ENGINEER is automated (ChatGPT)
  // ENGINEER is automated by default - only show if explicitly in human mode
  // Human mode = ENGINEER has NEVER responded (no responses in message history)
  if (isAutomated) {
    return null; // Don't render anything - ENGINEER is automated, no human input needed
  }

  // Hide if no active task (even in human mode, wait for task)
  if (!activeTask) {
    return null;
  }

  return (
    <section className="auspicio-card" style={{ border: '1px solid #00ffaa' }}>
      <div className="auspicio-card-header">
        <h2>Engineer Workbench</h2>
        <span className="auspicio-status-pill auspicio-status-online">
          TASK ACTIVE
        </span>
      </div>
      
      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <h4 style={{ color: '#00ffaa', marginBottom: '8px' }}>ARCHITECT REQUEST:</h4>
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
          {activeTask.payload.task || JSON.stringify(activeTask.payload)}
        </pre>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px' }}>Your Implementation:</label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="// Paste your implementation code here..."
          style={{
            width: '100%',
            height: '200px',
            background: '#0a0a0a',
            color: '#00ffaa',
            border: '1px solid #333',
            padding: '12px',
            fontFamily: 'monospace'
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        style={{
          width: '100%',
          padding: '12px',
          background: 'linear-gradient(90deg, #00ffaa, #00b4ff)',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Submit to Validator
      </button>
    </section>
  );
}

