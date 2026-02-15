
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
    <div className= min-h-screen bg-slate-900>
      <header className=bg-slate-800 border-b border-slate-700 sticky top-0 z-50>
        <div className=max-w-7xl mx-auto px-4 py-4>
          <div className=flex items-center justify-between>
            <div className=flex items-center gap-3>
              <div className=w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center>
                <Sun className=w-6 h-6 text-white />
              </div>
              <div>
                <h1 className=text-xl font-bold text-white>Camper Assistant</h1>
                <p className=text-xs text-slate-400>Your wilderness companion</p>
              </div>
            </div>
            <div className=flex items-center gap-4 text-sm text-slate-300>
              <div className=flex items-center gap-2>
                <MapPin className=w-4 h-4 />
                <span>Current Location</span>
              </div>
              <div className=flex items-center gap-2>
                <Clock className=w-4 h-4 />
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className=bg-slate-800 border-b border-slate-700 overflow-x-auto>
        <div className=max-w-7xl mx-auto px-4>
          <div className=flex gap-1 py-2>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={lex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap }
                >
                  <Icon className=w-4 h-4 />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className=max-w-7xl mx-auto px-4 py-6>
        {activeTab === 'dashboard' && (
          <div className=grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6>
            <div className=bg-slate-800 rounded-xl p-6 border border-slate-700>
              <div className=flex items-center gap-3 mb-4>
                <Sun className=w-6 h-6 text-amber-400 />
                <h2 className=text-lg font-semibold>Solar Production</h2>
              </div>
              <div className=text-3xl font-bold text-amber-400 mb-2>245W</div>
              <p className=text-slate-400 text-sm>Optimal tilt angle: 42°</p>
              <div className=mt-4 flex items-center gap-2 text-sm text-emerald-400>
                <ChevronRight className=w-4 h-4 />
                <span>View detailed solar data</span>
              </div>
            </div>

            <div className=bg-slate-800 rounded-xl p-6 border border-slate-700>
              <div className=flex items-center gap-3 mb-4>
                <CloudRain className=w-6 h-6 text-blue-400 />
                <h2 className=text-lg font-semibold>Weather</h2>
              </div>
              <div className=text-3xl font-bold text-blue-400 mb-2>72°F</div>
              <p className=text-slate-400 text-sm>Partly cloudy, 45% humidity</p>
              <div className=mt-4 flex items-center gap-2 text-sm text-red-400>
                <AlertTriangle className=w-4 h-4 />
                <span>Storm warning: 6PM</span>
              </div>
            </div>

            <div className=bg-slate-800 rounded-xl p-6 border border-slate-700>
              <div className=flex items-center gap-3 mb-4>
                <Battery className=w-6 h-6 text-emerald-400 />
                <h2 className=text-lg font-semibold>Battery</h2>
              </div>
              <div className=text-3xl font-bold text-emerald-400 mb-2>87%</div>
              <p className=text-slate-400 text-sm>12.6V • 18 hours remaining</p>
              <div className=mt-4 w-full bg-slate-700 rounded-full h-2>
                <div className=bg-emerald-500 h-2 rounded-full style={{ width: '87%' }}></div>
              </div>
            </div>

            <div className=bg-slate-800 rounded-xl p-6 border border-slate-700 md:col-span-2 lg:col-span-3>
              <h2 className=text-lg font-semibold mb-4>Quick Actions</h2>
              <div className=grid grid-cols-2 md:grid-cols-4 gap-4>
                <button onClick={() => setActiveTab('recipes')} className=bg-slate-700 hover:bg-slate-600 rounded-lg p-4 text-left>
                  <Utensils className=w-6 h-6 text-orange-400 mb-2 />
                  <div className=font-medium>Find Recipe</div>
                  <div className=text-xs text-slate-400>From your ingredients</div>
                </button>
                <button onClick={() => setActiveTab('assistant')} className=bg-slate-700 hover:bg-slate-600 rounded-lg p-4 text-left>
                  <MessageCircle className=w-6 h-6 text-purple-400 mb-2 />
                  <div className=font-medium>Ask Assistant</div>
                  <div className=text-xs text-slate-400>Camping questions</div>
                </button>
                <button onClick={() => setActiveTab('planner')} className=bg-slate-700 hover:bg-slate-600 rounded-lg p-4 text-left>
                  <Backpack className=w-6 h-6 text-cyan-400 mb-2 />
                  <div className=font-medium>Trip Planner</div>
                  <div className=text-xs text-slate-400>Pack for weather</div>
                </button>
                <button onClick={() => setActiveTab('alarm')} className=bg-slate-700 hover:bg-slate-600 rounded-lg p-4 text-left>
                  <Bell className=w-6 h-6 text-red-400 mb-2 />
                  <div className=font-medium>Set Alarm</div>
                  <div className=text-xs text-slate-400>Wake up on time</div>
                </button>
              </div>
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

