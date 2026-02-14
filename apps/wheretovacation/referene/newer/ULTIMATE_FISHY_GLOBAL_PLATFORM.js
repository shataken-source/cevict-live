// pages/index.js - 🎣 ULTIMATE FISHY GLOBAL COMMUNITY PLATFORM 🎣
// Charter Booking + Worldwide Fishing Community (Gulf Coast Charters Only)

import React, { useState, useEffect } from 'react'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [globalStats, setGlobalStats] = useState({
    totalMembers: 15234,
    onlineNow: 892,
    countriesActive: 47,
    fishCaughtToday: 3421
  })

  useEffect(() => {
    // Check user status
    const checkUser = () => {
      const user = localStorage.getItem('user')
      if (user) {
        try {
          const userData = JSON.parse(user)
          setIsLoggedIn(true)
          setUserType(userData.type || 'angler')
        } catch (e) {
          console.log('User check error:', e)
        }
      }
    }
    checkUser()

    // Simulate live community stats
    const interval = setInterval(() => {
      setGlobalStats(prev => ({
        ...prev,
        onlineNow: prev.onlineNow + Math.floor(Math.random() * 10 - 5),
        fishCaughtToday: prev.fishCaughtToday + Math.floor(Math.random() * 5)
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #0c4a6e, #0e7490, #06b6d4)' }}>
      {/* 🎣 ULTIMATE NAVIGATION HEADER - THE CATCH OF THE DAY! 🎣 */}
      <FishyNavigationHeader 
        isLoggedIn={isLoggedIn} 
        userType={userType}
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        globalStats={globalStats}
      />

      {/* 🌊 DYNAMIC CONTENT - REEL IN THE RIGHT VIEW! 🌊 */}
      {!isLoggedIn ? (
        <GlobalFishingCommunityLanding globalStats={globalStats} />
      ) : userType === 'captain' ? (
        <CaptainCommandCenter />
      ) : (
        <AnglerParadiseDashboard />
      )}

      {/* 🚢 FOOTER - DROP ANCHOR HERE! 🚢 */}
      <FishyFooter />
    </div>
  )
}

// 🎣 FISHY NAVIGATION - HOOKS EVERYWHERE! 🎣
export function FishyNavigationHeader({ isLoggedIn, userType, showMobileMenu, setShowMobileMenu, globalStats }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'linear-gradient(90deg, #1e3a8a, #1e40af, #2563eb)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
    }}>
      {/* 🌍 GLOBAL COMMUNITY TICKER */}
      <div style={{
        backgroundColor: '#fbbf24',
        color: '#1e293b',
        padding: '5px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        🌍 LIVE NOW: {globalStats.onlineNow} anglers online from {globalStats.countriesActive} countries | 
        🎣 {globalStats.fishCaughtToday} fish caught today worldwide! | 
        🏆 Join {globalStats.totalMembers.toLocaleString()} fishing enthusiasts!
      </div>

      <nav style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* 🎣 HERO BANNER - YOUR ANCHOR HOME! CLICK ME FROM ANYWHERE! 🎣 */}
        <a href="/" style={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          color: 'white',
          fontSize: '28px',
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #10b981, #059669)',
          padding: '10px 20px',
          borderRadius: '50px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          transition: 'transform 0.3s',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: '36px', marginRight: '10px', animation: 'swim 2s infinite' }}>🎣</span>
          <div>
            <div>Gulf Coast Charters</div>
            <div style={{ fontSize: '12px', fontWeight: 'normal' }}>🌍 Global Fishing Community</div>
          </div>
        </a>

        {/* 🚢 DESKTOP MENU - NAVIGATE THESE WATERS! 🚢 */}
        <div style={{
          display: 'flex',
          gap: '25px',
          alignItems: 'center'
        }}>
          {/* 🎣 FISHING ESSENTIALS */}
          <a href="/" style={fishyLink}>
            <span>🏠</span> Dock
          </a>
          <a href="/booking" style={fishyGlowLink}>
            <span>⚓</span> BOOK GULF COAST CHARTER
          </a>
          <a href="/community" style={fishyLink}>
            <span>🌍</span> Global Community
          </a>
          <a href="/fishing-reports" style={fishyLink}>
            <span>📊</span> Fishing Reports
          </a>
          <a href="/weather" style={fishyLink}>
            <span>⛈️</span> Weather Station
          </a>
          <a href="/tracking" style={fishyLink}>
            <span>📍</span> Live GPS Fleet
          </a>
          
          {/* 🚢 CAPTAIN'S QUARTERS */}
          {userType === 'captain' && (
            <>
              <a href="/captain/dashboard" style={captainLink}>
                <span>👨‍✈️</span> Captain's Bridge
              </a>
              <a href="/captain/fleet" style={captainLink}>
                <span>🚤</span> My Fleet
              </a>
            </>
          )}
          
          {/* 🎣 ANGLER ACCOUNT */}
          {isLoggedIn ? (
            <>
              <a href="/my-catches" style={fishyLink}>
                <span>🏆</span> My Catches
              </a>
              <a href="/tackle-box" style={fishyLink}>
                <span>🎒</span> Tackle Box
              </a>
              <button 
                onClick={() => {
                  localStorage.removeItem('user')
                  window.location.href = '/'
                }}
                style={{
                  ...fishyLink,
                  backgroundColor: '#ef4444',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <span>🚪</span> Cast Off
              </button>
            </>
          ) : (
            <>
              <a href="/login" style={{
                ...fishyLink,
                backgroundColor: '#10b981',
                padding: '10px 25px',
                borderRadius: '25px'
              }}>
                <span>🎣</span> Join the School
              </a>
              <a href="/captain/login" style={{
                ...fishyLink,
                backgroundColor: '#f59e0b',
                padding: '10px 25px',
                borderRadius: '25px'
              }}>
                <span>⚓</span> Captain Login
              </a>
            </>
          )}
        </div>
      </nav>

      {/* 🎣 IMPORTANT BANNER - GULF COAST ONLY FOR CHARTERS! 🎣 */}
      <div style={{
        background: 'linear-gradient(90deg, #dc2626, #ef4444)',
        color: 'white',
        padding: '8px',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        ⚠️ CHARTER BOOKINGS: Gulf Coast Waters Only (Texas to Florida - Inland & Offshore) | 
        🌍 COMMUNITY: Join From Anywhere Worldwide!
      </div>
    </header>
  )
}

// 🌍 GLOBAL FISHING COMMUNITY LANDING - CAST YOUR NET WORLDWIDE! 🌍
function GlobalFishingCommunityLanding({ globalStats }) {
  return (
    <div>
      {/* 🎣 HERO - REEL 'EM IN! 🎣 */}
      <section style={{
        color: 'white',
        padding: '80px 20px',
        textAlign: 'center',
        background: 'url("/ocean-bg.jpg"), linear-gradient(135deg, #0891b2, #0e7490)',
        backgroundBlendMode: 'overlay',
        position: 'relative'
      }}>
        {/* Animated fish swimming across */}
        <div style={{
          position: 'absolute',
          top: '20%',
          animation: 'swimAcross 15s infinite linear'
        }}>
          🐟
        </div>
        <div style={{
          position: 'absolute',
          top: '40%',
          animation: 'swimAcross 20s infinite linear',
          animationDelay: '5s'
        }}>
          🐠
        </div>

        <h1 style={{ 
          fontSize: '64px', 
          marginBottom: '20px',
          textShadow: '3px 3px 6px rgba(0,0,0,0.5)',
          animation: 'float 3s ease-in-out infinite'
        }}>
          🎣 Hook Into The Ultimate Fishing Experience! 🎣
        </h1>
        
        <h2 style={{ fontSize: '32px', marginBottom: '20px', color: '#fbbf24' }}>
          Book Gulf Coast Charters • Join Global Community
        </h2>
        
        <p style={{ fontSize: '20px', marginBottom: '40px', maxWidth: '800px', margin: '0 auto 40px' }}>
          🌊 Whether you're casting lines in Alabama, angling in Australia, or fishing in France - 
          our WORLDWIDE community connects you! But when you're ready to fish the Gulf Coast, 
          we've got the ONLY verified charter captains from Texas to Florida! 🚢
        </p>

        <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/booking" style={{
            padding: '20px 50px',
            backgroundColor: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '50px',
            fontSize: '22px',
            fontWeight: 'bold',
            display: 'inline-block',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
            animation: 'pulse 2s infinite'
          }}>
            ⚓ BOOK GULF COAST CHARTER NOW!
          </a>
          <a href="/community" style={{
            padding: '20px 50px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '50px',
            fontSize: '22px',
            fontWeight: 'bold',
            display: 'inline-block',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)'
          }}>
            🌍 JOIN GLOBAL COMMUNITY FREE!
          </a>
        </div>

        {/* 🎣 LIVE STATS TICKER 🎣 */}
        <div style={{
          marginTop: '60px',
          padding: '20px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ fontSize: '24px', marginBottom: '15px' }}>🔴 LIVE COMMUNITY STATS</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fbbf24' }}>
                {globalStats.onlineNow}
              </div>
              <div>Anglers Online Now</div>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>
                {globalStats.fishCaughtToday}
              </div>
              <div>Fish Caught Today</div>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b' }}>
                {globalStats.countriesActive}
              </div>
              <div>Countries Active</div>
            </div>
            <div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#8b5cf6' }}>
                42
              </div>
              <div>Gulf Charters Today</div>
            </div>
          </div>
        </div>
      </section>

      {/* 🚢 GULF COAST EXCLUSIVE CHARTERS 🚢 */}
      <section style={{ 
        padding: '80px 20px', 
        backgroundColor: '#f0f9ff',
        textAlign: 'center' 
      }}>
        <h2 style={{ 
          fontSize: '48px', 
          marginBottom: '20px', 
          color: '#0c4a6e',
          textAlign: 'center'
        }}>
          ⚓ GULF COAST EXCLUSIVE CHARTERS ⚓
        </h2>
        <p style={{ 
          fontSize: '20px', 
          color: '#475569', 
          marginBottom: '40px',
          maxWidth: '800px',
          margin: '0 auto 40px'
        }}>
          🎣 From Padre Island to the Florida Keys - We've Got Every Gulf Water Covered! 
          Inshore flats, offshore deep sea, bay fishing, and reef adventures!
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '30px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <CharterCard 
            icon="🎣"
            title="Texas Coast Charters"
            description="Galveston, Corpus Christi, South Padre - Redfish, Speckled Trout, Tarpon!"
            locations="Port Aransas • Rockport • Freeport"
            link="/booking?region=texas"
          />
          <CharterCard 
            icon="🦐"
            title="Louisiana Bayou & Offshore"
            description="Venice, Grand Isle, New Orleans - Tuna, Marlin, Red Snapper paradise!"
            locations="Cocodrie • Fourchon • Cameron"
            link="/booking?region=louisiana"
          />
          <CharterCard 
            icon="🐟"
            title="Mississippi Sound"
            description="Biloxi, Gulfport, Pass Christian - Cobia, King Mackerel, Tripletail!"
            locations="Ocean Springs • Bay St. Louis"
            link="/booking?region=mississippi"
          />
          <CharterCard 
            icon="🎣"
            title="Alabama Sweet Spot"
            description="Orange Beach, Gulf Shores, Mobile Bay - The Fishing Capital!"
            locations="Dauphin Island • Fort Morgan"
            link="/booking?region=alabama"
          />
          <CharterCard 
            icon="🏝️"
            title="Florida Panhandle"
            description="Destin, Panama City, Pensacola - Emerald waters, monster fish!"
            locations="Apalachicola • Cedar Key"
            link="/booking?region=florida-panhandle"
          />
          <CharterCard 
            icon="🌴"
            title="Florida West Coast"
            description="Tampa, Clearwater, Naples - Tarpon, Grouper, Shark capital!"
            locations="Sarasota • Fort Myers • Marco Island"
            link="/booking?region=florida-west"
          />
        </div>

        <div style={{
          marginTop: '60px',
          padding: '30px',
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          borderRadius: '20px',
          color: 'white',
          maxWidth: '800px',
          margin: '60px auto 0'
        }}>
          <h3 style={{ fontSize: '28px', marginBottom: '15px' }}>
            ⚠️ CHARTER CAPTAINS: GULF COAST ONLY! ⚠️
          </h3>
          <p style={{ fontSize: '18px', marginBottom: '20px' }}>
            We ONLY accept charter boats operating in Gulf Coast waters (inland or offshore).
            From Texas to Florida - if you're not fishing these waters, you can't list here!
          </p>
          <a href="/captain/apply" style={{
            display: 'inline-block',
            padding: '15px 40px',
            backgroundColor: 'white',
            color: '#f59e0b',
            borderRadius: '30px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '18px'
          }}>
            ⚓ Apply as Gulf Coast Captain
          </a>
        </div>
      </section>

      {/* 🌍 WORLDWIDE COMMUNITY FEATURES 🌍 */}
      <section style={{ 
        padding: '80px 20px', 
        background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
        color: 'white'
      }}>
        <h2 style={{ 
          fontSize: '48px', 
          marginBottom: '40px',
          textAlign: 'center',
          color: '#fbbf24'
        }}>
          🌍 JOIN THE GLOBAL FISHING COMMUNITY! 🌍
        </h2>
        <p style={{
          fontSize: '24px',
          textAlign: 'center',
          marginBottom: '60px',
          color: '#94a3b8'
        }}>
          From Antarctica to Zimbabwe - Every Angler is Welcome!
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          maxWidth: '1200px',
          margin: '0 auto' 
        }}>
          <CommunityFeature 
            icon="🏆"
            title="Global Leaderboards"
            description="Compete with anglers from 100+ countries! Daily, weekly, and all-time champions!"
            highlight="2,341 active competitions"
          />
          <CommunityFeature 
            icon="📸"
            title="Fish Gallery"
            description="Share your catches from ANY water worldwide! Get likes, comments, and bragging rights!"
            highlight="45,672 photos this month"
          />
          <CommunityFeature 
            icon="🗺️"
            title="Fishing Map"
            description="Mark your secret spots (or don't!). See where the fish are biting globally!"
            highlight="8,234 hot spots marked"
          />
          <CommunityFeature 
            icon="💬"
            title="24/7 Fish Chat"
            description="Live chat with anglers worldwide! Get tips, share stories, make fishing buddies!"
            highlight="892 chatting now"
          />
          <CommunityFeature 
            icon="🎓"
            title="Fishy University"
            description="Learn from pros worldwide! Video tutorials, live streams, technique guides!"
            highlight="500+ video lessons"
          />
          <CommunityFeature 
            icon="🎮"
            title="Fishing Challenges"
            description="Daily quests, achievement badges, and rewards! Level up your angler status!"
            highlight="127 achievements to earn"
          />
        </div>

        {/* 🎣 COMMUNITY CALL TO ACTION 🎣 */}
        <div style={{
          marginTop: '80px',
          textAlign: 'center',
          padding: '40px',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          borderRadius: '30px',
          maxWidth: '800px',
          margin: '80px auto 0'
        }}>
          <h3 style={{ fontSize: '36px', marginBottom: '20px' }}>
            🎣 Ready to Join 15,000+ Anglers? 🎣
          </h3>
          <p style={{ fontSize: '20px', marginBottom: '30px' }}>
            Free forever! Connect with the world's fishing community!
          </p>
          <a href="/signup" style={{
            display: 'inline-block',
            padding: '20px 60px',
            backgroundColor: 'white',
            color: '#7c3aed',
            borderRadius: '50px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '24px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)'
          }}>
            🌍 JOIN THE SCHOOL NOW!
          </a>
        </div>
      </section>

      {/* 🎣 WHY FISHY DIFFERENCE 🎣 */}
      <section style={{
        padding: '80px 20px',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: 'white',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '48px', marginBottom: '40px' }}>
          🐟 The Fishy Difference 🐟
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '40px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          <div>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🛡️</div>
            <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>100% Verified Captains</h3>
            <p>Every Gulf Coast captain is licensed, insured, and background checked!</p>
          </div>
          <div>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>⛈️</div>
            <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>Real-Time Weather</h3>
            <p>NOAA integration keeps you safe with instant weather alerts!</p>
          </div>
          <div>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📍</div>
            <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>Live GPS Tracking</h3>
            <p>Share your location with loved ones - they can follow your adventure!</p>
          </div>
          <div>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏆</div>
            <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>Rewards Program</h3>
            <p>Earn points, unlock badges, get discounts on future charters!</p>
          </div>
        </div>
      </section>
    </div>
  )
}

// 🎣 ANGLER PARADISE DASHBOARD 🎣
function AnglerParadiseDashboard() {
  const [stats] = useState({
    totalCatches: 127,
    biggestFish: "42lb Red Snapper",
    favoriteSpot: "Orange Beach Pier",
    nextTrip: "Dec 5, 2024",
    communityRank: "#234",
    totalPoints: 8750
  })

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ 
        fontSize: '48px', 
        marginBottom: '30px', 
        color: 'white',
        textAlign: 'center'
      }}>
        🎣 Welcome Back to Your Fishing Paradise! 🎣
      </h1>
      
      {/* 🏆 ANGLER STATS 🏆 */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <FishyStat label="Total Catches" value={stats.totalCatches} icon="🎣" color="#10b981" />
        <FishyStat label="Biggest Catch" value={stats.biggestFish} icon="🏆" color="#f59e0b" />
        <FishyStat label="Community Rank" value={stats.communityRank} icon="🌍" color="#8b5cf6" />
        <FishyStat label="Fishy Points" value={stats.totalPoints} icon="⭐" color="#ef4444" />
        <FishyStat label="Next Charter" value={stats.nextTrip} icon="📅" color="#06b6d4" />
        <FishyStat label="Favorite Spot" value={stats.favoriteSpot} icon="📍" color="#ec4899" />
      </div>

      {/* 🎣 QUICK ACTIONS 🎣 */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <FishyAction 
          icon="⚓"
          title="Book Another Charter"
          description="Gulf Coast adventures await!"
          href="/booking"
          color="#10b981"
        />
        <FishyAction 
          icon="📸"
          title="Upload Catch"
          description="Show off your latest trophy!"
          href="/upload-catch"
          color="#f59e0b"
        />
        <FishyAction 
          icon="🌍"
          title="Community Feed"
          description="See what's biting worldwide!"
          href="/community"
          color="#8b5cf6"
        />
        <FishyAction 
          icon="🗺️"
          title="Fishing Map"
          description="Find the hot spots!"
          href="/map"
          color="#ef4444"
        />
      </div>

      {/* 🌊 RECENT CATCHES FEED 🌊 */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: '30px',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: '32px', marginBottom: '20px', color: 'white' }}>
          🌊 Latest Catches from Your Fishing Buddies 🌊
        </h2>
        <CatchFeed />
      </div>
    </div>
  )
}

// 👨‍✈️ CAPTAIN COMMAND CENTER 👨‍✈️
function CaptainCommandCenter() {
  const [stats] = useState({
    todayCharters: 3,
    weekRevenue: "$4,850",
    monthlyBookings: 42,
    rating: "4.9 ⭐",
    weatherStatus: "Perfect",
    nextCharter: "6:00 AM"
  })

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ 
        fontSize: '48px', 
        marginBottom: '30px', 
        color: 'white',
        textAlign: 'center'
      }}>
        ⚓ Captain's Command Center ⚓
      </h1>

      {/* 🚢 CAPTAIN STATS 🚢 */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <FishyStat label="Today's Charters" value={stats.todayCharters} icon="🚤" color="#ef4444" />
        <FishyStat label="Week Revenue" value={stats.weekRevenue} icon="💰" color="#10b981" />
        <FishyStat label="Monthly Bookings" value={stats.monthlyBookings} icon="📅" color="#f59e0b" />
        <FishyStat label="Captain Rating" value={stats.rating} icon="⭐" color="#8b5cf6" />
        <FishyStat label="Weather Status" value={stats.weatherStatus} icon="☀️" color="#06b6d4" />
        <FishyStat label="Next Charter" value={stats.nextCharter} icon="⏰" color="#ec4899" />
      </div>

      {/* ⚓ GULF COAST EXCLUSIVE NOTICE ⚓ */}
      <div style={{
        background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
        color: 'white',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>
          ⚓ GULF COAST EXCLUSIVE CAPTAIN ⚓
        </h3>
        <p>Your charters are visible to our global community of 15,000+ anglers!</p>
        <p>Remember: Only Gulf Coast waters (Texas to Florida, inland & offshore)</p>
      </div>

      {/* 🎣 TODAY'S MANIFEST 🎣 */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: '30px',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: '32px', marginBottom: '20px', color: 'white' }}>
          🎣 Today's Charter Manifest 🎣
        </h2>
        <CharterManifest />
      </div>
    </div>
  )
}

// 🚢 HELPER COMPONENTS - THE CREW! 🚢

function CharterCard({ icon, title, description, locations, link }) {
  return (
    <a href={link} style={{
      display: 'block',
      padding: '30px',
      backgroundColor: 'white',
      borderRadius: '20px',
      textDecoration: 'none',
      color: 'inherit',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      transition: 'all 0.3s',
      border: '3px solid transparent',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-5px)'
      e.currentTarget.style.borderColor = '#10b981'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.borderColor = 'transparent'
    }}
    >
      <div style={{ fontSize: '48px', marginBottom: '15px', textAlign: 'center' }}>{icon}</div>
      <h3 style={{ fontSize: '24px', marginBottom: '10px', color: '#0c4a6e' }}>{title}</h3>
      <p style={{ color: '#64748b', marginBottom: '15px' }}>{description}</p>
      <div style={{ 
        padding: '10px', 
        background: '#f0f9ff', 
        borderRadius: '10px',
        fontSize: '14px',
        color: '#0891b2'
      }}>
        📍 {locations}
      </div>
    </a>
  )
}

function CommunityFeature({ icon, title, description, highlight }) {
  return (
    <div style={{
      padding: '30px',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)',
      border: '2px solid rgba(255,255,255,0.1)',
      transition: 'all 0.3s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
      e.currentTarget.style.transform = 'scale(1.05)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
      e.currentTarget.style.transform = 'scale(1)'
    }}
    >
      <div style={{ fontSize: '48px', marginBottom: '15px' }}>{icon}</div>
      <h3 style={{ fontSize: '24px', marginBottom: '10px', color: '#fbbf24' }}>{title}</h3>
      <p style={{ color: '#cbd5e1', marginBottom: '15px' }}>{description}</p>
      <div style={{
        padding: '8px',
        background: 'rgba(251, 191, 36, 0.2)',
        borderRadius: '10px',
        color: '#fbbf24',
        fontWeight: 'bold'
      }}>
        🔥 {highlight}
      </div>
    </div>
  )
}

function FishyStat({ label, value, icon, color }) {
  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.1)',
      padding: '25px',
      borderRadius: '15px',
      backdropFilter: 'blur(10px)',
      borderLeft: `5px solid ${color}`,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <p style={{ color: '#94a3b8', marginBottom: '5px' }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>{value}</p>
    </div>
  )
}

function FishyAction({ icon, title, description, href, color }) {
  return (
    <a href={href} style={{
      display: 'block',
      padding: '25px',
      background: `linear-gradient(135deg, ${color}, ${color}dd)`,
      borderRadius: '20px',
      textDecoration: 'none',
      color: 'white',
      transition: 'transform 0.3s',
      textAlign: 'center'
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ fontSize: '48px', marginBottom: '10px' }}>{icon}</div>
      <h3 style={{ fontSize: '20px', marginBottom: '5px' }}>{title}</h3>
      <p style={{ fontSize: '14px', opacity: 0.9 }}>{description}</p>
    </a>
  )
}

function CatchFeed() {
  const catches = [
    { user: "BigMike_Texas", fish: "45lb Red Drum", location: "Port Aransas", time: "2 hours ago" },
    { user: "Sarah_Angler", fish: "28lb King Mackerel", location: "Destin", time: "3 hours ago" },
    { user: "CaptainJoe", fish: "Giant Tarpon", location: "Boca Grande", time: "5 hours ago" },
    { user: "FishingQueen", fish: "Trophy Redfish", location: "Venice, LA", time: "Today" }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {catches.map((catch_, idx) => (
        <div key={idx} style={{
          padding: '15px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{ fontWeight: 'bold', color: '#fbbf24' }}>
              @{catch_.user} caught a {catch_.fish}!
            </p>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              📍 {catch_.location} • {catch_.time}
            </p>
          </div>
          <button style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer'
          }}>
            🎉 Nice Catch!
          </button>
        </div>
      ))}
    </div>
  )
}

function CharterManifest() {
  const charters = [
    { time: "6:00 AM", type: "Deep Sea", passengers: 4, boat: "Reel Deal" },
    { time: "10:00 AM", type: "Inshore", passengers: 2, boat: "Bay Runner" },
    { time: "2:00 PM", type: "Sunset Cruise", passengers: 6, boat: "Sea Dreams" }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {charters.map((charter, idx) => (
        <div key={idx} style={{
          padding: '20px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <p style={{ fontWeight: 'bold', color: '#fbbf24', fontSize: '18px' }}>
              ⏰ {charter.time} - {charter.type}
            </p>
            <p style={{ color: '#94a3b8' }}>
              👥 {charter.passengers} passengers • 🚤 {charter.boat}
            </p>
          </div>
          <button style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '25px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
            View Details
          </button>
        </div>
      ))}
    </div>
  )
}

// 🚢 FISHY FOOTER - DROP ANCHOR! 🚢
function FishyFooter() {
  return (
    <footer style={{
      backgroundColor: '#0f172a',
      color: 'white',
      padding: '60px 20px',
      marginTop: '0'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 🌊 BIG FISHY MESSAGE 🌊 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '60px',
          padding: '40px',
          background: 'linear-gradient(135deg, #0891b2, #0e7490)',
          borderRadius: '30px'
        }}>
          <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>
            🎣 CAST YOUR LINE WITH US! 🎣
          </h2>
          <p style={{ fontSize: '20px', marginBottom: '20px' }}>
            Gulf Coast Charters: The ONLY Platform for Texas-to-Florida Fishing Adventures
          </p>
          <p style={{ fontSize: '18px', color: '#fbbf24' }}>
            Join 15,000+ anglers from 47 countries in our global fishing community!
          </p>
        </div>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
          {/* Gulf Coast Charters */}
          <div>
            <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#fbbf24' }}>
              ⚓ Gulf Coast Charters
            </h3>
            <p style={{ color: '#94a3b8', marginBottom: '15px' }}>
              Exclusive charter bookings from Texas to Florida. 
              Every captain verified, every trip insured!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="/booking" style={footerLink}>Book a Charter</a>
              <a href="/captain/apply" style={footerLink}>Become a Captain</a>
              <a href="/safety" style={footerLink}>Safety Guidelines</a>
              <a href="/insurance" style={footerLink}>Trip Insurance</a>
            </div>
          </div>
          
          {/* Global Community */}
          <div>
            <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#fbbf24' }}>
              🌍 Global Community
            </h3>
            <p style={{ color: '#94a3b8', marginBottom: '15px' }}>
              Connect with anglers worldwide! Share catches, tips, and fishing stories!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="/community" style={footerLink}>Community Feed</a>
              <a href="/leaderboards" style={footerLink}>Global Rankings</a>
              <a href="/challenges" style={footerLink}>Fishing Challenges</a>
              <a href="/groups" style={footerLink}>Fishing Groups</a>
            </div>
          </div>
          
          {/* Fishing Resources */}
          <div>
            <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#fbbf24' }}>
              🎣 Fishing Intel
            </h3>
            <p style={{ color: '#94a3b8', marginBottom: '15px' }}>
              Everything you need for the perfect catch!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="/weather" style={footerLink}>Weather Center</a>
              <a href="/tide-charts" style={footerLink}>Tide Charts</a>
              <a href="/fishing-reports" style={footerLink}>Fishing Reports</a>
              <a href="/species-guide" style={footerLink}>Species Guide</a>
              <a href="/regulations" style={footerLink}>Fishing Regulations</a>
            </div>
          </div>
          
          {/* Contact & Support */}
          <div>
            <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#fbbf24' }}>
              🆘 Hook Us Up!
            </h3>
            <p style={{ color: '#94a3b8', marginBottom: '15px' }}>
              24/7 Support for all your fishing needs!
            </p>
            <p style={{ color: '#10b981', marginBottom: '10px' }}>📧 ahoy@gulfcoastcharters.com</p>
            <p style={{ color: '#10b981', marginBottom: '10px' }}>📞 1-800-FISHNOW</p>
            <p style={{ color: '#10b981', marginBottom: '10px' }}>💬 Live Chat Available</p>
            <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
              <span style={{ fontSize: '24px' }}>📘</span>
              <span style={{ fontSize: '24px' }}>📸</span>
              <span style={{ fontSize: '24px' }}>🐦</span>
              <span style={{ fontSize: '24px' }}>📱</span>
            </div>
          </div>
        </div>
        
        {/* 🎣 FINAL CAST 🎣 */}
        <div style={{ 
          borderTop: '2px solid #1e293b',
          paddingTop: '30px',
          marginTop: '40px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#fbbf24', fontSize: '18px', marginBottom: '10px' }}>
            🎣 REMEMBER: Book Gulf Coast Charters • Join Global Community • Catch More Fish! 🎣
          </p>
          <p style={{ color: '#64748b' }}>
            © 2024 Gulf Coast Charters | Platform Version 1.0.0 | Serving anglers from Texas to Florida
          </p>
          <p style={{ color: '#475569', marginTop: '10px' }}>
            Charter Operations: Gulf Coast Only | Community: Worldwide | Fish On! 🐟
          </p>
        </div>
      </div>
    </footer>
  )
}

// STYLES
const fishyLink = {
  textDecoration: 'none',
  color: 'white',
  fontWeight: 'bold',
  transition: 'all 0.3s',
  display: 'flex',
  alignItems: 'center',
  gap: '5px'
}

const fishyGlowLink = {
  ...fishyLink,
  padding: '10px 20px',
  background: 'linear-gradient(45deg, #f59e0b, #fbbf24)',
  borderRadius: '25px',
  boxShadow: '0 0 20px rgba(251, 191, 36, 0.5)',
  animation: 'glow 2s ease-in-out infinite'
}

const captainLink = {
  ...fishyLink,
  color: '#fbbf24'
}

const footerLink = {
  color: '#94a3b8',
  textDecoration: 'none',
  transition: 'color 0.3s'
}

// Add CSS animations
const style = document.createElement('style')
style.textContent = `
  @keyframes swim {
    0%, 100% { transform: translateX(-5px); }
    50% { transform: translateX(5px); }
  }
  
  @keyframes swimAcross {
    0% { left: -50px; }
    100% { left: 100%; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
    50% { box-shadow: 0 0 30px rgba(251, 191, 36, 0.8); }
  }
`
document.head.appendChild(style)
