'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Fish, 
  MapPin, 
  Calendar, 
  Award, 
  Star,
  Anchor,
  Waves,
  Compass,
  Trophy,
  Heart,
  Clock,
  TrendingUp,
  Globe,
  Target,
  Navigation,
  Radio,
  Cloud,
  Wind,
  BarChart3,
  Activity,
  Zap,
  Shield,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  ArrowRight,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';

import { GCCLayout } from './GCCLayout';
import { TopBannerAd, ContentAd, NativeAd, SidebarAd } from './AdManager';

// Types
interface UserStats {
  totalCatches: number;
  biggestFish: string;
  favoriteSpot: string;
  nextTrip: string;
  communityRank: string;
  totalPoints: number;
}

interface GlobalStats {
  totalMembers: number;
  onlineNow: number;
  countriesActive: number;
  fishCaughtToday: number;
}

interface Charter {
  time: string;
  type: string;
  passengers: number;
  boat: string;
  location: string;
  price: string;
}

interface Catch {
  user: string;
  fish: string;
  location: string;
  time: string;
  weight?: string;
  photo?: string;
}

// Main Component
export default function FishyPlatform() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState<'angler' | 'captain' | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalMembers: 15234,
    onlineNow: 892,
    countriesActive: 47,
    fishCaughtToday: 3421
  });

  useEffect(() => {
    // Check user status
    const checkUser = () => {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          setIsLoggedIn(true);
          setUserType(userData.type || 'angler');
        } catch (e) {
          console.log('User check error:', e);
        }
      }
    };
    checkUser();

    // Simulate live community stats
    const interval = setInterval(() => {
      setGlobalStats(prev => ({
        ...prev,
        onlineNow: Math.max(100, prev.onlineNow + Math.floor(Math.random() * 10 - 5)),
        fishCaughtToday: prev.fishCaughtToday + Math.floor(Math.random() * 5)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <GCCLayout 
      showAds={true} 
      userType={userType || 'guest'} 
      userLocation="gulf-coast"
    >
      {/* Global Community Ticker */}
      <div className="gcc-ad-top-banner">
        <div className="gcc-ad-label">🌍 LIVE COMMUNITY</div>
        <div className="gcc-ad-content bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
          <div className="flex items-center justify-center gap-8 text-sm font-bold">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {globalStats.onlineNow} anglers online
            </span>
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {globalStats.countriesActive} countries
            </span>
            <span className="flex items-center gap-2">
              <Fish className="w-4 h-4" />
              {globalStats.fishCaughtToday} fish today
            </span>
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              {globalStats.totalMembers.toLocaleString()} members
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Content */}
      {!isLoggedIn ? (
        <GlobalFishingCommunityLanding globalStats={globalStats} />
      ) : userType === 'captain' ? (
        <CaptainCommandCenter />
      ) : (
        <AnglerParadiseDashboard />
      )}
    </GCCLayout>
  );
}

// Global Fishing Community Landing
function GlobalFishingCommunityLanding({ globalStats }: { globalStats: GlobalStats }) {
  return (
    <div className="gcc-container">
      {/* Hero Section */}
      <section className="gcc-hero">
        <div className="gcc-hero-content">
          <h1 className="gcc-text-display">
            🎣 Hook Into The Ultimate Fishing Experience! 🎣
          </h1>
          
          <h2 className="text-3xl md:text-4xl font-bold text-yellow-300 mb-6">
            Book Gulf Coast Charters • Join Global Community
          </h2>
          
          <p className="gcc-text-body-lg text-white/90 max-w-4xl mx-auto mb-8">
            🌊 Whether you're casting lines in Alabama, angling in Australia, or fishing in France - 
            our WORLDWIDE community connects you! But when you're ready to fish the Gulf Coast, 
            we've got the ONLY verified charter captains from Texas to Florida! 🚢
          </p>

          <div className="gcc-hero-actions">
            <a href="/booking" className="gcc-btn gcc-btn-secondary gcc-btn-lg">
              <Anchor className="w-5 h-5" />
              ⚓ BOOK GULF COAST CHARTER NOW!
            </a>
            <a href="/community" className="gcc-btn gcc-btn-outline gcc-btn-lg text-white border-white hover:bg-white hover:text-ocean-600">
              <Globe className="w-5 h-5" />
              🌍 JOIN GLOBAL COMMUNITY FREE!
            </a>
          </div>

          {/* Live Stats */}
          <div className="mt-12 p-6 bg-white/10 backdrop-blur-md rounded-2xl">
            <h3 className="text-2xl font-bold text-yellow-300 mb-6 text-center">
              🔴 LIVE COMMUNITY STATS
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <LiveStat 
                value={globalStats.onlineNow} 
                label="Anglers Online Now" 
                icon={<Users className="w-6 h-6" />}
                color="text-yellow-300"
              />
              <LiveStat 
                value={globalStats.fishCaughtToday} 
                label="Fish Caught Today" 
                icon={<Fish className="w-6 h-6" />}
                color="text-green-300"
              />
              <LiveStat 
                value={globalStats.countriesActive} 
                label="Countries Active" 
                icon={<Globe className="w-6 h-6" />}
                color="text-orange-300"
              />
              <LiveStat 
                value="42" 
                label="Gulf Charters Today" 
                icon={<Anchor className="w-6 h-6" />}
                color="text-blue-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content Ad */}
      <ContentAd userType="guest" userLocation="gulf-coast" />

      {/* Gulf Coast Exclusive Charters */}
      <section className="py-20 bg-sand-50">
        <div className="gcc-container">
          <h2 className="gcc-text-heading-1 text-center mb-6">
            ⚓ GULF COAST EXCLUSIVE CHARTERS ⚓
          </h2>
          <p className="gcc-text-body-lg text-gray-600 text-center mb-12 max-w-4xl mx-auto">
            🎣 From Padre Island to the Florida Keys - We've Got Every Gulf Water Covered! 
            Inshore flats, offshore deep sea, bay fishing, and reef adventures!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

          {/* Captain Application CTA */}
          <div className="mt-16 p-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl text-white text-center">
            <h3 className="text-3xl font-bold mb-4">
              ⚠️ CHARTER CAPTAINS: GULF COAST ONLY! ⚠️
            </h3>
            <p className="text-xl mb-6">
              We ONLY accept charter boats operating in Gulf Coast waters (inland or offshore).
              From Texas to Florida - if you're not fishing these waters, you can't list here!
            </p>
            <a href="/captain/apply" className="gcc-btn gcc-btn-primary gcc-btn-lg bg-white text-orange-500 hover:bg-gray-100">
              ⚓ Apply as Gulf Coast Captain
            </a>
          </div>
        </div>
      </section>

      {/* Native Ad */}
      <NativeAd userType="guest" userLocation="gulf-coast" />

      {/* Worldwide Community Features */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="gcc-container">
          <h2 className="gcc-text-heading-1 text-center mb-6 text-yellow-300">
            🌍 JOIN THE GLOBAL FISHING COMMUNITY! 🌍
          </h2>
          <p className="gcc-text-body-lg text-center mb-16 text-gray-300">
            From Antarctica to Zimbabwe - Every Angler is Welcome!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

          {/* Community CTA */}
          <div className="mt-20 text-center p-12 bg-gradient-to-r from-purple-600 to-purple-800 rounded-3xl">
            <h3 className="text-4xl font-bold mb-6">
              🎣 Ready to Join 15,000+ Anglers? 🎣
            </h3>
            <p className="text-xl mb-8">
              Free forever! Connect with the world's fishing community!
            </p>
            <a href="/signup" className="gcc-btn gcc-btn-primary gcc-btn-xl bg-white text-purple-700 hover:bg-gray-100">
              <Globe className="w-6 h-6" />
              🌍 JOIN THE SCHOOL NOW!
            </a>
          </div>
        </div>
      </section>

      {/* Footer Ad */}
      <ContentAd userType="guest" userLocation="gulf-coast" />
    </div>
  );
}

// Helper Components
function LiveStat({ 
  value, 
  label, 
  icon, 
  color 
}: { 
  value: string | number; 
  label: string; 
  icon: React.ReactNode; 
  color: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-4xl font-bold ${color} mb-2`}>
        {value}
      </div>
      <div className="text-white/80 text-sm">
        {label}
      </div>
    </div>
  );
}

function CharterCard({ 
  icon, 
  title, 
  description, 
  locations, 
  link 
}: {
  icon: string;
  title: string;
  description: string;
  locations: string;
  link: string;
}) {
  return (
    <a 
      href={link}
      className="gcc-card block group hover:border-ocean-300 transition-all duration-300"
    >
      <div className="gcc-card-body text-center">
        <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          {title}
        </h3>
        <p className="text-gray-600 mb-4">
          {description}
        </p>
        <div className="p-3 bg-ocean-50 rounded-lg">
          <p className="text-sm text-ocean-700 font-medium">
            📍 {locations}
          </p>
        </div>
      </div>
    </a>
  );
}

function CommunityFeature({ 
  icon, 
  title, 
  description, 
  highlight 
}: {
  icon: string;
  title: string;
  description: string;
  highlight: string;
}) {
  return (
    <div className="gcc-card bg-gray-800 border-gray-700 hover:border-purple-500 transition-all duration-300 group">
      <div className="gcc-card-body text-center">
        <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-yellow-300 mb-3">
          {title}
        </h3>
        <p className="text-gray-300 mb-4">
          {description}
        </p>
        <div className="p-3 bg-purple-900/50 rounded-lg">
          <p className="text-sm text-purple-300 font-medium">
            🔥 {highlight}
          </p>
        </div>
      </div>
    </div>
  );
}

// Angler Paradise Dashboard
function AnglerParadiseDashboard() {
  const [stats] = useState<UserStats>({
    totalCatches: 127,
    biggestFish: "42lb Red Snapper",
    favoriteSpot: "Orange Beach Pier",
    nextTrip: "Dec 5, 2024",
    communityRank: "#234",
    totalPoints: 8750
  });

  return (
    <div className="gcc-container py-8">
      <h1 className="gcc-text-heading-1 text-center text-white mb-8">
        🎣 Welcome Back to Your Fishing Paradise! 🎣
      </h1>
      
      {/* Angler Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <AnglerStat 
          label="Total Catches" 
          value={stats.totalCatches.toString()} 
          icon={<Fish className="w-6 h-6" />} 
          color="text-green-400" 
        />
        <AnglerStat 
          label="Biggest Catch" 
          value={stats.biggestFish} 
          icon={<Trophy className="w-6 h-6" />} 
          color="text-yellow-400" 
        />
        <AnglerStat 
          label="Community Rank" 
          value={stats.communityRank} 
          icon={<Globe className="w-6 h-6" />} 
          color="text-purple-400" 
        />
        <AnglerStat 
          label="Fishy Points" 
          value={stats.totalPoints.toString()} 
          icon={<Star className="w-6 h-6" />} 
          color="text-orange-400" 
        />
        <AnglerStat 
          label="Next Charter" 
          value={stats.nextTrip} 
          icon={<Calendar className="w-6 h-6" />} 
          color="text-blue-400" 
        />
        <AnglerStat 
          label="Favorite Spot" 
          value={stats.favoriteSpot} 
          icon={<MapPin className="w-6 h-6" />} 
          color="text-pink-400" 
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <FishyAction 
          icon={<Anchor className="w-8 h-8" />}
          title="Book Another Charter"
          description="Gulf Coast adventures await!"
          href="/booking"
          color="bg-green-600 hover:bg-green-700"
        />
        <FishyAction 
          icon={<Camera className="w-8 h-8" />}
          title="Upload Catch"
          description="Show off your latest trophy!"
          href="/upload-catch"
          color="bg-yellow-600 hover:bg-yellow-700"
        />
        <FishyAction 
          icon={<Globe className="w-8 h-8" />}
          title="Community Feed"
          description="See what's biting worldwide!"
          href="/community"
          color="bg-purple-600 hover:bg-purple-700"
        />
        <FishyAction 
          icon={<MapPin className="w-8 h-8" />}
          title="Fishing Map"
          description="Find the hot spots!"
          href="/map"
          color="bg-red-600 hover:bg-red-700"
        />
      </div>

      {/* Recent Catches Feed */}
      <div className="gcc-card">
        <div className="gcc-card-header">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Waves className="w-5 h-5" />
            Latest Catches from Your Fishing Buddies
          </h2>
        </div>
        <div className="gcc-card-body">
          <CatchFeed />
        </div>
      </div>
    </div>
  );
}

// Captain Command Center
function CaptainCommandCenter() {
  const [stats] = useState({
    todayCharters: 3,
    weekRevenue: "$4,850",
    monthlyBookings: 42,
    rating: "4.9 ⭐",
    weatherStatus: "Perfect",
    nextCharter: "6:00 AM"
  });

  return (
    <div className="gcc-container py-8">
      <h1 className="gcc-text-heading-1 text-center text-white mb-8">
        ⚓ Captain's Command Center ⚓
      </h1>

      {/* Captain Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <AnglerStat 
          label="Today's Charters" 
          value={stats.todayCharters.toString()} 
          icon={<Anchor className="w-6 h-6" />} 
          color="text-red-400" 
        />
        <AnglerStat 
          label="Week Revenue" 
          value={stats.weekRevenue} 
          icon={<TrendingUp className="w-6 h-6" />} 
          color="text-green-400" 
        />
        <AnglerStat 
          label="Monthly Bookings" 
          value={stats.monthlyBookings.toString()} 
          icon={<Calendar className="w-6 h-6" />} 
          color="text-yellow-400" 
        />
        <AnglerStat 
          label="Captain Rating" 
          value={stats.rating} 
          icon={<Star className="w-6 h-6" />} 
          color="text-purple-400" 
        />
        <AnglerStat 
          label="Weather Status" 
          value={stats.weatherStatus} 
          icon={<Sun className="w-6 h-6" />} 
          color="text-blue-400" 
        />
        <AnglerStat 
          label="Next Charter" 
          value={stats.nextCharter} 
          icon={<Clock className="w-6 h-6" />} 
          color="text-pink-400" 
        />
      </div>

      {/* Gulf Coast Exclusive Notice */}
      <div className="bg-red-600 text-white p-6 rounded-xl mb-8 text-center">
        <h3 className="text-2xl font-bold mb-3">
          ⚓ GULF COAST EXCLUSIVE CAPTAIN ⚓
        </h3>
        <p>Your charters are visible to our global community of 15,000+ anglers!</p>
        <p>Remember: Only Gulf Coast waters (Texas to Florida, inland & offshore)</p>
      </div>

      {/* Today's Manifest */}
      <div className="gcc-card">
        <div className="gcc-card-header">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Anchor className="w-5 h-5" />
            Today's Charter Manifest
          </h2>
        </div>
        <div className="gcc-card-body">
          <CharterManifest />
        </div>
      </div>
    </div>
  );
}

// Additional Helper Components
function AnglerStat({ 
  label, 
  value, 
  icon, 
  color 
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="gcc-card bg-gray-800/50 backdrop-blur-sm border-gray-700">
      <div className="gcc-card-body text-center p-4">
        <div className={`${color} mb-2 flex justify-center`}>
          {icon}
        </div>
        <p className="text-gray-400 text-sm mb-1">{label}</p>
        <p className="text-white text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function FishyAction({ 
  icon, 
  title, 
  description, 
  href, 
  color 
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <a 
      href={href}
      className={`gcc-card ${color} text-white hover:scale-105 transition-transform cursor-pointer`}
    >
      <div className="gcc-card-body text-center p-6">
        <div className="mb-3 flex justify-center">
          {icon}
        </div>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm opacity-90">{description}</p>
      </div>
    </a>
  );
}

function CatchFeed() {
  const catches: Catch[] = [
    { user: "BigMike_Texas", fish: "45lb Red Drum", location: "Port Aransas", time: "2 hours ago" },
    { user: "Sarah_Angler", fish: "28lb King Mackerel", location: "Destin", time: "3 hours ago" },
    { user: "CaptainJoe", fish: "Giant Tarpon", location: "Boca Grande", time: "5 hours ago" },
    { user: "FishingQueen", fish: "Trophy Redfish", location: "Venice, LA", time: "Today" }
  ];

  return (
    <div className="space-y-3">
      {catches.map((catch_, idx) => (
        <div key={idx} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
          <div>
            <p className="font-bold text-yellow-300">
              @{catch_.user} caught a {catch_.fish}!
            </p>
            <p className="text-gray-400 text-sm">
              📍 {catch_.location} • {catch_.time}
            </p>
          </div>
          <button className="gcc-btn gcc-btn-success gcc-btn-sm">
            🎉 Nice Catch!
          </button>
        </div>
      ))}
    </div>
  );
}

function CharterManifest() {
  const charters: Charter[] = [
    { time: "6:00 AM", type: "Deep Sea", passengers: 4, boat: "Reel Deal", location: "Orange Beach", price: "$1,200" },
    { time: "10:00 AM", type: "Inshore", passengers: 2, boat: "Bay Runner", location: "Gulf Shores", price: "$600" },
    { time: "2:00 PM", type: "Sunset Cruise", passengers: 6, boat: "Sea Dreams", location: "Perdido Key", price: "$800" }
  ];

  return (
    <div className="space-y-3">
      {charters.map((charter, idx) => (
        <div key={idx} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
          <div>
            <p className="font-bold text-yellow-300 text-lg">
              ⏰ {charter.time} - {charter.type}
            </p>
            <p className="text-gray-400">
              👥 {charter.passengers} passengers • 🚤 {charter.boat} • 📍 {charter.location}
            </p>
            <p className="text-green-400 font-bold">{charter.price}</p>
          </div>
          <button className="gcc-btn gcc-btn-primary">
            View Details
          </button>
        </div>
      ))}
    </div>
  );
}

// Missing icon imports
const Camera = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Sun = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
