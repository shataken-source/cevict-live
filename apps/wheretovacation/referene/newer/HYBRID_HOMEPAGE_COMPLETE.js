// pages/index.js - COMPLETE HYBRID HOMEPAGE WITH FULL NAVIGATION
import React, { useState, useEffect } from 'react'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  useEffect(() => {
    // Check user status
    const checkUser = () => {
      const user = localStorage.getItem('user')
      if (user) {
        try {
          const userData = JSON.parse(user)
          setIsLoggedIn(true)
          setUserType(userData.type || 'customer')
        } catch (e) {
          console.log('User check error:', e)
        }
      }
    }
    checkUser()

    // Listen for storage changes (login/logout from other tabs)
    window.addEventListener('storage', checkUser)
    return () => window.removeEventListener('storage', checkUser)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* UNIVERSAL NAVIGATION HEADER - Shows on ALL pages */}
      <NavigationHeader 
        isLoggedIn={isLoggedIn} 
        userType={userType}
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
      />

      {/* DYNAMIC CONTENT BASED ON USER STATUS */}
      {!isLoggedIn ? (
        <PublicHomepage />
      ) : userType === 'captain' ? (
        <CaptainDashboard />
      ) : (
        <CustomerDashboard />
      )}

      {/* FOOTER - Shows on all pages */}
      <Footer />
    </div>
  )
}

// NAVIGATION COMPONENT - Use this on EVERY page
export function NavigationHeader({ isLoggedIn, userType, showMobileMenu, setShowMobileMenu }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backgroundColor: 'white',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      {/* MAIN NAVIGATION */}
      <nav style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* HERO BANNER - ALWAYS GOES HOME */}
        <a href="/" style={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          color: '#0284c7',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          <span style={{ fontSize: '32px', marginRight: '10px' }}>🎣</span>
          Gulf Coast Charters
        </a>

        {/* DESKTOP MENU */}
        <div style={{
          display: 'flex',
          gap: '30px',
          alignItems: 'center',
          '@media (max-width: 768px)': { display: 'none' }
        }}>
          {/* PUBLIC LINKS */}
          <a href="/" style={linkStyle}>Home</a>
          <a href="/booking" style={linkStyle}>Book Charter</a>
          <a href="/weather" style={linkStyle}>Weather</a>
          <a href="/community" style={linkStyle}>Community</a>
          <a href="/tracking" style={linkStyle}>GPS Tracking</a>
          
          {/* CAPTAIN LINKS */}
          {userType === 'captain' && (
            <>
              <a href="/captain/dashboard" style={linkStyle}>Captain Portal</a>
              <a href="/captain/bookings" style={linkStyle}>My Bookings</a>
              <a href="/captain/vessels" style={linkStyle}>My Vessels</a>
            </>
          )}
          
          {/* USER ACCOUNT LINKS */}
          {isLoggedIn ? (
            <>
              <a href="/dashboard" style={linkStyle}>My Dashboard</a>
              <a href="/profile" style={linkStyle}>Profile</a>
              <button 
                onClick={() => {
                  localStorage.removeItem('user')
                  window.location.href = '/'
                }}
                style={{
                  ...linkStyle,
                  backgroundColor: '#ef4444',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <a href="/login" style={{
                ...linkStyle,
                backgroundColor: '#0284c7',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '6px'
              }}>
                Sign In
              </a>
              <a href="/captain/login" style={{
                ...linkStyle,
                backgroundColor: '#10b981',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '6px'
              }}>
                Captain Login
              </a>
            </>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          style={{
            display: 'none',
            '@media (max-width: 768px)': { display: 'block' },
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer'
          }}
        >
          ☰
        </button>
      </nav>

      {/* MOBILE MENU DROPDOWN */}
      {showMobileMenu && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          <a href="/" style={mobileLink}>Home</a>
          <a href="/booking" style={mobileLink}>Book Charter</a>
          <a href="/weather" style={mobileLink}>Weather</a>
          <a href="/community" style={mobileLink}>Community</a>
          <a href="/tracking" style={mobileLink}>GPS Tracking</a>
          {userType === 'captain' && (
            <>
              <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
              <a href="/captain/dashboard" style={mobileLink}>Captain Portal</a>
              <a href="/captain/bookings" style={mobileLink}>My Bookings</a>
              <a href="/captain/vessels" style={mobileLink}>My Vessels</a>
            </>
          )}
          <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
          {isLoggedIn ? (
            <>
              <a href="/dashboard" style={mobileLink}>My Dashboard</a>
              <a href="/profile" style={mobileLink}>Profile</a>
              <button onClick={() => {
                localStorage.removeItem('user')
                window.location.href = '/'
              }} style={{ ...mobileLink, textAlign: 'left' }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <a href="/login" style={mobileLink}>Sign In</a>
              <a href="/captain/login" style={mobileLink}>Captain Login</a>
            </>
          )}
        </div>
      )}
    </header>
  )
}

// PUBLIC HOMEPAGE - For non-logged-in users
function PublicHomepage() {
  return (
    <div>
      {/* HERO SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '80px 20px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
          Your Next Fishing Adventure Awaits
        </h1>
        <p style={{ fontSize: '20px', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
          Book with verified captains, track your trip in real-time, and earn rewards with every catch!
        </p>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/booking" style={{
            padding: '15px 40px',
            backgroundColor: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            Browse Available Charters
          </a>
          <a href="/login" style={{
            padding: '15px 40px',
            backgroundColor: 'white',
            color: '#764ba2',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            Sign In to Your Account
          </a>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section style={{ padding: '60px 20px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '36px', marginBottom: '40px', color: '#1f2937' }}>
            Everything You Need for the Perfect Trip
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '30px' 
          }}>
            <FeatureCard 
              icon="🎣"
              title="Easy Booking"
              description="Find and book the perfect charter in minutes"
              link="/booking"
            />
            <FeatureCard 
              icon="⛈️"
              title="Weather Alerts"
              description="Real-time NOAA weather updates and safety alerts"
              link="/weather"
            />
            <FeatureCard 
              icon="📍"
              title="GPS Tracking"
              description="Share your location with family and friends"
              link="/tracking"
            />
            <FeatureCard 
              icon="🏆"
              title="Earn Rewards"
              description="Points, badges, and discounts for every trip"
              link="/community"
            />
            <FeatureCard 
              icon="👨‍✈️"
              title="Verified Captains"
              description="All captains are licensed and insured"
              link="/captain/login"
            />
            <FeatureCard 
              icon="💬"
              title="Community"
              description="Share catches and connect with other anglers"
              link="/community"
            />
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section style={{
        background: 'linear-gradient(to right, #0891b2, #0e7490)',
        color: 'white',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '36px', marginBottom: '20px' }}>
          Ready to Book Your Charter?
        </h2>
        <p style={{ fontSize: '18px', marginBottom: '30px' }}>
          Join thousands of happy anglers on the Gulf Coast
        </p>
        <a href="/booking" style={{
          padding: '20px 60px',
          backgroundColor: 'white',
          color: '#0891b2',
          textDecoration: 'none',
          borderRadius: '8px',
          fontSize: '20px',
          fontWeight: 'bold',
          display: 'inline-block'
        }}>
          Start Booking Now
        </a>
      </section>

      {/* QUICK LINKS SECTION */}
      <section style={{ padding: '40px 20px', backgroundColor: '#f9fafb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '24px', marginBottom: '20px', color: '#1f2937' }}>Quick Links</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <a href="/about" style={quickLink}>About Us</a>
            <a href="/contact" style={quickLink}>Contact</a>
            <a href="/faq" style={quickLink}>FAQ</a>
            <a href="/safety" style={quickLink}>Safety Guidelines</a>
            <a href="/terms" style={quickLink}>Terms of Service</a>
            <a href="/privacy" style={quickLink}>Privacy Policy</a>
            <a href="/captain/apply" style={quickLink}>Become a Captain</a>
            <a href="/api" style={quickLink}>API Docs</a>
            <a href="/help" style={quickLink}>Help Center</a>
          </div>
        </div>
      </section>
    </div>
  )
}

// CUSTOMER DASHBOARD - For logged-in customers
function CustomerDashboard() {
  const [stats, setStats] = useState({
    upcomingTrips: 2,
    totalPoints: 1250,
    currentStreak: 7,
    totalCatches: 34
  })

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '36px', marginBottom: '30px', color: '#1f2937' }}>
        Welcome Back, Angler! 🎣
      </h1>
      
      {/* STATS GRID */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <StatCard label="Upcoming Trips" value={stats.upcomingTrips} color="#10b981" />
        <StatCard label="Total Points" value={stats.totalPoints} color="#f59e0b" />
        <StatCard label="Day Streak" value={stats.currentStreak} color="#8b5cf6" />
        <StatCard label="Fish Caught" value={stats.totalCatches} color="#3b82f6" />
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <ActionButton 
          icon="📅"
          title="Book New Trip"
          description="Find your next adventure"
          href="/booking"
          color="#0891b2"
        />
        <ActionButton 
          icon="🎣"
          title="My Bookings"
          description="View and manage trips"
          href="/my-bookings"
          color="#10b981"
        />
        <ActionButton 
          icon="🏆"
          title="Achievements"
          description="View badges and rewards"
          href="/achievements"
          color="#f59e0b"
        />
        <ActionButton 
          icon="📸"
          title="Photo Gallery"
          description="Your fishing memories"
          href="/gallery"
          color="#8b5cf6"
        />
      </div>

      {/* RECENT ACTIVITY */}
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#1f2937' }}>Recent Activity</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <ActivityItem 
            date="Nov 20, 2024"
            title="Earned 50 points"
            description="Completed trip with Captain Mike"
          />
          <ActivityItem 
            date="Nov 18, 2024"
            title="New Badge Unlocked"
            description="First Marlin Catch!"
          />
          <ActivityItem 
            date="Nov 15, 2024"
            title="Trip Booked"
            description="Deep Sea Fishing - Dec 5, 2024"
          />
        </div>
      </div>
    </div>
  )
}

// CAPTAIN DASHBOARD - For logged-in captains
function CaptainDashboard() {
  const [stats, setStats] = useState({
    todayBookings: 3,
    weekRevenue: 4250,
    rating: 4.8,
    totalTrips: 342
  })

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '36px', marginBottom: '30px', color: '#1f2937' }}>
        Captain's Bridge ⚓
      </h1>
      
      {/* CAPTAIN STATS */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <StatCard label="Today's Bookings" value={stats.todayBookings} color="#ef4444" />
        <StatCard label="Week Revenue" value={`$${stats.weekRevenue}`} color="#10b981" />
        <StatCard label="Rating" value={`⭐ ${stats.rating}`} color="#f59e0b" />
        <StatCard label="Total Trips" value={stats.totalTrips} color="#3b82f6" />
      </div>

      {/* CAPTAIN TOOLS */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <ActionButton 
          icon="📋"
          title="Manage Bookings"
          description="View today's schedule"
          href="/captain/bookings"
          color="#ef4444"
        />
        <ActionButton 
          icon="🚤"
          title="My Vessels"
          description="Update vessel info"
          href="/captain/vessels"
          color="#0891b2"
        />
        <ActionButton 
          icon="💰"
          title="Earnings"
          description="Track your revenue"
          href="/captain/earnings"
          color="#10b981"
        />
        <ActionButton 
          icon="📊"
          title="Analytics"
          description="Performance metrics"
          href="/captain/analytics"
          color="#8b5cf6"
        />
      </div>

      {/* TODAY'S SCHEDULE */}
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#1f2937' }}>Today's Schedule</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <ScheduleItem 
            time="6:00 AM"
            title="Half Day Fishing"
            passengers="4 passengers"
            status="confirmed"
          />
          <ScheduleItem 
            time="2:00 PM"
            title="Sunset Cruise"
            passengers="6 passengers"
            status="confirmed"
          />
          <ScheduleItem 
            time="7:00 PM"
            title="Night Fishing"
            passengers="2 passengers"
            status="pending"
          />
        </div>
      </div>

      {/* WEATHER ALERT */}
      <div style={{ 
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#fef3c7',
        border: '2px solid #fbbf24',
        borderRadius: '8px'
      }}>
        <h3 style={{ color: '#92400e', marginBottom: '10px' }}>⚠️ Weather Advisory</h3>
        <p style={{ color: '#78350f' }}>
          Small craft advisory in effect from 3:00 PM. Winds 15-20kt from the NE.
        </p>
        <a href="/weather" style={{ color: '#0891b2', textDecoration: 'underline' }}>
          View Full Forecast →
        </a>
      </div>
    </div>
  )
}

// FOOTER COMPONENT
function Footer() {
  return (
    <footer style={{
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '40px 20px',
      marginTop: '60px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '40px',
          marginBottom: '30px'
        }}>
          {/* Company Info */}
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>Gulf Coast Charters</h3>
            <p style={{ color: '#9ca3af', marginBottom: '10px' }}>
              Your premier charter fishing platform on the Gulf Coast
            </p>
            <p style={{ color: '#9ca3af' }}>© 2024 All rights reserved</p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>Quick Links</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="/booking" style={footerLink}>Book a Charter</a>
              <a href="/weather" style={footerLink}>Weather Center</a>
              <a href="/community" style={footerLink}>Community</a>
              <a href="/help" style={footerLink}>Help Center</a>
            </div>
          </div>
          
          {/* Captain Resources */}
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>For Captains</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="/captain/login" style={footerLink}>Captain Portal</a>
              <a href="/captain/apply" style={footerLink}>Become a Captain</a>
              <a href="/captain/resources" style={footerLink}>Resources</a>
              <a href="/captain/support" style={footerLink}>Captain Support</a>
            </div>
          </div>
          
          {/* Contact */}
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>Contact Us</h3>
            <p style={{ color: '#9ca3af', marginBottom: '10px' }}>📧 info@gulfcoastcharters.com</p>
            <p style={{ color: '#9ca3af', marginBottom: '10px' }}>📞 1-800-FISHING</p>
            <p style={{ color: '#9ca3af' }}>📍 Gulf Shores, AL</p>
          </div>
        </div>
        
        <div style={{ 
          borderTop: '1px solid #374151',
          paddingTop: '20px',
          marginTop: '20px',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          <p>Platform Version 1.0.0 | Phase 1 Testing</p>
        </div>
      </div>
    </footer>
  )
}

// HELPER COMPONENTS
function FeatureCard({ icon, title, description, link }) {
  return (
    <a href={link} style={{
      display: 'block',
      padding: '30px',
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      textAlign: 'center',
      textDecoration: 'none',
      color: 'inherit',
      transition: 'transform 0.2s',
      cursor: 'pointer'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '15px' }}>{icon}</div>
      <h3 style={{ fontSize: '20px', marginBottom: '10px', color: '#1f2937' }}>{title}</h3>
      <p style={{ color: '#6b7280' }}>{description}</p>
    </a>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '25px',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`
    }}>
      <p style={{ color: '#6b7280', marginBottom: '5px' }}>{label}</p>
      <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>{value}</p>
    </div>
  )
}

function ActionButton({ icon, title, description, href, color }) {
  return (
    <a href={href} style={{
      display: 'block',
      padding: '25px',
      backgroundColor: 'white',
      borderRadius: '12px',
      textDecoration: 'none',
      color: 'inherit',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      transition: 'all 0.2s',
      borderTop: `4px solid ${color}`
    }}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <h3 style={{ fontSize: '18px', marginBottom: '5px', color: '#1f2937' }}>{title}</h3>
      <p style={{ color: '#6b7280', fontSize: '14px' }}>{description}</p>
    </a>
  )
}

function ActivityItem({ date, title, description }) {
  return (
    <div style={{
      padding: '15px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      borderLeft: '4px solid #3b82f6'
    }}>
      <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '5px' }}>{date}</p>
      <p style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '3px' }}>{title}</p>
      <p style={{ color: '#6b7280', fontSize: '14px' }}>{description}</p>
    </div>
  )
}

function ScheduleItem({ time, title, passengers, status }) {
  return (
    <div style={{
      padding: '15px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <p style={{ fontWeight: 'bold', color: '#1f2937' }}>{time} - {title}</p>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>{passengers}</p>
      </div>
      <span style={{
        padding: '5px 15px',
        borderRadius: '20px',
        fontSize: '12px',
        backgroundColor: status === 'confirmed' ? '#d1fae5' : '#fed7aa',
        color: status === 'confirmed' ? '#065f46' : '#92400e'
      }}>
        {status}
      </span>
    </div>
  )
}

// STYLES
const linkStyle = {
  textDecoration: 'none',
  color: '#374151',
  fontWeight: '500',
  transition: 'color 0.2s'
}

const mobileLink = {
  textDecoration: 'none',
  color: '#374151',
  padding: '10px',
  display: 'block'
}

const quickLink = {
  color: '#6b7280',
  textDecoration: 'none',
  padding: '5px 10px',
  transition: 'color 0.2s'
}

const footerLink = {
  color: '#9ca3af',
  textDecoration: 'none',
  transition: 'color 0.2s'
}
