// components/FishyHelp.jsx
// Friendly fishing-themed help system for all users

import React, { useState, useEffect } from 'react'
import { HelpCircle, X, Fish, Anchor, Info, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const FISHY_TIPS = {
  general: [
    "🎣 Click anywhere that looks clickable - we made buttons big and colorful!",
    "🐟 Lost? The navigation menu at the top will always get you home!",
    "⛵ Having trouble? The help fish (that's me!) is always here in the corner!",
    "🦈 Pro tip: You can always go back using your browser's back button!",
    "🏖️ Take your time - this site works at your own pace!"
  ],
  booking: [
    "🎣 Pick a date first, then choose your captain!",
    "🐠 Green dates are available, red dates are fully booked!",
    "🦐 You only pay a deposit now - pay the rest at the dock!",
    "🐚 Weather looking bad? We'll email you automatically!",
    "⚓ Need to cancel? Do it 24 hours before for a full refund!"
  ],
  profile: [
    "🏆 Earn points by posting your catches!",
    "📸 Add photos to get extra points!",
    "🎖️ Collect badges by being active in the community!",
    "📍 Save your favorite fishing spots with GPS pins!",
    "👥 Set your location to 'Friends' to share with buddies only!"
  ],
  weather: [
    "🌊 Red alerts mean stay home - safety first!",
    "⛈️ Yellow means be careful - experienced anglers only!",
    "☀️ Green means perfect fishing weather!",
    "📧 We'll email you if weather turns bad for your trip!",
    "🌡️ Water temp affects what fish are biting!"
  ]
}

const HELP_VIDEOS = {
  booking: "https://youtube.com/watch?v=demo-booking",
  profile: "https://youtube.com/watch?v=demo-profile",
  posting: "https://youtube.com/watch?v=demo-posting"
}

export default function FishyHelp({ 
  page = 'general',
  title = "Need Help?",
  content = null,
  position = 'bottom-right',
  autoShow = false,
  showOnFirstVisit = true
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTip, setCurrentTip] = useState(0)
  const [hasVisited, setHasVisited] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    // Check if first visit
    const visited = localStorage.getItem('fishy-help-visited')
    if (!visited && showOnFirstVisit) {
      setShowWelcome(true)
      setTimeout(() => setIsOpen(true), 1000)
      localStorage.setItem('fishy-help-visited', 'true')
    }
    
    if (autoShow && !visited) {
      setIsOpen(true)
    }
  }, [])

  const tips = FISHY_TIPS[page] || FISHY_TIPS.general

  const nextTip = () => {
    setCurrentTip((prev) => (prev + 1) % tips.length)
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right': return 'top-4 right-4'
      case 'top-left': return 'top-4 left-4'
      case 'bottom-left': return 'bottom-4 left-4'
      default: return 'bottom-4 right-4'
    }
  }

  return (
    <>
      {/* Welcome Message for First-Time Users */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowWelcome(false)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="bg-white rounded-2xl p-8 max-w-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                  <Fish className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Welcome to Gulf Coast Charters! 🎣
                </h2>
                <p className="text-gray-600 mb-6">
                  I'm Finley, your fishing guide! I'll help you navigate the site. 
                  Look for me in the corner - I'm always here to help!
                </p>
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    Quick Tips to Get Started:
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1 text-left">
                    <li>• Click the big blue buttons to do things</li>
                    <li>• Red means stop/danger, Green means go/good</li>
                    <li>• Icons (little pictures) show what things do</li>
                    <li>• Take your time - nothing will time out!</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowWelcome(false)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Let's Go Fishing! 🐟
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fishy Help Button */}
      <div className={`fixed ${getPositionClasses()} z-40`}>
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(true)}
              className="group relative"
            >
              <div className="relative">
                {/* Animated ring effect */}
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-25" />
                
                {/* Main button */}
                <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-lg hover:shadow-xl transition-shadow">
                  <Fish className="w-8 h-8 text-white" />
                </div>
                
                {/* Bubble effect on hover */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Click me for help! 🐟
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Help Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="absolute bottom-0 right-0 w-96 bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-white">
                    <Fish className="w-6 h-6 mr-2" />
                    <h3 className="font-bold text-lg">Finley's Fishing Help</h3>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                {content ? (
                  <div className="text-gray-700">{content}</div>
                ) : (
                  <>
                    {/* Current Page Help */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <Anchor className="w-4 h-4 mr-2 text-blue-600" />
                        {title}
                      </h4>
                      
                      {/* Tip Carousel */}
                      <div className="bg-blue-50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-900">
                          {tips[currentTip]}
                        </p>
                        <button
                          onClick={nextTip}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center"
                        >
                          Next tip <ChevronRight size={14} className="ml-1" />
                        </button>
                      </div>
                    </div>

                    {/* Common Actions */}
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-800 text-sm">Quick Actions:</h5>
                      
                      <HelpButton
                        icon="🏠"
                        label="Go Home"
                        onClick={() => window.location.href = '/'}
                      />
                      
                      <HelpButton
                        icon="📅"
                        label="Book a Trip"
                        onClick={() => window.location.href = '/book'}
                      />
                      
                      <HelpButton
                        icon="🌊"
                        label="Check Weather"
                        onClick={() => window.location.href = '/weather'}
                      />
                      
                      <HelpButton
                        icon="👤"
                        label="My Profile"
                        onClick={() => window.location.href = '/profile'}
                      />
                      
                      <HelpButton
                        icon="📞"
                        label="Contact Support"
                        onClick={() => window.location.href = '/contact'}
                      />
                    </div>

                    {/* Accessibility Options */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h5 className="font-medium text-gray-800 text-sm mb-2">
                        Make it easier to read:
                      </h5>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => adjustFontSize('increase')}
                          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                        >
                          A+ Bigger
                        </button>
                        <button
                          onClick={() => adjustFontSize('decrease')}
                          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                        >
                          A- Smaller
                        </button>
                        <button
                          onClick={() => toggleHighContrast()}
                          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
                        >
                          🎨 High Contrast
                        </button>
                      </div>
                    </div>

                    {/* Emergency Help */}
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-900 mb-1">
                        Need immediate help?
                      </p>
                      <a
                        href="tel:1-800-FISHING"
                        className="text-sm text-red-700 underline hover:text-red-800"
                      >
                        📞 Call 1-800-FISHING
                      </a>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => openVideoTutorial()}
                  className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  🎬 Watch Video Tutorial
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

// Helper button component
function HelpButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
    >
      <span className="text-xl mr-3">{icon}</span>
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  )
}

// Utility functions
function adjustFontSize(action) {
  const root = document.documentElement
  const currentSize = parseFloat(getComputedStyle(root).fontSize)
  
  if (action === 'increase' && currentSize < 24) {
    root.style.fontSize = `${currentSize + 2}px`
  } else if (action === 'decrease' && currentSize > 12) {
    root.style.fontSize = `${currentSize - 2}px`
  }
  
  localStorage.setItem('preferred-font-size', root.style.fontSize)
}

function toggleHighContrast() {
  document.body.classList.toggle('high-contrast')
  const isHighContrast = document.body.classList.contains('high-contrast')
  localStorage.setItem('high-contrast', isHighContrast)
}

function openVideoTutorial() {
  // Open video tutorial in new tab
  window.open(HELP_VIDEOS.booking, '_blank')
}

// Add this CSS to your global styles for high contrast mode
const highContrastStyles = `
  .high-contrast {
    filter: contrast(1.2);
  }
  
  .high-contrast * {
    border-width: 2px !important;
  }
  
  .high-contrast button {
    font-weight: bold !important;
  }
`
