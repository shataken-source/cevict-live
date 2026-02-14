'use client';

import React, { useEffect, useState } from 'react';
import { Heart, Share2, DollarSign, Home, PartyPopper, Sparkles } from 'lucide-react';
import Link from 'next/link';

/**
 * PET FOUND SUCCESS PAGE
 * 
 * Celebration component shown when a pet is marked as found.
 * Includes:
 * - Celebration animation
 * - Success message with pet name
 * - Gentle donation prompt
 * - Share buttons
 */

interface PetFoundSuccessProps {
  petName: string;
  petType: string;
  photoUrl?: string;
  daysLost?: number;
  onClose?: () => void;
}

export default function PetFoundSuccess({
  petName,
  petType,
  photoUrl,
  daysLost,
  onClose
}: PetFoundSuccessProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [showDonationPrompt, setShowDonationPrompt] = useState(false);

  useEffect(() => {
    // Show confetti for 3 seconds, then fade to donation prompt
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
      setShowDonationPrompt(true);
    }, 4000);

    return () => clearTimeout(confettiTimer);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-500 via-teal-500 to-blue-500 flex items-center justify-center z-50 p-4 overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa', '#fb7185'][Math.floor(Math.random() * 6)],
                  transform: `rotate(${Math.random() * 360}deg)`
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden transform transition-all duration-500">
        {/* Header with Pet Photo */}
        <div className="relative bg-gradient-to-r from-green-400 to-teal-500 p-8 text-center">
          <div className="absolute top-4 left-4">
            <PartyPopper className="w-8 h-8 text-white/80 animate-bounce" />
          </div>
          <div className="absolute top-4 right-4">
            <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
          </div>

          {photoUrl ? (
            <div className="relative inline-block">
              <img
                src={photoUrl}
                alt={petName}
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 border-2 border-white">
                <Home className="w-6 h-6 text-white" />
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-white/20 text-6xl">
              {petType === 'dog' ? '🐕' : petType === 'cat' ? '🐈' : '🐾'}
            </div>
          )}

          <h1 className="text-3xl font-bold text-white mt-4">
            {petName} is HOME! 🎉
          </h1>
          <p className="text-white/90 mt-2">
            {daysLost && daysLost > 0 
              ? `After ${daysLost} day${daysLost > 1 ? 's' : ''}, ${petName} is safely back with their family.`
              : `${petName} has been reunited with their family!`
            }
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {showDonationPrompt ? (
            <>
              {/* Donation Prompt */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 mb-6 border border-pink-100">
                <div className="flex items-start gap-4">
                  <div className="bg-pink-100 rounded-full p-3 shrink-0">
                    <Heart className="w-6 h-6 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg mb-2">
                      We are so happy {petName} is home! 💕
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      If PetReunion helped you today, please consider a small donation to help us 
                      bring the next pet home. <strong>Your support keeps this service free for everyone.</strong>
                    </p>
                  </div>
                </div>

                {/* Donation Amounts */}
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[5, 10, 25, 50].map((amount) => (
                    <a
                      key={amount}
                      href={`https://gofundme.com/f/petreunion?amount=${amount}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 text-center bg-white border-2 border-pink-200 rounded-lg text-pink-600 font-semibold hover:bg-pink-50 hover:border-pink-400 transition-colors"
                    >
                      ${amount}
                    </a>
                  ))}
                </div>

                <a
                  href="https://gofundme.com/f/petreunion"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg"
                >
                  <DollarSign className="w-5 h-5" />
                  Donate Now
                </a>

                <p className="text-center text-xs text-gray-400 mt-3">
                  100% of donations go directly to keeping PetReunion free
                </p>
              </div>

              {/* Share Success */}
              <div className="text-center mb-4">
                <p className="text-gray-600 text-sm mb-3">Share {petName}&apos;s happy ending!</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      const text = `Great news! ${petName} has been found and is safely home thanks to @PetReunion! 🎉🐾 #PetReunion #LostPetFound`;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="p-3 bg-[#1DA1F2] text-white rounded-full hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const text = `Great news! ${petName} has been found and is safely home thanks to PetReunion! 🎉🐾`;
                      window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="p-3 bg-[#4267B2] text-white rounded-full hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied!');
                    }}
                    className="p-3 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Initial Celebration */
            <div className="text-center py-8">
              <div className="text-6xl animate-bounce mb-4">🎊</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Celebration Time!
              </h2>
              <p className="text-gray-600">
                This is the moment we all work for...
              </p>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-center gap-3">
            <Link
              href="/petreunion"
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Return Home
            </Link>
            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
}

