'use client';

import { useState, useMemo } from 'react';
import {
  Fish,
  Moon,
  MapPin,
  Thermometer,
  Wind,
  Calendar,
  Clock,
  AlertTriangle,
  Check,
  Info,
  TrendingUp,
  Droplets,
  Sunrise,
  Sunset,
  Search
} from 'lucide-react';

// Fish species database with preferences
const FISH_SPECIES = [
  {
    name: 'Bass (Largemouth)',
    bestTemp: { min: 60, max: 75 },
    bestMoon: ['full', 'new', 'waxing-gibbous'],
    bestTime: ['dawn', 'dusk'],
    baits: ['Plastic Worms', 'Crankbaits', 'Spinnerbaits', 'Jigs', 'Topwater'],
    techniques: ['Slow retrieve near cover', 'Deep diving in summer', 'Topwater at dawn'],
    seasonPeak: 'spring-fall',
    depth: 'shallow to 15ft',
    activity: 'aggressive'
  },
  {
    name: 'Trout (Rainbow/Brown)',
    bestTemp: { min: 50, max: 65 },
    bestMoon: ['new', 'first-quarter', 'last-quarter'],
    bestTime: ['dawn', 'overcast'],
    baits: ['PowerBait', 'Salmon Eggs', 'Spinners', 'Fly Patterns', 'Worms'],
    techniques: ['Drift fishing', 'Fly fishing', 'Still fishing with bait'],
    seasonPeak: 'spring-fall',
    depth: 'surface to 20ft',
    activity: 'selective'
  },
  {
    name: 'Catfish',
    bestTemp: { min: 70, max: 85 },
    bestMoon: ['full', 'new'],
    bestTime: ['night', 'dusk', 'dawn'],
    baits: ['Chicken Liver', 'Shrimp', 'Cut Bait', 'Stink Bait', 'Nightcrawlers'],
    techniques: ['Bottom fishing', 'Set lines', 'Drifting'],
    seasonPeak: 'summer',
    depth: 'bottom',
    activity: 'scavenger'
  },
  {
    name: 'Crappie',
    bestTemp: { min: 55, max: 70 },
    bestMoon: ['full', 'new'],
    bestTime: ['dawn', 'dusk'],
    baits: ['Minnows', 'Jigs', 'Crappie Nibbles', 'Small Spinners'],
    techniques: ['Vertical jigging', 'Spider rigging', 'Dock shooting'],
    seasonPeak: 'spring-spawn',
    depth: '3-15ft',
    activity: 'schooling'
  },
  {
    name: 'Walleye',
    bestTemp: { min: 55, max: 72 },
    bestMoon: ['new', 'full'],
    bestTime: ['dusk', 'night', 'dawn'],
    baits: ['Minnows', 'Jigs', 'Crankbaits', 'Live Leeches'],
    techniques: ['Trolling', 'Jigging', 'Live bait rigging'],
    seasonPeak: 'spring-fall',
    depth: '10-25ft',
    activity: 'low-light feeder'
  },
  {
    name: 'Panfish (Bluegill/Sunfish)',
    bestTemp: { min: 65, max: 80 },
    bestMoon: ['full', 'new'],
    bestTime: ['morning', 'evening'],
    baits: ['Worms', 'Crickets', 'Small Jigs', 'Bread Balls'],
    techniques: ['Bobber fishing', 'Ultralight spinning', 'Fly fishing'],
    seasonPeak: 'spring-summer',
    depth: 'shallow',
    activity: 'schooling'
  }
];

// Moon phase calculation
const getMoonPhase = (date: Date) => {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();

  let c, e, jd, b;
  if (month < 3) { year--; month += 12; }
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  b = parseInt(jd.toString());
  jd -= b;
  b = Math.round(jd * 8);
  if (b >= 8) b = 0;

  const phases = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous',
    'full', 'waning-gibbous', 'last-quarter', 'waning-crescent'];
  return phases[b];
};

const getMoonPhaseName = (phase: string) => {
  const names: Record<string, string> = {
    'new': 'New Moon 🌑',
    'waxing-crescent': 'Waxing Crescent 🌒',
    'first-quarter': 'First Quarter 🌓',
    'waxing-gibbous': 'Waxing Gibbous 🌔',
    'full': 'Full Moon 🌕',
    'waning-gibbous': 'Waning Gibbous 🌖',
    'last-quarter': 'Last Quarter 🌗',
    'waning-crescent': 'Waning Crescent 🌘'
  };
  return names[phase] || phase;
};

// Solunar rating calculation
const calculateSolunarRating = (fish: typeof FISH_SPECIES[0], moonPhase: string, hour: number, temp: number) => {
  let rating = 0;

  // Moon phase match (40% weight)
  if (fish.bestMoon.includes(moonPhase)) rating += 40;
  else if (fish.bestMoon.some(m => moonPhase.includes(m))) rating += 20;

  // Time of day match (35% weight)
  const isDawn = hour >= 5 && hour <= 8;
  const isDusk = hour >= 17 && hour <= 20;
  const isNight = hour >= 20 || hour <= 5;
  const isOvercast = hour >= 12 && hour <= 15; // simulated

  if ((fish.bestTime.includes('dawn') && isDawn) ||
    (fish.bestTime.includes('dusk') && isDusk) ||
    (fish.bestTime.includes('night') && isNight) ||
    (fish.bestTime.includes('overcast') && isOvercast)) {
    rating += 35;
  }

  // Temperature match (25% weight)
  if (temp >= fish.bestTemp.min && temp <= fish.bestTemp.max) rating += 25;
  else if (temp >= fish.bestTemp.min - 5 && temp <= fish.bestTemp.max + 5) rating += 15;

  return rating;
};

export default function FishingIntelligence() {
  const [location, setLocation] = useState('25965');
  const [waterTemp, setWaterTemp] = useState(68);
  const [selectedFish, setSelectedFish] = useState<string>('Bass (Largemouth)');
  const [currentHour, setCurrentHour] = useState(new Date().getHours());

  const today = new Date();
  const moonPhase = useMemo(() => getMoonPhase(today), [today]);
  const moonPhaseName = getMoonPhaseName(moonPhase);

  const fish = FISH_SPECIES.find(f => f.name === selectedFish) || FISH_SPECIES[0];
  const solunarRating = calculateSolunarRating(fish, moonPhase, currentHour, waterTemp);

  const getRatingColor = (rating: number) => {
    if (rating >= 80) return 'text-emerald-400';
    if (rating >= 60) return 'text-amber-400';
    if (rating >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 80) return 'EXCELLENT';
    if (rating >= 60) return 'GOOD';
    if (rating >= 40) return 'FAIR';
    return 'POOR';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3">
          <Fish className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold">Fishing Intelligence</h2>
        </div>
        <p className="text-slate-400 mt-2">
          AI-powered fishing recommendations based on moon phase, water temp, and time of day.
        </p>
      </div>

      {/* Solunar Rating Hero */}
      <div className={`rounded-xl p-6 border-2 ${solunarRating >= 60 ? 'border-emerald-600 bg-emerald-900/20' : 'border-amber-600 bg-amber-900/20'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400 mb-1">Solunar Rating for {fish.name}</div>
            <div className={`text-5xl font-bold ${getRatingColor(solunarRating)}`}>
              {solunarRating}%
            </div>
            <div className={`text-lg font-medium ${getRatingColor(solunarRating)}`}>
              {getRatingLabel(solunarRating)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl">{moonPhaseName.split(' ').pop()}</div>
            <div className="text-sm text-slate-400">{moonPhaseName.split(' ')[0]} {moonPhaseName.split(' ')[1]}</div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Location (ZIP)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter ZIP"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
              <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Water Temp (°F)</label>
            <input
              type="range"
              min="40"
              max="90"
              value={waterTemp}
              onChange={(e) => setWaterTemp(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="text-center text-slate-300">{waterTemp}°F</div>
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1">Current Time</label>
            <input
              type="range"
              min="0"
              max="23"
              value={currentHour}
              onChange={(e) => setCurrentHour(parseInt(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="text-center text-slate-300">{currentHour}:00</div>
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 block mb-2">Target Species</label>
          <div className="flex flex-wrap gap-2">
            {FISH_SPECIES.map((f) => (
              <button
                key={f.name}
                onClick={() => setSelectedFish(f.name)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedFish === f.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Best Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Best Times Today
          </h3>
          <div className="space-y-2">
            {['5:30-8:00 AM (Dawn)', '12:00-2:00 PM (Midday)', '6:00-8:30 PM (Dusk)'].map((time, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${i === 0 || i === 2 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-slate-300">{time}</span>
                <span className="text-xs text-slate-500 ml-auto">
                  {i === 0 || i === 2 ? 'Peak Activity' : 'Moderate'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Moon className="w-5 h-5 text-blue-400" />
            Moon Phase Impact
          </h3>
          <p className="text-sm text-slate-300 mb-2">
            {fish.bestMoon.includes(moonPhase)
              ? '🌟 Excellent! Current moon phase is ideal for this species.'
              : '⚠️ Moon phase is not optimal. Fish may be less active.'}
          </p>
          <div className="text-xs text-slate-400">
            Best phases: {fish.bestMoon.map(m => m.replace('-', ' ')).join(', ')}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          AI Recommendations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Top Baits/Lures
            </h4>
            <ul className="space-y-1">
              {fish.baits.map((bait, i) => (
                <li key={i} className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  {bait}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              Best Techniques
            </h4>
            <ul className="space-y-1">
              {fish.techniques.map((tech, i) => (
                <li key={i} className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Target Depth:</span>
            <p className="text-slate-300">{fish.depth}</p>
          </div>
          <div>
            <span className="text-slate-500">Temp Range:</span>
            <p className="text-slate-300">{fish.bestTemp.min}°-{fish.bestTemp.max}°F</p>
          </div>
          <div>
            <span className="text-slate-500">Peak Season:</span>
            <p className="text-slate-300 capitalize">{fish.seasonPeak}</p>
          </div>
          <div>
            <span className="text-slate-500">Behavior:</span>
            <p className="text-slate-300 capitalize">{fish.activity}</p>
          </div>
        </div>
      </div>

      {/* Barometric Pressure & Weather */}
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Droplets className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-400 mb-2">Weather Factors</h4>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• Falling barometric pressure = increased feeding activity</li>
              <li>• Overcast skies = fish move shallower, more aggressive</li>
              <li>• Wind blowing into shore = pushes baitfish, attracts predators</li>
              <li>• Stable weather for 2-3 days = consistent patterns</li>
              <li>• Post-front conditions = tough fishing, slow presentations</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Safety */}
      <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-400 mb-1">Safety Reminders</p>
            <ul className="space-y-1 text-amber-200">
              <li>• Check local fishing regulations & licenses</li>
              <li>• Wear PFD when boating - 80% of drowning victims weren't wearing one</li>
              <li>• Let someone know your fishing location and return time</li>
              <li>• Check weather before heading out - storms can develop quickly</li>
              <li>• Handle fish with wet hands, release quickly for catch & release</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
