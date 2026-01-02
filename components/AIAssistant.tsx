"use client";
import { useState } from "react";

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "👋 Hi! I'm your SmokersRights AI assistant. Ask me about:\n• State smoking laws\n• Product recommendations\n• Legal resources\n• How to fight unfair restrictions" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!input.trim()) return;
    
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

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

    const data = await res.json();
    setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
    setLoading(false);
  }

  return (
    <div style={{maxWidth:"800px",margin:"0 auto",padding:"20px"}}>
      <div style={{border:"1px solid #ddd",borderRadius:"8px",height:"500px",overflow:"auto",padding:"20px",marginBottom:"20px",background:"#f8f9fa"}}>
        {messages.map((m, i) => (
          <div key={i} style={{marginBottom:"20px",display:"flex",gap:"10px"}}>
            <div style={{fontSize:"24px"}}>{m.role === "assistant" ? "🤖" : "👤"}</div>
            <div style={{flex:1,background:m.role === "assistant" ? "#fff" : "#e3f2fd",padding:"15px",borderRadius:"8px",whiteSpace:"pre-wrap"}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{textAlign:"center",color:"#666"}}>Thinking...</div>}
      </div>
      
      <div style={{display:"flex",gap:"10px"}}>
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask about laws, products, or legal help..."
          style={{flex:1,padding:"15px",fontSize:"16px",border:"1px solid #ddd",borderRadius:"6px"}}
        />
        <button 
          onClick={sendMessage}
          disabled={loading}
          style={{background:"#000",color:"#fff",padding:"15px 30px",border:"none",borderRadius:"6px",fontSize:"16px",fontWeight:"bold",cursor:"pointer"}}
        >
          Send
        </button>
      </div>

      <div style={{fontSize:"12px",color:"#666",marginTop:"10px",textAlign:"center"}}>
        AI responses are informational only. Consult a lawyer for legal advice.
      </div>
    </div>
  );
}
