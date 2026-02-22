'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Zap, Sun, Battery } from 'lucide-react';
import { useSolar, SYSTEM_CONFIG } from '../context/SolarContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Built-in knowledge base for solar setup assistance
function getLocalAnswer(question: string, systemContext: string): string | null {
  const q = question.toLowerCase();

  if (q.includes('tilt') || q.includes('angle') || q.includes('panel angle')) {
    return `**Optimal Panel Tilt by Season:**

For maximum annual production, set your panels at your **latitude angle** (typically 30–45° in the continental US).

- **Summer:** Reduce tilt by 15° (flatter = more perpendicular to high sun)
- **Winter:** Increase tilt by 15° (steeper = better angle for low sun)
- **Year-round fixed:** Use your latitude angle

Your 8× 300W panels in 4S2P wiring means each string sees ~72–80V open circuit. At your latitude, a fixed tilt of **35–40°** facing true south is a solid year-round compromise.

**Rule of thumb:** Every 10° off optimal costs ~5% production.`;
  }

  if (q.includes('wiring') || q.includes('series') || q.includes('parallel') || q.includes('4s2p')) {
    return `**Your 4S2P Wiring Explained:**

You have 4 strings of 2 panels each:
- Each string: 2 panels in **series** → doubles voltage (~72V open circuit for 36V panels)
- 4 strings in **parallel** → multiplies current (4× panel Isc)

**Why this works for your AmpinVT 150/80:**
- Max input: 150V → your ~72V string voltage has a safe 2× margin ✅
- Max charge current: 80A → 4 parallel strings provide ample current ✅
- Peak input power: 2,400W → controller handles it at 80A × 30V battery ✅

**Important:** Never exceed 150V input. In cold weather, open-circuit voltage rises ~0.3%/°C below 25°C. At -20°C that's +13.5% → ~82V per string. Still safe.`;
  }

  if (q.includes('battery') || q.includes('ecoworthy') || q.includes('280ah') || q.includes('lifepo4')) {
    return `**Your Battery Bank (8× EcoWorthy 280Ah 12V):**

Total capacity: **2,240Ah @ 12V = 26.88 kWh**
Usable (80% DoD): **~21.5 kWh**

**Charging recommendations:**
- Bulk charge to 14.4V (absorb)
- Float at 13.6V
- Never discharge below 11.8V (≈10% SoC)
- Ideal storage SoC: 50–80%

**Wiring your 8 batteries:**
- For 12V system: all 8 in parallel → 2,240Ah @ 12V
- For 24V system: 4S2P → 1,120Ah @ 24V (better efficiency for high loads)
- For 48V system: 8S → 280Ah @ 48V (best for inverter efficiency)

**Your AmpinVT 150/80 is a 12V controller** — keep batteries at 12V nominal.`;
  }

  if (q.includes('production') || q.includes('how much') || q.includes('generate') || q.includes('kwh')) {
    return `**Expected Daily Production from Your 2,400W System:**

Production depends heavily on your location's **Peak Sun Hours (PSH)**:

| Location | PSH | Daily kWh | Annual kWh |
|----------|-----|-----------|------------|
| Phoenix, AZ | 6.5 | 15.6 kWh | 5,694 kWh |
| Denver, CO | 5.5 | 13.2 kWh | 4,818 kWh |
| Dallas, TX | 5.2 | 12.5 kWh | 4,562 kWh |
| Chicago, IL | 4.5 | 10.8 kWh | 3,942 kWh |
| Seattle, WA | 3.5 | 8.4 kWh | 3,066 kWh |

**Formula:** 2.4 kW × PSH × 0.85 (system efficiency) = daily kWh

Your 26.88 kWh battery bank can store **2–3 days** of average production.`;
  }

  if (q.includes('ampinvt') || q.includes('charge controller') || q.includes('mppt')) {
    return `**AmpinVT 150/80 MPPT Charge Controller:**

**Specs:**
- Max PV input: 150V, 2,400W
- Max charge current: 80A
- Battery voltage: 12V/24V/36V/48V auto-detect
- MPPT efficiency: >99%

**Charging stages:**
1. **Bulk:** Charges at max current until battery reaches absorb voltage
2. **Absorption:** Holds at absorb voltage, current tapers
3. **Float:** Maintains full charge at lower voltage

**ESPHome/MQTT integration:**
Your controller exposes data via ESPHome on topics like:
\`ampinvt/sensor/solar_power/state\`
\`ampinvt/sensor/battery_soc/state\`

Set your MQTT broker address in the Controls tab to connect live data.`;
  }

  if (q.includes('shadow') || q.includes('shade') || q.includes('shading')) {
    return `**Shading & Your 4S2P Array:**

Shading is the #1 cause of underperformance. With series wiring, **one shaded cell can reduce an entire string's output by 50–80%**.

**Mitigation strategies:**
1. **Bypass diodes** (built into most panels) — limit damage to one panel
2. **Micro-inverters or power optimizers** — per-panel MPPT, best for partial shade
3. **Avoid shading entirely** — even a chimney shadow at 3pm matters

**For your 4S2P setup:**
- Each string of 2 panels is independent
- Shade on 1 panel affects only that string (25% of your array)
- Much better than a single 8S string where shade kills everything

**Rule:** No shade on panels from 9am–3pm solar time.`;
  }

  return null;
}

export default function AITab() {
  const { data } = useSolar();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your solar setup assistant. I know your system:

**${SYSTEM_CONFIG.panelCount}× ${SYSTEM_CONFIG.panelWatts}W panels** (${SYSTEM_CONFIG.panelWiring} wiring) → **${SYSTEM_CONFIG.peakWatts}W peak**
**${SYSTEM_CONFIG.batteryCount}× ${SYSTEM_CONFIG.batteryAh}Ah 12V batteries** → **${SYSTEM_CONFIG.totalKwh.toFixed(1)} kWh total**
**${SYSTEM_CONFIG.controller}** charge controller

Ask me about panel tilt angles by season, wiring configurations, battery care, expected production, shading, or anything else about maximizing your solar output.`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const systemContext = `System: ${SYSTEM_CONFIG.panelCount}× ${SYSTEM_CONFIG.panelWatts}W panels, ${SYSTEM_CONFIG.panelWiring}, ${SYSTEM_CONFIG.batteryCount}× ${SYSTEM_CONFIG.batteryAh}Ah 12V, ${SYSTEM_CONFIG.controller}. Current: ${data.solarPowerW}W solar, ${Math.round(data.batterySoc)}% battery.`;

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    // Try local knowledge base first
    const localAnswer = getLocalAnswer(userMsg, systemContext);
    if (localAnswer) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: localAnswer }]);
        setLoading(false);
      }, 400);
      return;
    }

    // Try OpenAI API if key is configured
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_KEY;
    if (apiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: `You are a solar energy expert assistant. ${systemContext} Help users maximize solar production, optimize panel placement, configure their system, and troubleshoot issues. Be concise and practical.` },
              ...messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: userMsg },
            ],
            max_tokens: 500,
          }),
        });
        const d = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: d.choices[0].message.content }]);
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: "I couldn't reach the AI service. Try asking about panel tilt, wiring, battery care, or expected production — I have built-in answers for those topics." }]);
      }
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I don't have a built-in answer for that specific question. For AI-powered responses, add `NEXT_PUBLIC_OPENAI_KEY` to your `.env.local` file.\n\nI can answer questions about: **panel tilt angles**, **wiring configurations**, **battery care**, **expected production**, **shading**, and **your AmpinVT controller**."
      }]);
    }
    setLoading(false);
  };

  const quickQuestions = [
    'What tilt angle should I use in winter?',
    'Explain my 4S2P wiring',
    'How do I care for my batteries?',
    'How much will I generate daily?',
    'How does shading affect my array?',
  ];

  // Simple markdown-like renderer
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-white mt-2">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-4 text-slate-300">{line.slice(2)}</li>;
      }
      if (line.startsWith('#')) {
        return <p key={i} className="font-bold text-emerald-400 mt-2">{line.replace(/^#+\s/, '')}</p>;
      }
      if (line === '') return <br key={i} />;
      // Bold inline
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-slate-300">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : p)}
        </p>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* System context bar */}
      <div className="panel flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="text-slate-400">Solar:</span>
          <span className="font-semibold text-amber-400">{(data.solarPowerW / 1000).toFixed(2)} kW</span>
        </div>
        <div className="flex items-center gap-2">
          <Battery className="w-4 h-4 text-blue-400" />
          <span className="text-slate-400">Battery:</span>
          <span className="font-semibold text-blue-400">{Math.round(data.batterySoc)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-slate-400">Load:</span>
          <span className="font-semibold text-purple-400">{(data.loadPowerW / 1000).toFixed(2)} kW</span>
        </div>
        <div className="ml-auto text-xs text-slate-500">
          {process.env.NEXT_PUBLIC_OPENAI_KEY ? '🟢 AI Enhanced' : '🟡 Built-in Knowledge'}
        </div>
      </div>

      {/* Chat window */}
      <div className="panel">
        <div className="panelTitleRow">
          <Bot className="w-4 h-4 text-emerald-400" />
          <span className="panelTitle">Solar Setup Assistant</span>
        </div>

        <div className="h-96 overflow-y-auto space-y-3 mb-4 pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-emerald-900/50 border border-emerald-700/50 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-900/40 border border-blue-700/40 text-blue-100'
                  : 'bg-slate-800 border border-slate-700'
              }`}>
                {renderContent(msg.content)}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-blue-900/50 border border-blue-700/50 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-900/50 border border-emerald-700/50 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick questions */}
        <div className="flex flex-wrap gap-2 mb-3">
          {quickQuestions.map(q => (
            <button key={q} onClick={() => { setInput(q); }}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition-colors">
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about panel tilt, wiring, battery care, production estimates..."
            className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button onClick={sendMessage} disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 rounded-xl transition-colors"
            title="Send message">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
