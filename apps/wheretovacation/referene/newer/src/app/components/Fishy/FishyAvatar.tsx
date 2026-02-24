'use client';
import React, { useState } from 'react';

export default function FishyAvatar() {
  const [isOpen, setIsOpen] = useState(true);
  const [msg, setMsg] = useState('Ready for the Red Marker test, Captain.');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const askFishy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input || loading) return;
    setLoading(true);
    setMsg('Thinking...');
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      setMsg(data.reply);
    } catch (err) {
      setMsg('Connection error to Brain.');
    }
    setLoading(false);
    setInput('');
  };

  return (
    <div className='fixed bottom-8 right-8 z-50 flex flex-col items-end'>
      {isOpen && (
        <div className='mb-4 mr-2 w-80 bg-gray-900 border border-blue-500 rounded-xl shadow-2xl overflow-hidden'>
          <div className='bg-blue-900 p-3 font-bold text-white flex justify-between'>
            <span>AI First Mate</span>
            <button onClick={() => setIsOpen(false)}>X</button>
          </div>
          <div className='p-4 text-sm text-gray-200 bg-gray-800 h-32 overflow-y-auto'>
            {msg}
          </div>
          <form onSubmit={askFishy} className='p-2 bg-gray-900 border-t border-gray-700 flex'>
            <input 
              className='flex-1 bg-gray-800 text-white text-sm p-2 rounded' 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ask about Red Markers...'
              disabled={loading}
            />
            <button type='submit' className='ml-2 text-blue-400' disabled={loading}>SEND</button>
          </form>
        </div>
      )}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className='w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-500 transition-all'
      >
        <span style={{fontSize: '30px'}}>??</span>
      </div>
    </div>
  );
}
