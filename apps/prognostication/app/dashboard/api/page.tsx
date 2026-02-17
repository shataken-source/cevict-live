"use client"

import { Copy, Check, Code, Webhook, Key, Terminal } from "lucide-react"
import { useState } from "react"

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/signals",
    description: "Fetch all active signals",
    params: [
      { name: "platform", type: "string", optional: true, desc: "Filter by platform (kalshi, polymarket)" },
      { name: "min_edge", type: "number", optional: true, desc: "Minimum EV threshold" },
      { name: "confidence", type: "string", optional: true, desc: "LOW, MEDIUM, HIGH" },
    ]
  },
  {
    method: "GET",
    path: "/api/v1/signals/{id}",
    description: "Get specific signal details",
    params: [
      { name: "id", type: "string", optional: false, desc: "Signal ID" },
    ]
  },
  {
    method: "POST",
    path: "/api/v1/webhooks/subscribe",
    description: "Subscribe to real-time signal webhooks",
    params: [
      { name: "url", type: "string", optional: false, desc: "Webhook endpoint URL" },
      { name: "events", type: "array", optional: false, desc: "signal.created, signal.updated" },
    ]
  }
]

const codeExample = `{
  "id": "sig_001",
  "market": "Chiefs to Win Super Bowl",
  "platform": "kalshi",
  "direction": "YES",
  "model_probability": 0.61,
  "market_probability": 0.54,
  "edge": 0.07,
  "confidence": "HIGH",
  "liquidity": "$1.2M",
  "timestamp": "2025-01-20T10:00:00Z",
  "audit_hash": "0x7a3f...9e2d"
}`

export default function APIPage() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeExample)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-text-primary">API Reference</h1>
        <p className="text-text-secondary mt-1">
          Institutional-grade API for probability market intelligence
        </p>
      </div>

      {/* Rate Limits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Key size={18} className="text-primary" />
            <span className="text-sm text-text-muted">Your Plan</span>
          </div>
          <div className="text-2xl font-semibold text-text-primary">Pro</div>
          <div className="text-xs text-text-muted mt-1">Upgrade for higher limits</div>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Terminal size={18} className="text-accent" />
            <span className="text-sm text-text-muted">Rate Limit</span>
          </div>
          <div className="text-2xl font-semibold text-text-primary">100/min</div>
          <div className="text-xs text-text-muted mt-1">Requests per minute</div>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Webhook size={18} className="text-success" />
            <span className="text-sm text-text-muted">Webhooks</span>
          </div>
          <div className="text-2xl font-semibold text-text-primary">5</div>
          <div className="text-xs text-text-muted mt-1">Active endpoints</div>
        </div>
      </div>

      {/* API Key Management */}
      <div className="bg-panel border border-border rounded-xl p-6">
        <h3 className="font-semibold text-text-primary mb-4">API Keys</h3>
        <div className="flex items-center justify-between bg-surface rounded-lg p-4">
          <div>
            <div className="font-mono text-sm text-text-primary">pk_live_••••••••••••••••</div>
            <div className="text-xs text-text-muted mt-1">Created Jan 15, 2025</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition">
              Reveal
            </button>
            <button className="px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm hover:border-primary transition">
              Rotate
            </button>
          </div>
        </div>
      </div>

      {/* Code Example */}
      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
          <div className="flex items-center gap-2">
            <Code size={18} className="text-primary" />
            <span className="font-medium text-text-primary">Signal Payload</span>
          </div>
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded text-sm text-text-secondary hover:text-text-primary transition"
          >
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="p-4 text-sm text-text-primary overflow-x-auto">
          <code>{codeExample}</code>
        </pre>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        <h3 className="font-semibold text-text-primary">Endpoints</h3>
        {endpoints.map((endpoint, i) => (
          <div key={i} className="bg-panel border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b border-border bg-surface">
              <span className={`px-3 py-1 rounded text-xs font-medium ${
                endpoint.method === "GET" ? "bg-success/20 text-success" : "bg-primary/20 text-primary"
              }`}>
                {endpoint.method}
              </span>
              <span className="font-mono text-sm text-text-primary">{endpoint.path}</span>
            </div>
            <div className="p-4">
              <p className="text-text-secondary text-sm mb-4">{endpoint.description}</p>
              {endpoint.params.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-text-muted uppercase">Parameters</div>
                  <div className="grid gap-2">
                    {endpoint.params.map((param, j) => (
                      <div key={j} className="flex items-start gap-4 text-sm">
                        <span className="font-mono text-primary w-24">{param.name}</span>
                        <span className="text-text-muted w-20">{param.type}</span>
                        <span className="text-text-secondary">{param.desc}</span>
                        {param.optional && <span className="text-xs text-text-muted">(optional)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Webhook Section */}
      <div className="bg-panel border border-border rounded-xl p-6">
        <h3 className="font-semibold text-text-primary mb-4">Webhook Integration</h3>
        <p className="text-text-secondary text-sm mb-4">
          Subscribe to real-time signal updates via webhooks. Enterprise plans include unlimited webhooks.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="https://your-domain.com/webhook"
            className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition">
            Add Webhook
          </button>
        </div>
      </div>
    </div>
  )
}
