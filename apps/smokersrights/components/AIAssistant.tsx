"use client";
import { useState } from "react";

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "👋 Hi! I'm your SmokersRights AI assistant. Ask me about:\n• State tobacco, hemp & marijuana laws\n• CBD, delta-8, delta-9 regulations\n• Vaping, edibles & gummies laws\n• Product recommendations\n• Legal resources & advocacy" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          systemPrompt: `You are a SmokersRights AI assistant. Help users with:
- State/local smoking laws and regulations
- Product recommendations (CBD, vaping, hemp, accessories)
- Legal resources and advocacy
- How to fight smoking bans

Be helpful, accurate, and always remind users to check local laws.
For products, recommend from our affiliate marketplace.
Never provide medical advice - suggest consulting a doctor.
Always verify age (21+) for product recommendations.`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      } else {
        // Fallback response when API is not available
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "I'm currently in demo mode. To get full AI responses, please connect an AI service like OpenAI or Anthropic.\n\nIn the meantime, you can:\n• Browse our state law guides\n• Check the legislation tracker\n• Find nearby smoking-friendly places"
        }]);
      }
    } catch {
      // Fallback response when API is not available
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm currently in demo mode. To get full AI responses, please connect an AI service like OpenAI or Anthropic.\n\nIn the meantime, you can:\n• Browse our state law guides\n• Check the legislation tracker\n• Find nearby smoking-friendly places"
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-5">
      <div className="border border-gray-200 rounded-lg h-[500px] overflow-auto p-5 mb-5 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className="mb-5 flex gap-3">
            <div className="text-2xl">{m.role === "assistant" ? "🤖" : "👤"}</div>
            <div className={`flex-1 p-4 rounded-lg whitespace-pre-wrap ${m.role === "assistant" ? "bg-white" : "bg-blue-100"}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-center text-gray-500">Thinking...</div>}
      </div>

      <div className="flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask about laws, products, or legal help..."
          className="flex-1 p-4 text-base border border-gray-200 rounded-lg"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-black text-white px-8 py-4 rounded-lg text-base font-bold disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <div className="text-xs text-gray-500 mt-3 text-center">
        AI responses are informational only. Consult a lawyer for legal advice.
      </div>
    </div>
  );
}
