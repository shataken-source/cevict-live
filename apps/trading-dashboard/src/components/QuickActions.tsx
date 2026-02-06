'use client'

import { useState } from 'react'
import { Play, FolderTree, Terminal, Settings, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

interface QuickAction {
  label: string
  icon: React.ReactNode
  command: string
  description: string
  color: string
}

export default function QuickActions() {
  const [isOpen, setIsOpen] = useState(false)

  const actions: QuickAction[] = [
    {
      label: 'Start Trading',
      icon: <Zap className="w-5 h-5" />,
      command: 'cd apps/alpha-hunter && pnpm run kalshi',
      description: 'Start Kalshi trader',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      label: 'Start Crypto',
      icon: <Zap className="w-5 h-5" />,
      command: 'cd apps/alpha-hunter && pnpm run train',
      description: 'Start crypto trainer',
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: 'Start Local Agent',
      icon: <Play className="w-5 h-5" />,
      command: 'cd apps/local-agent && pnpm dev',
      description: 'Start local agent',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Install Dependencies',
      icon: <FolderTree className="w-5 h-5" />,
      command: 'pnpm install',
      description: 'Install all dependencies',
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Git Status',
      icon: <Terminal className="w-5 h-5" />,
      command: 'git status',
      description: 'Check git status',
      color: 'from-indigo-500 to-blue-500',
    },
  ]

  const executeAction = async (action: QuickAction) => {
    try {
      const response = await fetch('http://localhost:3847/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: action.command,
          cwd: 'C:\\gcc\\cevict-app\\cevict-monorepo',
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert(`✅ ${action.label} executed successfully!`)
      } else {
        alert(`❌ Error: ${result.error || 'Command failed'}`)
      }
    } catch (error: any) {
      alert(`❌ Failed to execute: ${error.message}`)
    }
  }

  return (
    <>
      {/* Quick Actions Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-40 right-6 z-50 p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-2xl hover:shadow-indigo-500/50 transition-all"
        title="Quick Actions"
      >
        <Zap className="w-6 h-6 text-white" />
      </motion.button>

      {/* Quick Actions Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-32 right-6 z-50 bg-gray-900 rounded-xl border border-gray-700 shadow-2xl p-4 w-80"
        >
          <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  executeAction(action)
                  setIsOpen(false)
                }}
                className={`w-full p-3 rounded-lg bg-gradient-to-r ${action.color} hover:opacity-90 transition-opacity text-left`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-white">{action.icon}</div>
                  <div>
                    <div className="text-white font-semibold">{action.label}</div>
                    <div className="text-xs text-white/80">{action.description}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </>
  )
}

