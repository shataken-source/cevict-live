'use client'

import { useState } from 'react'
import {
  Brain, Cpu, Database, Zap, ArrowRight,
  Shield, Activity, Settings, ChevronRight,
  Sparkles, Bot, LineChart, Layers, Heart, Tv, Sun
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AI_PROJECTS, getProjectUrl } from '@/lib/config'

// Display-only map for homepage cards. Add new webapp here when you add to lib/config.ts AI_PROJECTS.
const PROJECT_DISPLAY: Record<string, { icon: LucideIcon; gradient: string }> = {
  progno: { icon: Brain, gradient: 'from-indigo-500 to-purple-500' },
  prognostication: { icon: LineChart, gradient: 'from-purple-500 to-pink-500' },
  orchestrator: { icon: Layers, gradient: 'from-cyan-500 to-blue-500' },
  massager: { icon: Database, gradient: 'from-emerald-500 to-teal-500' },
  'claude-effect': { icon: Bot, gradient: 'from-amber-500 to-orange-500' },
  forge: { icon: Zap, gradient: 'from-orange-500 to-red-500' },
  monitor: { icon: Activity, gradient: 'from-green-500 to-emerald-500' },
  praxis: { icon: Settings, gradient: 'from-slate-500 to-zinc-500' },
  'command-center': { icon: Shield, gradient: 'from-red-500 to-rose-500' },
  'moltbook-viewer': { icon: Heart, gradient: 'from-pink-500 to-rose-500' },
  iptvviewer: { icon: Tv, gradient: 'from-blue-500 to-cyan-500' },
  accusolar: { icon: Sun, gradient: 'from-yellow-500 to-orange-500' }
}

const HOMEPAGE_PROJECTS = AI_PROJECTS.map(p => ({
  ...p,
  icon: PROJECT_DISPLAY[p.id]?.icon ?? Sparkles,
  gradient: PROJECT_DISPLAY[p.id]?.gradient ?? 'from-slate-500 to-slate-600'
}))

export default function HomePage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const isTestEnv = process.env.NEXT_PUBLIC_ENV === 'test'

  return (
    <main className="min-h-screen">
      {/* Environment Banner */}
      {isTestEnv && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center">
          <span className="text-amber-400 text-sm font-medium">
            🧪 TEST ENVIRONMENT - Data is not production
          </span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Cevict AI</h1>
              <p className="text-xs text-slate-400">Enterprise AI Platform</p>
            </div>
          </div>

          <nav className="flex items-center gap-6">
            <a href="/guardian" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              <Shield className="w-4 h-4" /> Guardian
            </a>
            <a href="/bots" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1">
              <Bot className="w-4 h-4" /> Bots
            </a>
            <a href="/docs" className="text-slate-400 hover:text-white transition-colors text-sm">
              Docs
            </a>
            <a href="/status" className="text-slate-400 hover:text-white transition-colors text-sm">
              Status
            </a>
            <a href="/admin" className="btn-secondary text-sm py-2 px-4">
              Admin
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-2 mb-8">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span className="text-indigo-400 text-sm font-medium">
              {isTestEnv ? 'Test Environment' : 'All Systems Operational'}
            </span>
          </div>

          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-gradient">Unified AI</span>
            <br />
            <span className="text-white">Intelligence Hub</span>
          </h2>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
            Enterprise gateway to all Cevict AI projects. Multi-agent orchestration,
            predictive analytics, and autonomous learning systems.
          </p>

          <div className="flex items-center justify-center gap-4">
            <a href="#projects" className="btn-primary flex items-center gap-2">
              Explore Projects <ArrowRight className="w-5 h-5" />
            </a>
            <a href="/docs" className="btn-secondary flex items-center gap-2">
              Documentation
            </a>
          </div>
        </div>
      </section>

      {/* AI Projects Grid */}
      <section id="projects" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-white mb-4">AI Projects</h3>
            <p className="text-slate-400">Select a project to access its interface</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {HOMEPAGE_PROJECTS.map((project) => {
              const Icon = project.icon
              const isHovered = hoveredCard === project.id
              const url = getProjectUrl(project.id)

              return (
                <a
                  key={project.id}
                  href={url}
                  className={`card-glass p-6 transition-all duration-300 group cursor-pointer
                    ${isHovered ? 'scale-[1.02] glow-indigo' : ''}`}
                  onMouseEnter={() => setHoveredCard(project.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${project.gradient}
                      flex items-center justify-center transition-transform duration-300
                      ${isHovered ? 'scale-110' : ''}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex items-center gap-2">
                      {project.status === 'beta' && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
                          Beta
                        </span>
                      )}
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
                        {project.status === 'live' ? 'Live' : 'Active'}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                    {project.name}
                  </h4>

                  <p className="text-slate-400 text-sm mb-4">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.features.map((feature, i) => (
                      <span key={i} className="text-xs bg-white/5 text-slate-300 px-2 py-1 rounded">
                        {feature}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center text-indigo-400 text-sm font-medium">
                    Launch {project.name}
                    <ChevronRight className={`w-4 h-4 ml-1 transition-transform duration-300
                      ${isHovered ? 'translate-x-1' : ''}`} />
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-white mb-4">Enterprise Grade</h3>
            <p className="text-slate-400">Built for security, compliance, and scale</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'AI Safety 2025', desc: 'Full compliance with EU AI Act and GDPR' },
              { icon: Cpu, title: 'Multi-Agent', desc: 'Orchestrate Claude, GPT-4, Gemini simultaneously' },
              { icon: Database, title: 'Audit Trail', desc: 'Complete logging and explainability' },
              { icon: Zap, title: 'Real-time', desc: 'Live predictions and instant updates' }
            ].map((feature, i) => (
              <div key={i} className="card-glass p-6 text-center">
                <feature.icon className="w-8 h-8 text-indigo-400 mx-auto mb-4" />
                <h4 className="font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-slate-500 text-sm">
            © 2025 Cevict LLC. Powered by Cevict Flex.
          </p>
          <div className="flex items-center gap-4 text-slate-500 text-sm">
            <span>{isTestEnv ? '🧪 Test' : '🚀 Production'}</span>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  )
}

