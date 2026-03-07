'use client';

import React, { useState } from 'react';
import type { AIChatMessage, AIChatPanelProps } from '../lib/accu-solar-command-types';
import styles from '../page.module.css';

/**
 * In-dashboard AI chat panel for Accu Solar Command (page.tsx).
 * Uses same request/response shape as current dashboard; may call a different backend than /api/ai-chat (which requires auth).
 */
export default function AIChatPanelCommand({
  telemetry,
  weather,
  selectedLocation,
}: AIChatPanelProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your solar AI assistant. Ask me anything about your system, energy production, or optimization tips.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          telemetry,
          weather,
          location: selectedLocation,
          history: messages.slice(-5),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.response ?? data.text ?? "I'm not sure how to answer that right now.";
        const assistantMessage: AIChatMessage = {
          role: 'assistant',
          content: text,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to get AI response');
      }
    } catch (err) {
      const errorMessage: AIChatMessage = {
        role: 'assistant',
        content:
          err instanceof Error
            ? err.message
            : 'Sorry, I\'m having trouble connecting right now. Please try again later.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.panel} style={{ gridColumn: '1 / -1' }}>
      <div className={styles.panelTitleRow}>
        <div className={styles.panelTitle}>💬 ASK AI</div>
        <div style={{ fontSize: '11px', color: '#a78bfa' }}>Claude AI Chat</div>
      </div>

      <div
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          marginBottom: '12px',
          padding: '10px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '10px',
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                lineHeight: 1.5,
                background:
                  msg.role === 'user'
                    ? 'rgba(102, 126, 234, 0.3)'
                    : 'rgba(125, 211, 252, 0.1)',
                border:
                  msg.role === 'user'
                    ? '1px solid rgba(102, 126, 234, 0.4)'
                    : '1px solid rgba(125, 211, 252, 0.2)',
                color: '#e5e7eb',
              }}
            >
              {msg.content}
            </div>
            <span
              style={{
                fontSize: '10px',
                color: '#a78bfa',
                marginTop: '4px',
                marginLeft: msg.role === 'user' ? '0' : '4px',
                marginRight: msg.role === 'user' ? '4px' : '0',
              }}
            >
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#a78bfa',
              fontSize: '13px',
              padding: '10px',
            }}
          >
            <span>AI is thinking</span>
            <span style={{ animation: 'pulse 1s infinite' }}>...</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          className={styles.input}
          placeholder="Ask about your solar system..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ flex: 1, height: '44px' }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className={styles.button}
          style={{
            height: '44px',
            padding: '0 20px',
            opacity: isLoading || !input.trim() ? 0.5 : 1,
            cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          Send
        </button>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          'How can I save more energy?',
          'Is my battery healthy?',
          'When will my battery be full?',
          'Should I adjust my panels?',
        ].map((q) => (
          <button
            key={q}
            onClick={() => setInput(q)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              background: 'rgba(125, 211, 252, 0.1)',
              border: '1px solid rgba(125, 211, 252, 0.3)',
              borderRadius: '6px',
              color: '#7dd3fc',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'rgba(125, 211, 252, 0.2)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'rgba(125, 211, 252, 0.1)';
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
