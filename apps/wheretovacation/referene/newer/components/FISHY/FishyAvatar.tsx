'use client'; 
import React, { useState, useEffect } from 'react';

type FishyState = 'Idle' | 'Thinking' | 'Error' | 'Success' | 'Invite';

interface FishyAvatarProps {
  currentState: FishyState;
  message: string;
}

const FishyAvatar: React.FC<FishyAvatarProps> = ({ currentState, message }) => {
  const getAvatarStyle = (state: FishyState) => {
    switch (state) {
      case 'Thinking': return 'bg-yellow-500/90 shadow-xl shadow-yellow-500/30 animate-pulse';
      case 'Error': return 'bg-red-600/90 shadow-2xl shadow-red-600/50 animate-shake';
      case 'Success': return 'bg-green-500/90 shadow-xl shadow-green-500/30 animate-bounce-subtle';
      default: return 'bg-blue-600/90 shadow-lg shadow-blue-600/30';
    }
  };

  const MessageBubble = () => (
    <div 
      className={`absolute right-full mr-4 w-48 p-3 rounded-xl text-sm font-semibold text-white transition-opacity duration-300 ${currentState === 'Idle' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ backgroundColor: '#1E293B', bottom: '50%' }}
    >
      {currentState === 'Thinking' ? 'Analyzing input...' : currentState === 'Error' ? 'Error: Check security boundaries.' : 'Ready to assist.'}
      <div className="absolute right-[-6px] bottom-1/2 w-3 h-3 transform rotate-45 bg-[#1E293B]"></div>
    </div>
  );

  return (
    <div 
      className={`fixed bottom-8 right-8 z-50 transition-all duration-300 ${getAvatarStyle(currentState)}`}
      style={{
        width: '64px', 
        height: '64px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      <MessageBubble />
      <svg viewBox="0 0 100 100" className="w-10 h-10 text-white">
        <path d="M 20 50 C 30 70, 70 70, 80 50 C 70 30, 30 30, 20 50 Z" fill="currentColor" />
        <path d="M 18 50 L 5 40 L 5 60 Z" fill="currentColor" />
        <circle cx="65" cy="45" r="5" fill="#1E293B" />
        <circle cx="66" cy="44" r="1.5" fill="white" />
      </svg>
      <style>{`
        @keyframes shake { 0%, 100% { transform: translate(1px, 1px) rotate(0deg); } 10%, 90% { transform: translate(-2px, -2px) rotate(-1deg); } 20%, 80% { transform: translate(2px, 2px) rotate(1deg); } }
        .animate-shake { animation: shake 0.5s infinite; }
        .animate-pulse { animation: pulse 1.5s infinite; }
        .animate-bounce-subtle { animation: bounce 1s infinite; }
      `}</style>
    </div>
  );
};

export default FishyAvatar;