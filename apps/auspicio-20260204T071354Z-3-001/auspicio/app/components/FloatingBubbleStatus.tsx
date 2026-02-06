'use client';

import { useState, useEffect, useRef } from 'react';

interface FloatingBubbleStatusProps {
  bubbleId: string | null;
}

export default function FloatingBubbleStatus({ bubbleId }: FloatingBubbleStatusProps) {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [status, setStatus] = useState<string>('Waiting for activity...');
  const [lastAgent, setLastAgent] = useState<string>('');
  const dragRef = useRef<HTMLDivElement>(null);

  // Fetch latest bubble activity
  useEffect(() => {
    if (!bubbleId) {
      setStatus('No active bubble');
      setLastAgent('');
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/bubble/message?bubbleId=${bubbleId}&_t=${Date.now()}`, {
          cache: 'no-store'
        });
        const data = await res.json();
        
        if (data.success && data.messages && data.messages.length > 0) {
          // Get the most recent message (last in array since they're in chronological order)
          const latest = data.messages[data.messages.length - 1];
          const agent = latest.from_agent;
          const type = latest.message_type;
          
          if (type === 'request') {
            setStatus(`${agent} → ${latest.to_agent}: Processing...`);
            setLastAgent(agent);
          } else if (type === 'response') {
            setStatus(`${agent}: Completed`);
            setLastAgent(agent);
          } else if (type === 'notification') {
            setStatus(`${agent}: ${latest.payload?.type || 'Notification'}`);
            setLastAgent(agent);
          }
        }
      } catch (err) {
        console.error('Failed to fetch bubble status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [bubbleId]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragRef.current) {
      setIsDragging(true);
      const rect = dragRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const getAgentColor = (agent: string) => {
    const colors: Record<string, string> = {
      GATEKEEPER: '#00ffaa',
      ARCHITECT: '#0088ff',
      ENGINEER: '#ff8800',
      VALIDATOR: '#00ff88',
      GRAPHICS_DESIGNER: '#ff00ff',
      DOCUMENTATION_SPECIALIST: '#ffaa00',
      SECURITY_EXPERT: '#ff0088',
      LEGAL_ADVISOR: '#8800ff',
      WEB_DATA_EXTRACTOR: '#00ffff',
      DATA_ANALYST: '#ffff00'
    };
    return colors[agent] || '#888';
  };

  return (
    <div
      ref={dragRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'grab',
        background: 'rgba(10, 10, 20, 0.95)',
        border: `2px solid ${getAgentColor(lastAgent)}`,
        borderRadius: '12px',
        padding: '12px 20px',
        minWidth: '300px',
        maxWidth: '500px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'border-color 0.3s ease'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getAgentColor(lastAgent),
          animation: lastAgent ? 'pulse 2s infinite' : 'none'
        }} />
        <div style={{
          flex: 1,
          fontSize: '13px',
          color: '#fff',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {status}
        </div>
        <div style={{
          fontSize: '10px',
          color: '#888',
          fontFamily: 'monospace'
        }}>
          🔴 LIVE
        </div>
      </div>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
