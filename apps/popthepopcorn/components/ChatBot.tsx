'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatBotProps {
  headlineId?: string
  headlineTitle?: string
}

export default function ChatBot({ headlineId, headlineTitle }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! I'm The Kernel 🍿 - your AI news expert. Ask me anything about the headlines, like 'Is this real?' or 'Why should I care?'",
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          headlineId,
          context: headlineTitle ? `About: ${headlineTitle}` : undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: data.timestamp,
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to get response')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black rounded-full p-5 shadow-2xl shadow-[#FFD700]/50 hover:scale-110 transition-all z-50 cyber-glow"
        aria-label="Open chat"
      >
        <MessageCircle size={28} className="font-black" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border-2 border-[#FFD700] rounded-2xl shadow-2xl flex flex-col z-50 cyber-glow">
      {/* Header - The Kernel */}
      <div className="bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black p-4 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍿</span>
          <div>
            <h3 className="font-black text-lg">The Kernel</h3>
            <p className="text-xs text-black/70 font-semibold">AI News Expert</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-black/20 rounded-lg p-2 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0A0A]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black font-semibold'
                  : 'bg-[#1A1A1A] text-gray-200 border border-[#333]'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader2 className="animate-spin" size={16} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t-2 border-[#333] p-4 bg-[#0A0A0A]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask The Kernel..."
            className="flex-1 px-4 py-3 bg-[#1A1A1A] border-2 border-[#333] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] disabled:opacity-50"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black rounded-xl hover:from-[#FFC700] hover:to-[#FF5B25] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-black transition-all shadow-lg shadow-[#FFD700]/30"
          >
            <Send size={18} />
          </button>
        </div>
        {headlineId && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Context: {headlineTitle || 'Current headline'}
          </p>
        )}
      </div>
    </div>
  )
}
