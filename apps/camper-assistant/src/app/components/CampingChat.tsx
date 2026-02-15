'use client';

import { useState } from 'react';
import { MessageCircle, Send, Backpack, Tent, Moon } from 'lucide-react';

export default function CampingChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I\'m your camping assistant. Ask me anything about camping - from setting up gear to finding the best spots!' }
  ]);
  const [input, setInput] = useState('');

  const suggestions = [
    'How do I start a fire in wet conditions?',
    'What should I pack for cold weather?',
    'Best way to purify water?',
    'How to hang a bear bag?',
    'What to do if I see a bear?',
  ];

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages([...messages, { role: 'user', text: input }]);
    
    // Simulate assistant response
    setTimeout(() => {
      const responses: Record<string, string> = {
        'fire': 'For wet conditions: Use dry tinder (birch bark works great), build a platform to keep wood off wet ground, and use a windbreak. Fatwood or fire starters help too!',
        'pack': 'Cold weather essentials: Layered clothing, 4-season sleeping bag, insulated pad, warm hat/gloves, hand warmers, and a backup stove fuel.',
        'water': 'Purification methods: Boil for 1 minute (3 min at altitude), use filters (0.1 micron), purification tablets, or UV sterilizers. Always have a backup method!',
        'bear': 'Hang food 10 feet high and 4 feet from tree trunk, or use bear canisters. Never store food in your tent!',
        'see': 'Stay calm, speak calmly, don\'t run. Back away slowly. Make yourself look big. If attacked, fight back with any available objects.',
      };
      
      const lower = input.toLowerCase();
      let response = 'That\'s a great camping question! Let me help you with that. Could you provide more details about your specific situation?';
      
      for (const [key, val] of Object.entries(responses)) {
        if (lower.includes(key)) {
          response = val;
          break;
        }
      }
      
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    }, 1000);
    
    setInput('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <MessageCircle className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-semibold">Camping Assistant</h2>
        </div>
        <p className="text-slate-400">Ask me anything about camping, outdoor skills, or wilderness tips.</p>
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setInput(suggestion)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full px-4 py-2 text-sm text-slate-300 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 min-h-[300px] max-h-[400px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block max-w-[80%] rounded-lg p-3 ${
              msg.role === 'user' 
                ? 'bg-purple-500 text-white' 
                : 'bg-slate-700 text-slate-200'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a camping question..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500"
        />
        <button
          onClick={handleSend}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>

      {/* Quick Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <Tent className="w-5 h-5 text-emerald-400 mb-2" />
          <h4 className="font-medium">Tent Setup</h4>
          <p className="text-sm text-slate-400">Always use a footprint. Guy out all lines for stability.</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <Moon className="w-5 h-5 text-amber-400 mb-2" />
          <h4 className="font-medium">Sleep Better</h4>
          <p className="text-sm text-slate-400">Insulated pad R-value 4+ for cold ground. Earplugs help!</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <Backpack className="w-5 h-5 text-blue-400 mb-2" />
          <h4 className="font-medium">Pack Light</h4>
          <p className="text-sm text-slate-400">Merino wool layers. Multi-use items. Leave the cotton home.</p>
        </div>
      </div>
    </div>
  );
}
