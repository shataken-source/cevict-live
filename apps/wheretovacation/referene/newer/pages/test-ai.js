import React, { useState } from 'react';
// import { getAgent } from '@ai-engine/core'; // Disabled - package not available

export default function Page() {
  const [agent, setAgent] = useState('System Offline');
  const [msg, setMsg] = useState('Waiting for neural input...');

  const load = (id) => {
    try {
      // const a = getAgent(id); // Disabled - package not available
      setAgent(id === 'FISHY' ? 'Fishy' : 'Finn');
      setMsg('AI engine package not available. Please install @ai-engine/core to use this feature.');
    } catch(e) { setMsg(e.message); }
  };

  return (
    <div style={{padding:'50px', fontFamily:'sans-serif'}}>
      <h1>?? Neural Link: <span style={{color:'green'}}>ONLINE</span></h1>
      <button onClick={() => load('FISHY')} style={{padding:'10px', marginRight:'10px'}}>Call Fishy ??</button>
      <button onClick={() => load('FINN')} style={{padding:'10px'}}>Call Finn ??</button>
      <div style={{marginTop:'20px', padding:'20px', background:'#f0f0f0', borderRadius:'8px'}}>
        <h2>{agent}</h2>
        <p>{msg}</p>
      </div>
    </div>
  );
}

// Force server-side rendering to avoid static prerender issues in build
export async function getServerSideProps() {
  return { props: {} };
}
