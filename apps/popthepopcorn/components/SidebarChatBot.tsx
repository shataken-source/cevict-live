'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface SidebarChatBotProps {
  headlineId?: string
  headlineTitle?: string
  className?: string
}

export default function SidebarChatBot({ headlineId, headlineTitle, className = '' }: SidebarChatBotProps) {
  const [isOpen, setIsOpen] = useState(true) // Always open in sidebar
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! I'm The Kernel 🍿 - your AI news expert. Ask me anything about PopThePopcorn, the headlines, drama scores, or how things work here!",
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
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
        // Add error message to chat
        const errorMessage: Message = {
          role: 'assistant',
          content: `Sorry, I couldn't process that. ${error.message || 'Please try again!'} 🍿`,
          timestamp: new Date().toISOString(),
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      const errorMessage: Message = {
        role: 'assistant',
        content: "Oops! I'm having trouble connecting. Please try again in a moment. 🍿",
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
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

  const quickQuestions = [
    "What is PopThePopcorn?",
    "How does drama scoring work?",
    "What are story arcs?",
    "How do I report fake news?",
  ]

  const handleQuickQuestion = (question: string) => {
    setInput(question)
    // Auto-send after a brief delay
    setTimeout(() => {
      handleSend()
    }, 100)
  }

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border-2 border-[#FFD700] rounded-2xl shadow-2xl ${className}`}>
      {/* Header - The Kernel */}
      <div className="bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black p-4 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-2xl animate-bounce">🍿</span>
            <span className="text-xl animate-bounce" style={{ animationDelay: '0.1s' }}>🍿</span>
          </div>
          <div>
            <h3 className="font-black text-lg">The Kernel</h3>
            <p className="text-xs text-black/70 font-semibold">AI Helper • Ask Anything</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-black/70" />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hover:bg-black/20 rounded-lg p-1.5 transition-colors"
            title={isOpen ? 'Minimize' : 'Expand'}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          {/* Quick Questions */}
          <div className="px-4 pt-3 pb-2 border-b border-[#333]">
            <p className="text-xs text-gray-400 mb-2 font-semibold">Quick Questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(q)}
                  className="px-2 py-1 text-xs bg-[#FFD700] bg-opacity-20 border border-[#FFD700] rounded-lg hover:bg-opacity-30 transition-all text-[#FFD700]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0A0A0A] min-h-0">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black font-semibold'
                      : 'bg-[#1A1A1A] text-gray-200 border border-[#333]'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-xs mt-1.5 opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1A1A1A] border border-[#333] rounded-lg p-3">
                  <Loader2 className="animate-spin text-[#FFD700]" size={16} />
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
                className="flex-1 px-3 py-2.5 bg-[#1A1A1A] border-2 border-[#333] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] disabled:opacity-50 text-sm"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black rounded-xl hover:from-[#FFC700] hover:to-[#FF5B25] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-black transition-all shadow-lg shadow-[#FFD700]/30"
              >
                <Send size={16} />
              </button>
            </div>
            {headlineId && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Context: {headlineTitle || 'Current headline'}
              </p>
            )}
          </div>
        </>
      )}

      {!isOpen && (
        <div className="flex-1 flex items-center justify-center p-4">
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black rounded-lg font-bold hover:from-[#FFC700] hover:to-[#FF5B25] transition-all"
          >
            <MessageCircle size={20} className="inline mr-2" />
            Open Chat
          </button>
        </div>
      )}
    </div>
  )
}
