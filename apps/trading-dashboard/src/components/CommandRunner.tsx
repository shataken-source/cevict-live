'use client'

import { useState, useRef, useEffect } from 'react'
import { Terminal, FolderOpen, Play, X, Folder } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CommandResult {
  command: string
  output: string
  error?: string
  cwd: string
  timestamp: Date
}

export default function CommandRunner() {
  const [isOpen, setIsOpen] = useState(false)
  const [command, setCommand] = useState('')
  const [cwd, setCwd] = useState('C:\\gcc\\cevict-app\\cevict-monorepo')
  const [history, setHistory] = useState<CommandResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentFolder, setCurrentFolder] = useState(cwd)
  const inputRef = useRef<HTMLInputElement>(null)

  const executeCommand = async () => {
    if (!command.trim() || isRunning) return

    const cmd = command.trim()
    setCommand('')
    setIsRunning(true)

    try {
      const response = await fetch('http://localhost:3847/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          cwd: currentFolder,
        }),
      })

      const result = await response.json()
      
      setHistory(prev => [{
        command: cmd,
        output: result.stdout || '',
        error: result.stderr || result.error,
        cwd: currentFolder,
        timestamp: new Date(),
      }, ...prev].slice(0, 50)) // Keep last 50 commands
    } catch (error: any) {
      setHistory(prev => [{
        command: cmd,
        output: '',
        error: error.message || 'Failed to execute command',
        cwd: currentFolder,
        timestamp: new Date(),
      }, ...prev].slice(0, 50))
    } finally {
      setIsRunning(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      executeCommand()
    }
  }

  const quickCommands = [
    { label: 'pnpm install', cmd: 'pnpm install', icon: '📦' },
    { label: 'pnpm dev', cmd: 'pnpm dev', icon: '🚀' },
    { label: 'git status', cmd: 'git status', icon: '📊' },
    { label: 'git pull', cmd: 'git pull', icon: '⬇️' },
    { label: 'ls', cmd: 'ls', icon: '📁' },
    { label: 'pwd', cmd: 'pwd', icon: '📍' },
  ]

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all"
        title="Open Command Runner"
      >
        <Terminal className="w-6 h-6 text-white" />
      </motion.button>

      {/* Command Runner Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <Terminal className="w-6 h-6 text-blue-400" />
                  <div>
                    <h2 className="text-xl font-bold text-white">Command Runner</h2>
                    <p className="text-sm text-gray-400">Execute commands from GUI</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Current Directory */}
              <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Folder className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Current Directory:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentFolder}
                    onChange={(e) => setCurrentFolder(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="C:\\gcc\\cevict-app\\cevict-monorepo"
                  />
                  <button
                    onClick={() => setCurrentFolder('C:\\gcc\\cevict-app\\cevict-monorepo')}
                    className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm text-blue-400 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Quick Commands */}
              <div className="p-4 border-b border-gray-700">
                <p className="text-xs text-gray-400 mb-2">Quick Commands:</p>
                <div className="flex flex-wrap gap-2">
                  {quickCommands.map((qc) => (
                    <button
                      key={qc.label}
                      onClick={() => {
                        setCommand(qc.cmd)
                        inputRef.current?.focus()
                      }}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors flex items-center gap-2"
                    >
                      <span>{qc.icon}</span>
                      <span>{qc.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Command Input */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-mono">$</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isRunning}
                    className="flex-1 bg-transparent text-white font-mono focus:outline-none disabled:opacity-50"
                    placeholder="Enter command..."
                    autoFocus
                  />
                  <button
                    onClick={executeCommand}
                    disabled={!command.trim() || isRunning}
                    className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <Play className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Output */}
              <div className="flex-1 overflow-auto p-4 bg-gray-950 font-mono text-sm">
                {history.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Terminal className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No commands executed yet</p>
                    <p className="text-xs mt-1">Type a command above to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((result, index) => (
                      <div key={index} className="border-l-2 border-gray-700 pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-green-400">$</span>
                          <span className="text-blue-400">{result.command}</span>
                          <span className="text-xs text-gray-500">
                            ({result.cwd})
                          </span>
                        </div>
                        {result.output && (
                          <pre className="text-gray-300 whitespace-pre-wrap mb-1">
                            {result.output}
                          </pre>
                        )}
                        {result.error && (
                          <pre className="text-red-400 whitespace-pre-wrap">
                            {result.error}
                          </pre>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {result.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {isRunning && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    <span>Executing...</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

