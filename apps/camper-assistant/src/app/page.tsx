
'use client';

import { useState, useEffect } from 'react';
import {
  Sun, Battery, CloudRain, Thermometer, Wind,
  Utensils, MessageCircle, Backpack, Bell, Music,
  Tv, AlertTriangle, ChevronRight, MapPin, Clock
} from 'lucide-react';
import SolarPanel from './components/SolarPanel';
import WeatherWidget from './components/WeatherWidget';
import BatteryMonitor from './components/BatteryMonitor';
import RecipeManager from './components/RecipeManager';
import TripPlanner from './components/TripPlanner';
import CampingChat from './components/CampingChat';
import AlarmClock from './components/AlarmClock';
import TVGuide from './components/TVGuide';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Sun },
    { id: 'solar', label: 'Solar', icon: Sun },
    { id: 'weather', label: 'Weather', icon: CloudRain },
    { id: 'battery', label: 'Battery', icon: Battery },
    { id: 'recipes', label: 'Recipes', icon: Utensils },
    { id: 'assistant', label: 'Assistant', icon: MessageCircle },
    { id: 'planner', label: 'Trip Planner', icon: Backpack },
    { id: 'alarm', label: 'Alarm', icon: Bell },
    { id: 'tv', label: 'TV Guide', icon: Tv },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Camper Assistant</h1>
                <p className="text-xs text-slate-400">Your wilderness companion</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Current Location</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-slate-800 border-b border-slate-700 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <Sun className="w-6 h-6 text-amber-400" />
                <h2 className="text-lg font-semibold mb-2">Solar Production</h2>
              </div>
              <div className="text-3xl font-bold text-amber-400">245W</div>
              <p className="text-slate-400 text-sm">Optimal tilt angle: 42°</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <CloudRain className="w-6 h-6 text-blue-400" />
                <h2 className="text-lg font-semibold mb-2">Weather</h2>
              </div>
              <div className="text-3xl font-bold text-blue-400">72°F</div>
              <p className="text-slate-400 text-sm">Partly cloudy, 45% humidity</p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <Battery className="w-6 h-6 text-emerald-400" />
                <h2 className="text-lg font-semibold mb-2">Battery</h2>
              </div>
              <div className="text-3xl font-bold text-emerald-400">87%</div>
              <p className="text-slate-400 text-sm">12.6V • 18 hours remaining</p>
            </div>
          </div>
        )}

        {activeTab === 'solar' && <SolarPanel />}
        {activeTab === 'weather' && <WeatherWidget />}
        {activeTab === 'battery' && <BatteryMonitor />}
        {activeTab === 'recipes' && <RecipeManager />}
        {activeTab === 'assistant' && <CampingChat />}
        {activeTab === 'planner' && <TripPlanner />}
        {activeTab === 'alarm' && <AlarmClock />}
        {activeTab === 'tv' && <TVGuide />}
      </main>
    </div>
  );
}

