'use client'
import React, { useState } from 'react'

export default function CreatePredictionPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type: 'shadow' })
      });
      console.log('Prediction Request Sent');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1e1b4b', padding: '2rem', color: 'white' }}>
      <h1>NEW PREDICTION</h1>
      <input 
        type="text" 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ color: 'black', padding: '1rem', width: '100%', marginBottom: '1rem' }}
      />
      <button 
        onClick={handleCreate}
        disabled={loading}
        style={{ padding: '1rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px' }}
      >
        {loading ? 'Processing...' : 'Launch Shadow Bot'}
      </button>
    </div>
  )
}