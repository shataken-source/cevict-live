"use client";

import { useState, useEffect } from "react";

export default function BuildProgress({ bubbleId }: { bubbleId: string | null }) {
  const [lastCompile, setLastCompile] = useState<{ status: string; time: number; timestamp: Date | null }>({
    status: "WAIT",
    time: 0,
    timestamp: null
  });
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!bubbleId) {
      setLastCompile({ status: "WAIT", time: 0, timestamp: null });
      setIsOnline(false);
      return;
    }

    const fetchBuildStatus = () => {
      fetch(`/api/bubble/message?bubbleId=${bubbleId}&_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.messages) {
            setIsOnline(true);
            
            // Find the most recent VALIDATOR response (this is like a "compile/validation")
            const validatorResponses = data.messages
              .filter((m: any) => m.from_agent === 'VALIDATOR' && m.message_type === 'response')
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            if (validatorResponses.length > 0) {
              const lastResponse = validatorResponses[0];
              const responseTime = new Date(lastResponse.created_at);
              
              // Find the corresponding ENGINEER submission that triggered this validation
              const engineerSubmissions = data.messages
                .filter((m: any) => 
                  m.from_agent === 'ENGINEER' && 
                  m.to_agent === 'VALIDATOR' &&
                  m.message_type === 'response' &&
                  new Date(m.created_at) < responseTime
                )
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              
              if (engineerSubmissions.length > 0) {
                const submissionTime = new Date(engineerSubmissions[0].created_at);
                const compileTime = responseTime.getTime() - submissionTime.getTime();
                
                // Check if validation was successful
                const isSuccess = lastResponse.payload?.success !== false && 
                                 !lastResponse.payload?.error &&
                                 !lastResponse.payload?.response?.toLowerCase().includes('error');
                
                setLastCompile({
                  status: isSuccess ? "OK" : "ERR",
                  time: compileTime,
                  timestamp: responseTime
                });
              } else {
                // VALIDATOR responded but no ENGINEER submission found - use response time as fallback
                setLastCompile({
                  status: "OK",
                  time: 0,
                  timestamp: responseTime
                });
              }
            } else {
              // No VALIDATOR responses yet - check if there are any ENGINEER submissions waiting
              const pendingSubmissions = data.messages
                .filter((m: any) => 
                  m.from_agent === 'ENGINEER' && 
                  m.to_agent === 'VALIDATOR' &&
                  m.message_type === 'response'
                );
              
              if (pendingSubmissions.length > 0) {
                setLastCompile({
                  status: "PROC",
                  time: 0,
                  timestamp: null
                });
              } else {
                setLastCompile({
                  status: "WAIT",
                  time: 0,
                  timestamp: null
                });
              }
            }
          }
        })
        .catch(err => {
          console.error("Failed to fetch build status:", err);
          setIsOnline(false);
        });
    };

    fetchBuildStatus();
    const interval = setInterval(fetchBuildStatus, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, [bubbleId]);

  const formatTime = (ms: number) => {
    if (ms === 0) return "0ms";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OK": return "#00ffaa";
      case "ERR": return "#ff4444";
      case "PROC": return "#ffaa00";
      default: return "#888";
    }
  };

  return (
    <section className="auspicio-card">
      <div className="auspicio-card-header">
        <h2>Build Progress</h2>
        <span className={`auspicio-status-pill ${isOnline ? 'auspicio-status-online' : 'auspicio-status-idle'}`}>
          {isOnline ? "LIVE BUILD" : "OFFLINE"}
        </span>
      </div>
      <p className="auspicio-card-subtitle">
        {bubbleId 
          ? "Real-time build status from active bubble."
          : "System is online and ready to orchestrate multi-agent builds."}
      </p>
      <div className="auspicio-progress-bar">
        <div className="auspicio-progress-fill" />
      </div>
      <p className="auspicio-metadata">
        LAST COMPILE{" "}
        <span style={{ color: getStatusColor(lastCompile.status) }}>
          {lastCompile.status}
          {lastCompile.time > 0 && ` · ${formatTime(lastCompile.time)}`}
          {lastCompile.timestamp && ` · ${lastCompile.timestamp.toLocaleTimeString()}`}
        </span>
      </p>
    </section>
  );
}
