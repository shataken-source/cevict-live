'use client';

import React, { useState } from 'react';

/**
 * POSTER DOWNLOAD BUTTON
 * 
 * A button component that generates and downloads a QR poster for a lost pet.
 * Features:
 * - One-click poster generation
 * - Loading state with spinner
 * - Options for reward/phone inclusion
 * - Color scheme selection
 */

interface PosterDownloadButtonProps {
  petId: number;
  petName?: string;
  includeReward?: boolean;
  includePhone?: boolean;
  colorScheme?: 'urgent' | 'hopeful' | 'neutral';
  className?: string;
  style?: React.CSSProperties;
}

export default function PosterDownloadButton({
  petId,
  petName,
  includeReward = true,
  includePhone = false,
  colorScheme = 'urgent',
  className,
  style
}: PosterDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Local state for options
  const [options, setOptions] = useState({
    includeReward,
    includePhone,
    colorScheme
  });
  
  async function handleDownload() {
    setLoading(true);
    
    try {
      // Build query params
      const params = new URLSearchParams({
        petId: petId.toString(),
        reward: options.includeReward.toString(),
        phone: options.includePhone.toString(),
        color: options.colorScheme
      });
      
      // Fetch the PDF
      const response = await fetch(`/api/petreunion/generate-poster?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate poster');
      }
      
      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lost-${petName?.toLowerCase().replace(/\s+/g, '-') || 'pet'}-poster.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowOptions(false);
    } catch (error) {
      console.error('Poster download error:', error);
      alert('Failed to generate poster. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: loading ? '#9CA3AF' : '#DC2626',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1rem',
    border: 'none',
    borderRadius: '8px',
    cursor: loading ? 'wait' : 'pointer',
    transition: 'background 0.2s',
    ...style
  };
  
  const optionsStyle: React.CSSProperties = {
    marginTop: '12px',
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  };
  
  return (
    <div className={className}>
      {/* Main Download Button */}
      <button
        onClick={() => showOptions ? handleDownload() : setShowOptions(true)}
        disabled={loading}
        style={buttonStyle}
        onMouseEnter={e => !loading && (e.currentTarget.style.background = '#B91C1C')}
        onMouseLeave={e => !loading && (e.currentTarget.style.background = '#DC2626')}
      >
        {loading ? (
          <>
            <svg 
              style={{ animation: 'spin 1s linear infinite', width: '20px', height: '20px' }}
              viewBox="0 0 24 24"
            >
              <circle 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="4" 
                fill="none" 
                opacity="0.25"
              />
              <path 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Generating...</span>
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v8m0 0l4-4m-4 4l-4-4"/>
              <path d="M20 21H4a2 2 0 01-2-2V5a2 2 0 012-2"/>
              <path d="M14 21v-4a2 2 0 00-4 0v4"/>
            </svg>
            <span>{showOptions ? 'Download Poster' : '📄 Download PDF Poster'}</span>
          </>
        )}
      </button>
      
      {/* Options Panel */}
      {showOptions && !loading && (
        <div style={optionsStyle}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={options.includeReward}
                onChange={e => setOptions({...options, includeReward: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              <span>Include reward amount on poster</span>
            </label>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={options.includePhone}
                onChange={e => setOptions({...options, includePhone: e.target.checked})}
                style={{ width: '18px', height: '18px' }}
              />
              <span>Include contact phone number</span>
            </label>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Poster Style:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['urgent', 'hopeful', 'neutral'] as const).map(scheme => (
                <button
                  key={scheme}
                  onClick={() => setOptions({...options, colorScheme: scheme})}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: options.colorScheme === scheme ? '2px solid #1f2937' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: options.colorScheme === scheme ? '#f3f4f6' : 'white',
                    cursor: 'pointer',
                    fontWeight: options.colorScheme === scheme ? 'bold' : 'normal'
                  }}
                >
                  {scheme === 'urgent' && '🔴 Urgent'}
                  {scheme === 'hopeful' && '🟢 Hopeful'}
                  {scheme === 'neutral' && '⚪ Neutral'}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowOptions(false)}
              style={{
                flex: 1,
                padding: '10px',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              style={{
                flex: 2,
                padding: '10px',
                background: '#DC2626',
                color: 'white',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Generate & Download
            </button>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

