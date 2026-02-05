'use client';

import React, { useState } from 'react';

/**
 * Cevict Flux v2.0 Landing Page Component
 * High-tech, sharp, and punchy design matching the Cevict brand
 */

export default function CevictFluxLanding() {
  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'api' | 'security'>('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Cevict Flux v2.0
          </h1>
          <p className="text-2xl md:text-3xl text-slate-300 mb-6">
            The Statistical Engine for High-Conviction Sports Intelligence
          </p>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto">
            Institutional-grade analytics, Monte Carlo simulation pathing, and arbitrage discovery
            for the 2025 sports landscape. Built for those who demand data integrity.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-12 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'features'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Features
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'api'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            API
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'security'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Security
          </button>
        </div>

        {/* Content Sections */}
        {activeTab === 'overview' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-700">
              <h2 className="text-3xl font-bold mb-4 text-cyan-400">Why Cevict Flux?</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-blue-400">🛡️ Legal Shielding</h3>
                  <p className="text-slate-300">
                    Built-in dynamic disclaimers and consent-header requirements tailored for the 2025 Alabama regulatory environment.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-purple-400">⚡ Performance-First</h3>
                  <p className="text-slate-300">
                    Asynchronous job processing (BullMQ) ensures your UI never hangs while the engine grinds the numbers.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-green-400">📊 Audit-Ready</h3>
                  <p className="text-slate-300">
                    Every prediction is logged with a unique HMAC hash, allowing for full back-testing and auditability.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-yellow-400">🔐 Security-First</h3>
                  <p className="text-slate-300">
                    API key scoping, tiered rate limiting, Zod input validation, and HMAC-signed performance tracking.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-700">
              <h2 className="text-3xl font-bold mb-4 text-cyan-400">Quick Start</h2>
              <div className="bg-slate-900 rounded-lg p-6 overflow-x-auto">
                <pre className="text-sm text-slate-300">
{`import { FluxClient } from '@cevict/flux-sdk';

const flux = new FluxClient({
  apiKey: process.env.CEVICT_FLUX_KEY,
  requireConsent: true
});

const { jobId } = await flux.simulate({
  gameId: '2025-bama-vs-georgia',
  iterations: 50000,
  winProbability: 0.58
});`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
                <h3 className="text-2xl font-bold mb-3 text-cyan-400">SimEngine</h3>
                <p className="text-slate-300 mb-4">Monte Carlo simulations with 100k+ iterations on-demand via background job queues (BullMQ)</p>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li>• Asynchronous processing</li>
                  <li>• Progress tracking</li>
                  <li>• Reproducible results (seeded)</li>
                </ul>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
                <h3 className="text-2xl font-bold mb-3 text-blue-400">ArbOptic</h3>
                <p className="text-slate-300 mb-4">Real-time cross-book discrepancy monitoring with input slop protection</p>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li>• Freshness timestamps</li>
                  <li>• Stale data detection</li>
                  <li>• Confidence scoring</li>
                </ul>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
                <h3 className="text-2xl font-bold mb-3 text-purple-400">Claude Effect</h3>
                <p className="text-slate-300 mb-4">7-dimensional AI-powered prediction enhancement</p>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li>• Sentiment Field</li>
                  <li>• Narrative Momentum</li>
                  <li>• Information Asymmetry</li>
                  <li>• Chaos Sensitivity</li>
                  <li>• Network Influence</li>
                  <li>• Temporal Relevance Decay</li>
                  <li>• Emergent Patterns</li>
                </ul>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
                <h3 className="text-2xl font-bold mb-3 text-green-400">VaultGuard</h3>
                <p className="text-slate-300 mb-4">HMAC-signed performance tracking and Zod-sanitized inputs</p>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li>• PII anonymization</li>
                  <li>• Data integrity checks</li>
                  <li>• Audit logging</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-700">
              <h2 className="text-3xl font-bold mb-6 text-cyan-400">API Endpoints</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-blue-400">Health & System</h3>
                  <code className="block bg-slate-900 rounded p-3 text-sm text-slate-300">
                    GET /api/progno/v2?action=health
                  </code>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-purple-400">Predictions</h3>
                  <code className="block bg-slate-900 rounded p-3 text-sm text-slate-300">
                    GET /api/progno/v2?action=prediction&gameId=...
                  </code>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-green-400">Simulations</h3>
                  <code className="block bg-slate-900 rounded p-3 text-sm text-slate-300">
                    POST /api/progno/v2?action=simulate
                  </code>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-yellow-400">Arbitrage</h3>
                  <code className="block bg-slate-900 rounded p-3 text-sm text-slate-300">
                    GET /api/progno/v2?action=arbitrage&sport=nfl
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-700">
              <h2 className="text-3xl font-bold mb-4 text-cyan-400">Authentication</h2>
              <div className="bg-slate-900 rounded-lg p-6">
                <pre className="text-sm text-slate-300">
{`Authorization: Bearer YOUR_API_KEY
X-Progno-Consent: 2025-01-15T10:00:00Z`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 border border-slate-700">
              <h2 className="text-3xl font-bold mb-6 text-cyan-400">Security Features</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-blue-400">API Key Scoping</h3>
                  <p className="text-slate-300">
                    12 permission scopes (predictions:read, simulations:write, etc.) for granular access control.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-purple-400">Rate Limiting</h3>
                  <p className="text-slate-300 mb-2">Tiered limits based on subscription:</p>
                  <ul className="text-slate-400 space-y-1 ml-4">
                    <li>• Free: 100 requests/hour</li>
                    <li>• Pro: 1,000 requests/hour</li>
                    <li>• Elite: 5,000 requests/hour</li>
                    <li>• Enterprise: 10,000 requests/hour</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-green-400">Input Validation</h3>
                  <p className="text-slate-300">
                    Zod schemas prevent DoS attacks and invalid data from reaching core logic.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-yellow-400">HMAC Signing</h3>
                  <p className="text-slate-300">
                    All performance data is cryptographically signed to ensure data integrity.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-red-400">PII Anonymization</h3>
                  <p className="text-slate-300">
                    User IDs and betting IDs are anonymized using SHA-256 hashing to protect privacy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg p-8 border border-cyan-500/30">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-slate-300 mb-6">
              Import the Postman collection or check out the full documentation
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/api/progno/v2?action=info"
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold transition-colors"
              >
                View API Info
              </a>
              <a
                href="/cevict_flux_v2_postman.json"
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-semibold transition-colors"
              >
                Download Postman Collection
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

