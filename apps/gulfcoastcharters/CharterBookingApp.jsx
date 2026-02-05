/**
 * Main Charter Booking App
 * Simple, user-friendly interface with fishing-themed help on every page
 * Designed for all ages (teenagers to retirees)
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Fish, HelpCircle, Home, Calendar, Trophy, MapPin, 
  Cloud, User, Settings, Menu, X, Anchor, Info,
  ChevronRight, AlertCircle, Smile
} from 'lucide-react';

// Import our components
import LocationSharing from './LocationSharing';
import AdminConfig from './AdminConfig';
import { PointsManager, usePoints, useLeaderboard } from './community-points-system';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Fishy Help System - Appears on every page
 */
const FishyHelp = ({ page, isOpen, onClose }) => {
  const helpContent = {
    home: {
      title: "🎣 Welcome Aboard!",
      tips: [
        "Click 'Book a Trip' to reserve your fishing adventure",
        "Check the weather before you go - safety first!",
        "Earn points by sharing your catches",
        "New here? Start with a half-day trip to test the waters!"
      ]
    },
    booking: {
      title: "⚓ Booking Your Trip",
      tips: [
        "Pick a date when the weather looks calm",
        "Morning trips = calmer seas usually",
        "Bring sunscreen, water, and snacks",
        "Captain provides rods, bait, and license",
        "Not sure? Call the captain - they love to chat!"
      ]
    },
    weather: {
      title: "⛈️ Weather & Safety",
      tips: [
        "Red alerts = stay on shore, no question!",
        "Yellow warnings = experienced anglers only",
        "Green means go fishing!",
        "We'll email you 24 hours before if weather looks bad",
        "Trust your captain - they know these waters"
      ]
    },
    community: {
      title: "🏆 Community & Points",
      tips: [
        "Post a photo of your catch = 35 points!",
        "Check in daily = 3 points (it adds up!)",
        "Help others with tips = earn helpful votes",
        "7-day streak = 50 bonus points!",
        "Points unlock special badges and perks"
      ]
    },
    location: {
      title: "📍 Location Sharing",
      tips: [
        "Share your location so family knows you're safe",
        "Mark your honey holes (secret fishing spots)",
        "See where other anglers are having luck",
        "Privacy modes: Private, Friends, or Public",
        "GPS uses battery - bring a charger on long trips"
      ]
    },
    profile: {
      title: "👤 Your Profile",
      tips: [
        "Add a photo - let's see that smile!",
        "List your favorite fish to catch",
        "Connect with other anglers",
        "Track your fishing statistics",
        "Captains love to see experienced anglers"
      ]
    }
  };

  const content = helpContent[page] || helpContent.home;

  if (!isOpen) return null;

  return (
    <div className="fishy-help-popup fixed bottom-20 right-4 w-80 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-xl z-50 animate-bounce-in">
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg flex items-center">
            <Fish className="mr-2 text-blue-600 animate-swim" />
            {content.title}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        <ul className="space-y-2">
          {content.tips.map((tip, index) => (
            <li key={index} className="flex items-start text-sm">
              <span className="text-blue-600 mr-2">•</span>
              <span className="text-gray-700">{tip}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 p-3 bg-yellow-100 rounded text-sm">
          <p className="flex items-center">
            <Smile className="mr-2 text-yellow-600" size={16} />
            <strong>Pro Tip:</strong> Confused? Just ask! Everyone was new once.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Main App Component
 */
export default function CharterBookingApp() {
  // State management
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [weatherAlert, setWeatherAlert] = useState(null);
  
  // User stats from gamification
  const { stats, loading: statsLoading } = usePoints(user?.id);
  const { leaderboard } = useLeaderboard('week');

  // Check for user session
  useEffect(() => {
    checkUser();
    checkWeatherAlerts();
    
    // Show help automatically for new users
    const hasSeenHelp = localStorage.getItem('hasSeenHelp');
    if (!hasSeenHelp) {
      setShowHelp(true);
      localStorage.setItem('hasSeenHelp', 'true');
    }
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const checkWeatherAlerts = async () => {
    // Check for any active weather alerts
    const { data } = await supabase
      .from('weather_alerts')
      .select('*')
      .eq('active', true)
      .single();
    
    if (data) {
      setWeatherAlert(data);
    }
  };

  // Navigation items with icons
  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'booking', label: 'Book Trip', icon: Calendar },
    { id: 'weather', label: 'Weather', icon: Cloud },
    { id: 'community', label: 'Community', icon: Trophy },
    { id: 'location', label: 'GPS Track', icon: MapPin },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  if (loading) {
    return (
      <div className="loading-screen flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-100 to-blue-200">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">🎣</div>
          <h2 className="text-2xl font-bold text-blue-800">Getting Your Gear Ready...</h2>
          <p className="text-blue-600 mt-2">Just a moment while we prep the boat!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="mr-4 lg:hidden"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-xl lg:text-2xl font-bold flex items-center">
                <Anchor className="mr-2" />
                Gulf Coast Charters
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-6">
              {navigationItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex items-center px-3 py-2 rounded transition ${
                    currentPage === item.id 
                      ? 'bg-blue-700' 
                      : 'hover:bg-blue-500'
                  }`}
                >
                  <item.icon size={18} className="mr-2" />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* User Info & Help */}
            <div className="flex items-center space-x-4">
              {user && stats && (
                <div className="hidden md:flex items-center bg-blue-700 px-3 py-1 rounded">
                  <Trophy size={16} className="mr-2 text-yellow-400" />
                  <span className="text-sm">{stats.total_points || 0} pts</span>
                </div>
              )}
              
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 bg-blue-700 rounded-full hover:bg-blue-800 transition"
                title="Get Help"
              >
                <HelpCircle size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-blue-700 border-t border-blue-600">
            <nav className="container mx-auto px-4 py-4 space-y-2">
              {navigationItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center w-full px-3 py-2 rounded transition ${
                    currentPage === item.id 
                      ? 'bg-blue-800' 
                      : 'hover:bg-blue-600'
                  }`}
                >
                  <item.icon size={18} className="mr-2" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Weather Alert Banner */}
      {weatherAlert && (
        <div className={`alert-banner p-3 text-center font-semibold ${
          weatherAlert.level === 'danger' ? 'bg-red-500 text-white' :
          weatherAlert.level === 'warning' ? 'bg-yellow-500 text-black' :
          'bg-blue-500 text-white'
        }`}>
          <AlertCircle className="inline mr-2" size={20} />
          {weatherAlert.message}
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentPage === 'home' && <HomePage user={user} stats={stats} />}
        {currentPage === 'booking' && <BookingPage user={user} />}
        {currentPage === 'weather' && <WeatherPage />}
        {currentPage === 'community' && <CommunityPage user={user} leaderboard={leaderboard} />}
        {currentPage === 'location' && (
          <LocationSharing 
            userId={user?.id}
            userType="user"
            showMap={true}
            allowPinning={true}
            allowSharing={true}
          />
        )}
        {currentPage === 'profile' && <ProfilePage user={user} stats={stats} />}
      </main>

      {/* Fishy Help System */}
      <FishyHelp 
        page={currentPage} 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* Floating Help Button */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="fixed bottom-4 right-4 bg-yellow-400 text-gray-800 p-4 rounded-full shadow-lg hover:bg-yellow-300 transition z-30"
        title="Need Help?"
      >
        <Fish size={24} className="animate-wiggle" />
      </button>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-12 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-2">© 2024 Gulf Coast Charters - Fish On! 🎣</p>
          <p className="text-sm text-gray-400">
            Made with ❤️ for anglers of all ages
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Home Page Component
 */
function HomePage({ user, stats }) {
  return (
    <div className="home-page">
      {/* Welcome Hero */}
      <div className="hero-section bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-8 rounded-lg mb-8">
        <h2 className="text-3xl lg:text-4xl font-bold mb-4">
          {user ? `Welcome Back, ${user.email.split('@')[0]}!` : 'Welcome Aboard!'}
        </h2>
        <p className="text-xl mb-6">
          Your next fishing adventure is just a click away! 
        </p>
        <div className="flex flex-wrap gap-4">
          <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
            <Calendar className="inline mr-2" />
            Book Your Trip
          </button>
          <button className="bg-blue-700 px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition">
            <Info className="inline mr-2" />
            How It Works
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {user && stats && (
        <div className="stats-grid grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<Trophy className="text-yellow-500" />}
            label="Your Points"
            value={stats.total_points || 0}
          />
          <StatCard
            icon={<Fish className="text-blue-500" />}
            label="Fish Caught"
            value={stats.fish_caught || 0}
          />
          <StatCard
            icon={<Calendar className="text-green-500" />}
            label="Trips Taken"
            value={stats.trips_logged || 0}
          />
          <StatCard
            icon={<MapPin className="text-red-500" />}
            label="Spots Saved"
            value={stats.spots_shared || 0}
          />
        </div>
      )}

      {/* Features Grid */}
      <div className="features-grid grid md:grid-cols-3 gap-6">
        <FeatureCard
          icon={<Cloud className="text-blue-500" size={32} />}
          title="Weather Alerts"
          description="Get notified 24 hours before your trip if weather looks dangerous"
        />
        <FeatureCard
          icon={<Trophy className="text-yellow-500" size={32} />}
          title="Earn Rewards"
          description="Share your catches, earn points, unlock badges, and climb the leaderboard"
        />
        <FeatureCard
          icon={<MapPin className="text-green-500" size={32} />}
          title="GPS Tracking"
          description="Share your location with family and save your favorite fishing spots"
        />
      </div>
    </div>
  );
}

/**
 * Booking Page Component
 */
function BookingPage({ user }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTrip, setSelectedTrip] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  
  return (
    <div className="booking-page max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Book Your Fishing Trip</h2>
      
      {/* Simple Booking Form */}
      <div className="booking-form bg-white p-6 rounded-lg shadow">
        <div className="space-y-6">
          {/* Date Selection */}
          <div>
            <label className="block text-lg font-medium mb-2">
              When do you want to fish? 🗓️
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-3 text-lg border rounded-lg"
            />
            <p className="text-sm text-gray-600 mt-1">
              Pick a date at least 2 days from now
            </p>
          </div>

          {/* Trip Type */}
          <div>
            <label className="block text-lg font-medium mb-2">
              What kind of trip? 🎣
            </label>
            <select
              value={selectedTrip}
              onChange={(e) => setSelectedTrip(e.target.value)}
              className="w-full p-3 text-lg border rounded-lg"
            >
              <option value="">Choose your adventure...</option>
              <option value="half-day-inshore">Half Day Inshore (4 hours) - $400</option>
              <option value="full-day-inshore">Full Day Inshore (8 hours) - $700</option>
              <option value="half-day-offshore">Half Day Offshore (6 hours) - $800</option>
              <option value="full-day-offshore">Full Day Offshore (10 hours) - $1,400</option>
              <option value="sunset-cruise">Sunset Cruise (2 hours) - $200</option>
            </select>
          </div>

          {/* Passenger Count */}
          <div>
            <label className="block text-lg font-medium mb-2">
              How many anglers? 👥
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                className="bg-gray-200 px-4 py-2 rounded text-xl font-bold hover:bg-gray-300"
              >
                -
              </button>
              <span className="text-2xl font-bold w-12 text-center">
                {passengerCount}
              </span>
              <button
                onClick={() => setPassengerCount(Math.min(6, passengerCount + 1))}
                className="bg-gray-200 px-4 py-2 rounded text-xl font-bold hover:bg-gray-300"
              >
                +
              </button>
              <span className="text-sm text-gray-600">
                (Max 6 people per trip)
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            disabled={!selectedDate || !selectedTrip}
            className="w-full bg-blue-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            Check Availability & Book
          </button>
        </div>
      </div>

      {/* What's Included */}
      <div className="mt-8 bg-green-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">✅ What's Included:</h3>
        <ul className="space-y-2">
          <li>• All fishing rods, reels, and tackle</li>
          <li>• Live bait and lures</li>
          <li>• Fishing license for everyone</li>
          <li>• Fish cleaning and bagging</li>
          <li>• Cooler with ice</li>
          <li>• Safety equipment</li>
        </ul>
      </div>

      {/* What to Bring */}
      <div className="mt-6 bg-yellow-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">🎒 What to Bring:</h3>
        <ul className="space-y-2">
          <li>• Sunscreen (SPF 30+)</li>
          <li>• Sunglasses and hat</li>
          <li>• Snacks and drinks</li>
          <li>• Camera for photos</li>
          <li>• Cooler for your fish (or we can provide)</li>
          <li>• Good attitude and ready to have fun!</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Weather Page Component
 */
function WeatherPage() {
  const [weatherData, setWeatherData] = useState(null);
  
  useEffect(() => {
    // Fetch weather data
    fetchWeatherData();
  }, []);

  const fetchWeatherData = async () => {
    // This would fetch from your weather API
    setWeatherData({
      current: {
        temp: 78,
        wind: 12,
        waves: 2.5,
        conditions: 'Partly Cloudy'
      },
      forecast: [
        { day: 'Today', conditions: 'safe', high: 82, low: 68 },
        { day: 'Tomorrow', conditions: 'safe', high: 84, low: 70 },
        { day: 'Sunday', conditions: 'caution', high: 86, low: 72 }
      ]
    });
  };

  return (
    <div className="weather-page max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Weather & Sea Conditions</h2>

      {/* Current Conditions */}
      <div className="current-weather bg-gradient-to-r from-blue-400 to-blue-600 text-white p-6 rounded-lg mb-6">
        <h3 className="text-xl font-bold mb-4">Current Conditions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-3xl font-bold">78°F</p>
            <p className="text-sm">Temperature</p>
          </div>
          <div>
            <p className="text-3xl font-bold">12 kt</p>
            <p className="text-sm">Wind Speed</p>
          </div>
          <div>
            <p className="text-3xl font-bold">2.5 ft</p>
            <p className="text-sm">Wave Height</p>
          </div>
          <div>
            <p className="text-3xl font-bold">Good</p>
            <p className="text-sm">Fishing</p>
          </div>
        </div>
      </div>

      {/* Safety Status */}
      <div className="safety-status bg-green-100 border-2 border-green-400 p-6 rounded-lg mb-6">
        <h3 className="text-xl font-bold mb-2 text-green-800">
          ✅ Safe for Charter Operations
        </h3>
        <p className="text-green-700">
          Conditions are favorable for all types of fishing trips today.
        </p>
      </div>

      {/* 3-Day Forecast */}
      <div className="forecast">
        <h3 className="text-xl font-bold mb-4">3-Day Forecast</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {weatherData?.forecast.map((day, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow">
              <h4 className="font-bold text-lg mb-2">{day.day}</h4>
              <div className={`status-badge inline-block px-3 py-1 rounded text-sm font-medium mb-2 ${
                day.conditions === 'safe' ? 'bg-green-100 text-green-800' :
                day.conditions === 'caution' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {day.conditions === 'safe' ? '✅ Good' :
                 day.conditions === 'caution' ? '⚠️ Caution' :
                 '❌ Poor'}
              </div>
              <p className="text-2xl font-bold">{day.high}°</p>
              <p className="text-gray-600">Low: {day.low}°</p>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="legend mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Understanding Conditions</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded font-medium mr-3">
              ✅ Good
            </span>
            <span>Perfect conditions for fishing - calm seas, light winds</span>
          </div>
          <div className="flex items-center">
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-medium mr-3">
              ⚠️ Caution
            </span>
            <span>Fishable but may be choppy - not for those prone to seasickness</span>
          </div>
          <div className="flex items-center">
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded font-medium mr-3">
              ❌ Poor
            </span>
            <span>Dangerous conditions - trips will be cancelled/rescheduled</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Community Page Component
 */
function CommunityPage({ user, leaderboard }) {
  return (
    <div className="community-page">
      <h2 className="text-3xl font-bold mb-6">Fishing Community</h2>

      {/* Leaderboard */}
      <div className="leaderboard bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Trophy className="mr-2 text-yellow-500" />
          This Week's Top Anglers
        </h3>
        <div className="space-y-3">
          {leaderboard?.slice(0, 5).map((angler, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center">
                <span className={`text-2xl font-bold mr-3 ${
                  index === 0 ? 'text-yellow-500' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  #{index + 1}
                </span>
                <div>
                  <p className="font-semibold">{angler.username || 'Anonymous Angler'}</p>
                  <p className="text-sm text-gray-600">{angler.trust_level_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{angler.points} pts</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions grid md:grid-cols-3 gap-4">
        <button className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600">
          <Fish className="mx-auto mb-2" size={32} />
          Post Your Catch
        </button>
        <button className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600">
          <MapPin className="mx-auto mb-2" size={32} />
          Share a Spot
        </button>
        <button className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600">
          <HelpCircle className="mx-auto mb-2" size={32} />
          Ask for Tips
        </button>
      </div>
    </div>
  );
}

/**
 * Profile Page Component
 */
function ProfilePage({ user, stats }) {
  return (
    <div className="profile-page max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Your Profile</h2>

      {user ? (
        <div className="profile-content bg-white p-6 rounded-lg shadow">
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-2">Account Info</h3>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Member Since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
          </div>

          {stats && (
            <div className="stats-section">
              <h3 className="text-xl font-bold mb-4">Your Fishing Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="stat-box bg-blue-50 p-4 rounded">
                  <p className="text-3xl font-bold text-blue-600">{stats.total_points || 0}</p>
                  <p className="text-sm">Total Points</p>
                </div>
                <div className="stat-box bg-green-50 p-4 rounded">
                  <p className="text-3xl font-bold text-green-600">{stats.current_streak || 0}</p>
                  <p className="text-sm">Day Streak</p>
                </div>
                <div className="stat-box bg-yellow-50 p-4 rounded">
                  <p className="text-3xl font-bold text-yellow-600">{stats.posts_count || 0}</p>
                  <p className="text-sm">Posts Shared</p>
                </div>
                <div className="stat-box bg-purple-50 p-4 rounded">
                  <p className="text-3xl font-bold text-purple-600">{stats.helpful_votes || 0}</p>
                  <p className="text-sm">Helpful Votes</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-xl mb-4">Please sign in to view your profile</p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Helper Components
 */
function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="feature-card bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// CSS Animations (add to global CSS)
const animations = `
<style>
@keyframes swim {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(5px); }
}

@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

@keyframes bounce-in {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.animate-swim {
  animation: swim 2s ease-in-out infinite;
}

.animate-wiggle {
  animation: wiggle 1s ease-in-out infinite;
}

.animate-bounce-in {
  animation: bounce-in 0.3s ease-out;
}
</style>
`;

export { animations };
