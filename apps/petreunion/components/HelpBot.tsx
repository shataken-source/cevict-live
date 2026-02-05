'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, HelpCircle } from 'lucide-react'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
}

const BOT_RESPONSES: Record<string, string> = {
  'hello': 'Hi! I\'m here to help you use PetReunion 🐾. How can I assist you today?',
  'help': 'I can help you with:\n• Reporting a lost pet\n• Reporting a found pet\n• Searching for pets\n• Troubleshooting form errors\n• Understanding website features\n\nWhat do you need help with?',
  'report lost': 'To report a lost pet:\n1. Click "Report Lost Pet" on the homepage\n2. Fill out the form with:\n   - Pet type (Dog/Cat) - REQUIRED\n   - Color - REQUIRED\n   - Date lost - REQUIRED\n   - Location: "City, State" - REQUIRED\n3. Add photos and description for best results\n4. Submit the form\n\nNeed help with a specific field?',
  'report found': 'To report a found pet:\n1. Click "Report Found Pet" on the homepage\n2. Fill out the form with pet details\n3. Include where and when you found them\n4. Provide your contact information\n5. Submit the form\n\nWe\'ll automatically search for matching lost pet reports!',
  'location format': 'Location should be in "City, State" format:\n✅ "Columbus, Indiana"\n✅ "Columbus, IN"\n✅ "Columbus Indiana"\n❌ "Columbus"\n❌ "Indiana"\n\nAlways include both city and state!',
  'form error': 'Common form errors:\n• Missing required fields (marked with *)\n• Location not in "City, State" format\n• Date in the future or too old\n• Invalid email format\n• Phone number too short/long\n\nCheck the error message for specific details!',
  'search': 'To search for pets:\n1. Click "Search Lost Pets" on the homepage\n2. Use the search bar to search by:\n   - Breed, color, name, city, description\n3. Use filters to narrow results:\n   - Pet type, location, status, date range\n4. Click "View Details" on any pet card\n\nTry broader search terms if you don\'t find results!',
  'required fields': 'Required fields for reporting:\n• Pet Type (Dog or Cat)\n• Color\n• Date Lost/Found\n• Location ("City, State")\n\nAll other fields are optional but helpful!',
}

export default function HelpBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m the PetReunion help bot 🐾. I can help you with reporting pets, searching, and troubleshooting. How can I help you?',
      sender: 'bot',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase().trim()

    // Check for exact matches first
    for (const [key, response] of Object.entries(BOT_RESPONSES)) {
      if (lowerMessage.includes(key)) {
        return response
      }
    }

    // Default responses based on keywords
    if (lowerMessage.includes('lost') || lowerMessage.includes('missing')) {
      return BOT_RESPONSES['report lost']
    }
    if (lowerMessage.includes('found')) {
      return BOT_RESPONSES['report found']
    }
    if (lowerMessage.includes('location') || lowerMessage.includes('city') || lowerMessage.includes('state')) {
      return BOT_RESPONSES['location format']
    }
    if (lowerMessage.includes('error') || lowerMessage.includes('problem') || lowerMessage.includes('trouble')) {
      return BOT_RESPONSES['form error']
    }
    if (lowerMessage.includes('search') || lowerMessage.includes('find')) {
      return BOT_RESPONSES['search']
    }
    if (lowerMessage.includes('required') || lowerMessage.includes('need')) {
      return BOT_RESPONSES['required fields']
    }

    // Default response
    return 'I can help you with reporting lost/found pets, searching, and troubleshooting. Try asking about:\n• "How to report a lost pet"\n• "Location format"\n• "Form errors"\n• "How to search"\n\nWhat do you need help with?'
  }

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')

    // Simulate bot thinking
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(userMessage.text),
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botResponse])
    }, 500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-50"
          aria-label="Open help bot"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              <h3 className="font-semibold">PetReunion Help Bot</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-700 rounded p-1 transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Try: "How to report lost pet", "Location format", "Form errors"
            </p>
          </div>
        </div>
      )}
    </>
  )
}
