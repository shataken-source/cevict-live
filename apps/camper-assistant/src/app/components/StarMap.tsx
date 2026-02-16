'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Star,
  Moon,
  Sun,
  Telescope,
  Calendar,
  Clock,
  Navigation,
  Info,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  Sparkles,
  MapPin,
  Sunrise,
  Sunset,
  Loader2
} from 'lucide-react';

interface Star {
  id: string;
  name: string;
  constellation: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  magnitude: number; // brightness (lower = brighter)
  color: string;
  description: string;
}

interface Constellation {
  name: string;
  stars: string[];
  lines: [string, string][]; // pairs of star IDs to connect
  bestMonth: string;
  description: string;
}

// Major stars visible in Northern Hemisphere
const STARS: Star[] = [
  // Big Dipper / Ursa Major
  { id: 'dubhe', name: 'Dubhe', constellation: 'Ursa Major', x: 15, y: 20, magnitude: 1.8, color: '#ffd700', description: 'Alpha Ursae Majoris - pointer to Polaris' },
  { id: 'merak', name: 'Merak', constellation: 'Ursa Major', x: 12, y: 30, magnitude: 2.3, color: '#fff8dc', description: 'Beta Ursae Majoris - pointer to Polaris' },
  { id: 'phecda', name: 'Phecda', constellation: 'Ursa Major', x: 20, y: 35, magnitude: 2.4, color: '#fff8dc', description: 'Gamma Ursae Majoris' },
  { id: 'megrez', name: 'Megrez', constellation: 'Ursa Major', x: 18, y: 28, magnitude: 3.3, color: '#f0f8ff', description: 'Delta Ursae Majoris' },
  { id: 'alioth', name: 'Alioth', constellation: 'Ursa Major', x: 25, y: 32, magnitude: 1.8, color: '#e6e6fa', description: 'Epsilon Ursae Majoris - brightest in Big Dipper' },
  { id: 'mizar', name: 'Mizar', constellation: 'Ursa Major', x: 28, y: 28, magnitude: 2.2, color: '#fff8dc', description: 'Zeta Ursae Majoris - double star with Alcor' },
  { id: 'alkaid', name: 'Alkaid', constellation: 'Ursa Major', x: 32, y: 38, magnitude: 1.9, color: '#87ceeb', description: 'Eta Ursae Majoris - end of handle' },

  // Little Dipper / Ursa Minor (Polaris)
  { id: 'polaris', name: 'Polaris', constellation: 'Ursa Minor', x: 50, y: 10, magnitude: 2.0, color: '#fff', description: 'North Star - nearly stationary in sky' },
  { id: 'kochab', name: 'Kochab', constellation: 'Ursa Minor', x: 45, y: 15, magnitude: 2.1, color: '#ffcc99', description: 'Beta Ursae Minoris' },
  { id: 'pherkad', name: 'Pherkad', constellation: 'Ursa Minor', x: 55, y: 18, magnitude: 3.0, color: '#fff8dc', description: 'Gamma Ursae Minoris' },

  // Cassiopeia
  { id: 'caph', name: 'Caph', constellation: 'Cassiopeia', x: 65, y: 15, magnitude: 2.3, color: '#fff8dc', description: 'Beta Cassiopeiae' },
  { id: 'schedar', name: 'Schedar', constellation: 'Cassiopeia', x: 68, y: 20, magnitude: 2.2, color: '#ffcc99', description: 'Alpha Cassiopeiae' },
  { id: 'cih', name: 'Cih (Tsih)', constellation: 'Cassiopeia', x: 72, y: 25, magnitude: 2.2, color: '#add8e6', description: 'Gamma Cassiopeiae - variable star' },
  { id: 'ruchbah', name: 'Ruchbah', constellation: 'Cassiopeia', x: 75, y: 18, magnitude: 2.7, color: '#fff8dc', description: 'Delta Cassiopeiae' },
  { id: 'segin', name: 'Segin', constellation: 'Cassiopeia', x: 78, y: 22, magnitude: 3.4, color: '#f0f8ff', description: 'Epsilon Cassiopeiae' },

  // Orion
  { id: 'betelgeuse', name: 'Betelgeuse', constellation: 'Orion', x: 15, y: 65, magnitude: 0.5, color: '#ff4500', description: 'Alpha Orionis - red supergiant, could explode as supernova' },
  { id: 'rigel', name: 'Rigel', constellation: 'Orion', x: 25, y: 80, magnitude: 0.1, color: '#87ceeb', description: 'Beta Orionis - blue supergiant' },
  { id: 'bellatrix', name: 'Bellatrix', constellation: 'Orion', x: 12, y: 72, magnitude: 1.6, color: '#e6e6fa', description: 'Gamma Orionis' },
  { id: 'mintaka', name: 'Mintaka', constellation: 'Orion', x: 18, y: 75, magnitude: 2.2, color: '#add8e6', description: 'Delta Orionis - rightmost belt star' },
  { id: 'alnilam', name: 'Alnilam', constellation: 'Orion', x: 20, y: 77, magnitude: 1.7, color: '#add8e6', description: 'Epsilon Orionis - middle belt star' },
  { id: 'alnitak', name: 'Alnitak', constellation: 'Orion', x: 22, y: 79, magnitude: 1.7, color: '#add8e6', description: 'Zeta Orionis - leftmost belt star' },
  { id: 'saiph', name: 'Saiph', constellation: 'Orion', x: 23, y: 85, magnitude: 2.1, color: '#87ceeb', description: 'Kappa Orionis' },

  // Leo
  { id: 'regulus', name: 'Regulus', constellation: 'Leo', x: 75, y: 45, magnitude: 1.4, color: '#add8e6', description: 'Alpha Leonis - heart of the lion' },
  { id: 'algieba', name: 'Algieba', constellation: 'Leo', x: 70, y: 48, magnitude: 2.1, color: '#ffcc99', description: 'Gamma Leonis - double star' },
  { id: 'denebola', name: 'Denebola', constellation: 'Leo', x: 85, y: 55, magnitude: 2.1, color: '#fff8dc', description: 'Beta Leonis - tail of the lion' },

  // Gemini
  { id: 'castor', name: 'Castor', constellation: 'Gemini', x: 55, y: 60, magnitude: 1.6, color: '#e6e6fa', description: 'Alpha Geminorum - actually 6 stars!' },
  { id: 'pollux', name: 'Pollux', constellation: 'Gemini', x: 60, y: 62, magnitude: 1.1, color: '#ffcc99', description: 'Beta Geminorum - orange giant with planet' },

  // Others
  { id: 'arcturus', name: 'Arcturus', constellation: 'Bootes', x: 40, y: 50, magnitude: 0.0, color: '#ff8c00', description: 'Alpha Bootis - 4th brightest star in sky' },
  { id: 'vega', name: 'Vega', constellation: 'Lyra', x: 80, y: 10, magnitude: 0.0, color: '#e6e6fa', description: 'Alpha Lyrae - summer triangle star' },
  { id: 'deneb', name: 'Deneb', constellation: 'Cygnus', x: 90, y: 15, magnitude: 1.3, color: '#f0f8ff', description: 'Alpha Cygni - tail of swan' },
  { id: 'altair', name: 'Altair', constellation: 'Aquila', x: 88, y: 35, magnitude: 0.8, color: '#fff8dc', description: 'Alpha Aquilae - summer triangle star' },
  { id: 'spica', name: 'Spica', constellation: 'Virgo', x: 60, y: 75, magnitude: 1.0, color: '#add8e6', description: 'Alpha Virginis - blue giant' },
  { id: 'antares', name: 'Antares', constellation: 'Scorpius', x: 45, y: 85, magnitude: 1.1, color: '#ff4500', description: 'Alpha Scorpii - red supergiant rival of Mars' },
  { id: 'sirius', name: 'Sirius', constellation: 'Canis Major', x: 25, y: 90, magnitude: -1.5, color: '#add8e6', description: 'Alpha Canis Majoris - brightest star in sky!' },
  { id: 'procyon', name: 'Procyon', constellation: 'Canis Minor', x: 35, y: 70, magnitude: 0.4, color: '#fff8dc', description: 'Alpha Canis Minoris' },
];

const CONSTELLATIONS: Constellation[] = [
  {
    name: 'Ursa Major',
    stars: ['dubhe', 'merak', 'phecda', 'megrez', 'alioth', 'mizar', 'alkaid'],
    lines: [['dubhe', 'merak'], ['merak', 'phecda'], ['phecda', 'megrez'], ['megrez', 'dubhe'], ['megrez', 'alioth'], ['alioth', 'mizar'], ['mizar', 'alkaid']],
    bestMonth: 'April',
    description: 'The Great Bear - contains the Big Dipper asterism'
  },
  {
    name: 'Ursa Minor',
    stars: ['polaris', 'kochab', 'pherkad'],
    lines: [['polaris', 'kochab'], ['kochab', 'pherkad'], ['pherkad', 'polaris']],
    bestMonth: 'June',
    description: 'The Little Bear - Polaris marks true north'
  },
  {
    name: 'Cassiopeia',
    stars: ['caph', 'schedar', 'cih', 'ruchbah', 'segin'],
    lines: [['caph', 'schedar'], ['schedar', 'cih'], ['cih', 'ruchbah'], ['ruchbah', 'segin']],
    bestMonth: 'November',
    description: 'Queen on her throne - W or M shape'
  },
  {
    name: 'Orion',
    stars: ['betelgeuse', 'rigel', 'bellatrix', 'mintaka', 'alnilam', 'alnitak', 'saiph'],
    lines: [['betelgeuse', 'bellatrix'], ['bellatrix', 'mintaka'], ['mintaka', 'alnilam'], ['alnilam', 'alnitak'], ['alnitak', 'saiph'], ['saiph', 'rigel'], ['rigel', 'mintaka'], ['alnitak', 'betelgeuse']],
    bestMonth: 'January',
    description: 'The Hunter - most recognizable winter constellation'
  },
  {
    name: 'Leo',
    stars: ['regulus', 'algieba', 'denebola'],
    lines: [['regulus', 'algieba'], ['algieba', 'denebola']],
    bestMonth: 'April',
    description: 'The Lion - spring constellation'
  },
  {
    name: 'Gemini',
    stars: ['castor', 'pollux'],
    lines: [['castor', 'pollux']],
    bestMonth: 'February',
    description: 'The Twins - heads of Castor and Pollux'
  },
];

// Moon phases
const getMoonPhase = (date: Date) => {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();

  let c, e, jd, b;
  if (month < 3) {
    year--;
    month += 12;
  }
  c = 365.25 * year;
  e = 30.6 * month;
  jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  b = Math.floor(jd);
  jd -= b;
  b = Math.round(jd * 8);
  if (b >= 8) b = 0;

  const phases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  const icons = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
  return { name: phases[b], icon: icons[b], illumination: Math.round((1 - Math.cos(jd * 2 * Math.PI)) / 2 * 100) };
};

// Best viewing objects by month
const MONTHLY_HIGHLIGHTS: Record<number, { name: string; type: string; description: string; constellation: string }[]> = {
  0: [ // January
    { name: 'Orion Nebula', type: 'Nebula', description: 'M42 - visible below Orion\'s belt', constellation: 'Orion' },
    { name: 'Pleiades', type: 'Cluster', description: 'Seven Sisters star cluster', constellation: 'Taurus' },
  ],
  1: [ // February
    { name: 'Jupiter', type: 'Planet', description: 'Bright planet in evening sky', constellation: 'Various' },
    { name: 'Beehive Cluster', type: 'Cluster', description: 'M44 in Cancer', constellation: 'Cancer' },
  ],
  2: [ // March
    { name: 'Leo Triplet', type: 'Galaxies', description: 'Three galaxies near Regulus', constellation: 'Leo' },
    { name: 'Venus', type: 'Planet', description: 'Evening star, very bright', constellation: 'Various' },
  ],
  3: [ // April
    { name: 'Whirlpool Galaxy', type: 'Galaxy', description: 'M51 near Alkaid', constellation: 'Canes Venatici' },
    { name: 'Polaris', type: 'Star', description: 'Test your navigation skills', constellation: 'Ursa Minor' },
  ],
  4: [ // May
    { name: 'Virgo Cluster', type: 'Galaxies', description: 'Collection of galaxies', constellation: 'Virgo' },
    { name: 'Saturn', type: 'Planet', description: 'Rings visible in telescope', constellation: 'Various' },
  ],
  5: [ // June
    { name: 'Summer Triangle', type: 'Asterism', description: 'Vega, Deneb, Altair', constellation: 'Multiple' },
    { name: 'Hercules Cluster', type: 'Cluster', description: 'M13 - great globular cluster', constellation: 'Hercules' },
  ],
  6: [ // July
    { name: 'Milky Way Core', type: 'Nebula', description: 'Best view of our galaxy center', constellation: 'Sagittarius' },
    { name: 'Saturn', type: 'Planet', description: 'Opposition - best viewing', constellation: 'Various' },
  ],
  7: [ // August
    { name: 'Perseid Meteors', type: 'Event', description: 'Peak Aug 12-13, 60-100/hour', constellation: 'Perseus' },
    { name: 'Andromeda Galaxy', type: 'Galaxy', description: 'M31 - nearest major galaxy', constellation: 'Andromeda' },
  ],
  8: [ // September
    { name: 'Neptune', type: 'Planet', description: 'At opposition', constellation: 'Aquarius' },
    { name: 'Albireo', type: 'Star', description: 'Colorful double star', constellation: 'Cygnus' },
  ],
  9: [ // October
    { name: 'Orionid Meteors', type: 'Event', description: 'Peak Oct 21-22', constellation: 'Orion' },
    { name: 'Uranus', type: 'Planet', description: 'At opposition', constellation: 'Aries' },
  ],
  10: [ // November
    { name: 'Leonid Meteors', type: 'Event', description: 'Peak Nov 17-18', constellation: 'Leo' },
    { name: 'Pleiades', type: 'Cluster', description: 'Rises at sunset', constellation: 'Taurus' },
  ],
  11: [ // December
    { name: 'Geminid Meteors', type: 'Event', description: 'Peak Dec 13-14, best of year', constellation: 'Gemini' },
    { name: 'Orion', type: 'Constellation', description: 'Returns to evening sky', constellation: 'Orion' },
  ],
};

export default function StarMap() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showConstellations, setShowConstellations] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [magnitudeFilter, setMagnitudeFilter] = useState(4);
  const [selectedConstellation, setSelectedConstellation] = useState<string | null>(null);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [location, setLocation] = useState('Camping Location');
  const [zipCode, setZipCode] = useState('82190');
  const [astronomyData, setAstronomyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch astronomy data
  useEffect(() => {
    const fetchAstronomy = async () => {
      setLoading(true);
      setError(null);
      try {
        // Get coordinates from ZIP (simplified mapping)
        const coords = getZipCoords(zipCode);
        const response = await fetch(`/api/astronomy?lat=${coords.lat}&lon=${coords.lon}`);
        if (response.ok) {
          const data = await response.json();
          setAstronomyData(data);
        } else {
          throw new Error('Failed to fetch astronomy data');
        }
      } catch (err) {
        setError('Could not load astronomy data');
      } finally {
        setLoading(false);
      }
    };

    fetchAstronomy();
  }, [zipCode, selectedDate]);

  const moonPhase = useMemo(() => getMoonPhase(selectedDate), [selectedDate]);

  const monthHighlights = MONTHLY_HIGHLIGHTS[selectedDate.getMonth()] || [];

  const visibleStars = useMemo(() => {
    return STARS.filter(star => star.magnitude <= magnitudeFilter);
  }, [magnitudeFilter]);

  const visibleConstellations = useMemo(() => {
    if (!showConstellations) return [];
    if (selectedConstellation) {
      return CONSTELLATIONS.filter(c => c.name === selectedConstellation);
    }
    return CONSTELLATIONS;
  }, [showConstellations, selectedConstellation]);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const getStarSize = (magnitude: number) => {
    // Brighter stars (lower magnitude) are larger
    return Math.max(2, 8 - magnitude * 1.5);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <Telescope className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-semibold">Night Sky Guide</h2>
        </div>
        <p className="text-slate-400">Identify stars, constellations, and celestial objects visible from your campsite.</p>
      </div>

      {/* Controls */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Date Control */}
          <div>
            <label className="text-sm text-slate-400 block mb-1">Observation Date</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
              <button
                onClick={() => changeDate(1)}
                className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-sm text-slate-400 block mb-1">Location</label>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Your campsite"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-40"
              />
              <input
                type="text"
                value={zipCode}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 5).replace(/\D/g, '');
                  setZipCode(val);
                }}
                placeholder="ZIP"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-20 text-center"
                maxLength={5}
              />
            </div>
          </div>

          {/* Filters */}
          <div>
            <label className="text-sm text-slate-400 block mb-1">Brightness</label>
            <input
              type="range"
              min="1"
              max="6"
              step="1"
              value={magnitudeFilter}
              onChange={(e) => setMagnitudeFilter(parseInt(e.target.value))}
              className="w-32 accent-purple-500"
            />
            <div className="text-xs text-slate-500 mt-1">
              {magnitudeFilter === 1 ? 'Very bright only' :
                magnitudeFilter === 2 ? 'Bright stars' :
                  magnitudeFilter === 3 ? 'Medium stars' :
                    magnitudeFilter === 4 ? 'Many stars' :
                      magnitudeFilter === 5 ? 'Most stars' : 'All stars'}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowConstellations(!showConstellations)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${showConstellations ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}
            >
              Constellations
            </button>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${showLabels ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'
                }`}
            >
              Labels
            </button>
          </div>
        </div>

        {/* Constellation Filter */}
        {showConstellations && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setSelectedConstellation(null)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${selectedConstellation === null ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
            >
              Show All
            </button>
            {CONSTELLATIONS.map(c => (
              <button
                key={c.name}
                onClick={() => setSelectedConstellation(c.name)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${selectedConstellation === c.name ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Star Map */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 relative" style={{ minHeight: '500px' }}>
          {/* Sky Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800" />

          {/* Milky Way hint */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 70% 30%, rgba(147, 112, 219, 0.3), transparent)',
            }}
          />

          {/* Constellation Lines */}
          <svg className="absolute inset-0 w-full h-full">
            {visibleConstellations.map(constellation =>
              constellation.lines.map(([star1Id, star2Id], idx) => {
                const star1 = STARS.find(s => s.id === star1Id);
                const star2 = STARS.find(s => s.id === star2Id);
                if (!star1 || !star2) return null;
                if (star1.magnitude > magnitudeFilter || star2.magnitude > magnitudeFilter) return null;

                return (
                  <line
                    key={`${constellation.name}-${idx}`}
                    x1={`${star1.x}%`}
                    y1={`${star1.y}%`}
                    x2={`${star2.x}%`}
                    y2={`${star2.y}%`}
                    stroke="rgba(147, 112, 219, 0.4)"
                    strokeWidth="1"
                  />
                );
              })
            )}
          </svg>

          {/* Stars */}
          {visibleStars.map(star => (
            <div
              key={star.id}
              className="absolute cursor-pointer transition-transform hover:scale-150"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${getStarSize(star.magnitude)}px`,
                height: `${getStarSize(star.magnitude)}px`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => setSelectedStar(star)}
              title={star.name}
            >
              <div
                className="w-full h-full rounded-full shadow-lg"
                style={{
                  backgroundColor: star.color,
                  boxShadow: `0 0 ${getStarSize(star.magnitude) * 2}px ${star.color}40`,
                }}
              />
            </div>
          ))}

          {/* Labels */}
          {showLabels && visibleStars.filter(s => s.magnitude <= 2).map(star => (
            <div
              key={`label-${star.id}`}
              className="absolute text-xs text-slate-300 pointer-events-none"
              style={{
                left: `${star.x}%`,
                top: `${star.y + 3}%`,
                transform: 'translateX(-50%)',
                textShadow: '0 0 4px rgba(0,0,0,0.8)',
              }}
            >
              {star.name}
            </div>
          ))}

          {/* Compass directions */}
          <div className="absolute bottom-4 left-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4" />
              <span>N</span>
            </div>
          </div>
          <div className="absolute bottom-4 right-4 text-xs text-slate-500 text-right">
            <div>Facing {location}</div>
            <div className="text-slate-400">Northern Hemisphere View</div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          {/* Moon Phase - Real Data */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Moon className="w-5 h-5 text-slate-300" />
                <h3 className="font-semibold">Moon Phase</h3>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-500" />}
            </div>

            {astronomyData ? (
              <div className="flex items-center gap-4">
                <div className="text-6xl">{astronomyData.moon.phase.emoji}</div>
                <div>
                  <div className="font-medium text-white">{astronomyData.moon.phase.name}</div>
                  <div className="text-sm text-slate-400">{astronomyData.moon.illumination}% illuminated</div>
                  <div className="text-xs mt-1">
                    {astronomyData.moon.phase.isDarkSky ? (
                      <span className="text-emerald-400">✓ Dark sky conditions</span>
                    ) : (
                      <span className="text-amber-400">⚠ Moon interference</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {astronomyData.moon.illumination > 50
                      ? '🌑 Avoid faint objects'
                      : astronomyData.moon.illumination > 20
                        ? '🌗 Some light interference'
                        : '🌕 Perfect for deep sky'}
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="text-sm text-red-400">{error}</div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-6xl">{moonPhase.icon}</div>
                <div>
                  <div className="font-medium text-white">{moonPhase.name}</div>
                  <div className="text-sm text-slate-400">{moonPhase.illumination}% illuminated</div>
                </div>
              </div>
            )}
          </div>

          {/* Stargazing Window - Real Astronomy Data */}
          {astronomyData && (
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl p-4 border border-indigo-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Telescope className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold text-indigo-200">Stargazing Window</h3>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${astronomyData.stargazing.quality === 'excellent' ? 'bg-emerald-500/20 text-emerald-400' :
                    astronomyData.stargazing.quality === 'good' ? 'bg-blue-500/20 text-blue-400' :
                      astronomyData.stargazing.quality === 'fair' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                  }`}>
                  {astronomyData.stargazing.quality}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-900/50 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Sunrise className="w-3 h-3" />
                    Sunset
                  </div>
                  <div className="text-sm font-medium text-white">{astronomyData.sun.sunset}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Sunset className="w-3 h-3" />
                    Sunrise
                  </div>
                  <div className="text-sm font-medium text-white">{astronomyData.sun.sunrise}</div>
                </div>
              </div>

              <div className="bg-slate-900/30 rounded-lg p-3 mb-2">
                <div className="text-xs text-slate-400 mb-1">Best Viewing Time</div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-emerald-400">{astronomyData.stargazing.start}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-lg font-bold text-emerald-400">{astronomyData.stargazing.end}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {astronomyData.stargazing.duration} hours of dark skies
                </div>
              </div>

              {astronomyData.moon.rise && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Moon rise: {astronomyData.moon.rise}</span>
                  {astronomyData.moon.set && <span>Moon set: {astronomyData.moon.set}</span>}
                </div>
              )}

              <div className="text-xs text-indigo-300 mt-2">
                {astronomyData.stargazing.bestTime}
              </div>
            </div>
          )}

          {/* Selected Star Info */}
          {selectedStar ? (
            <div className="bg-slate-800 rounded-xl p-4 border border-purple-700/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        backgroundColor: selectedStar.color,
                        boxShadow: `0 0 8px ${selectedStar.color}`
                      }}
                    />
                    <h3 className="font-semibold text-white text-lg">{selectedStar.name}</h3>
                  </div>
                  <div className="text-sm text-purple-400 mt-1">{selectedStar.constellation}</div>
                </div>
                <button
                  onClick={() => setSelectedStar(null)}
                  className="text-slate-500 hover:text-white"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-slate-400 mt-3">{selectedStar.description}</p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded">
                  Mag: {selectedStar.magnitude}
                </span>
                <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded">
                  {Math.round(selectedStar.x)}° RA
                </span>
                <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded">
                  {Math.round(90 - selectedStar.y)}° Dec
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-400">Star Info</h3>
              </div>
              <p className="text-sm text-slate-500">Click on a star in the map to see details about it.</p>
            </div>
          )}

          {/* Monthly Highlights */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold">
                {selectedDate.toLocaleDateString('en-US', { month: 'long' })} Highlights
              </h3>
            </div>
            <div className="space-y-2">
              {monthHighlights.map((obj, idx) => (
                <div key={idx} className="bg-slate-900/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{obj.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${obj.type === 'Planet' ? 'bg-blue-900/50 text-blue-400' :
                      obj.type === 'Event' ? 'bg-red-900/50 text-red-400' :
                        obj.type === 'Galaxy' ? 'bg-purple-900/50 text-purple-400' :
                          'bg-amber-900/50 text-amber-400'
                      }`}>
                      {obj.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{obj.constellation}</div>
                  <p className="text-sm text-slate-400 mt-1">{obj.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Viewing Tips */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-slate-300">Viewing Tips</h3>
            </div>
            <ul className="space-y-1 text-sm text-slate-400 list-disc list-inside">
              <li>Let eyes adapt 20-30 min in dark</li>
              <li>Use red light to preserve night vision</li>
              <li>Best viewing: moonless nights</li>
              <li>Avoid light pollution from camp</li>
              <li>Binoculars great for star clusters</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ZIP to coordinates mapping (simplified)
function getZipCoords(zip: string) {
  const zipPrefix = parseInt(zip.substring(0, 3));

  // Major camping regions
  if (zipPrefix >= 820 && zipPrefix <= 831) return { lat: 44.5, lon: -110.0 }; // Yellowstone
  if (zipPrefix >= 247 && zipPrefix <= 268) return { lat: 38.5, lon: -80.5 };  // West Virginia
  if (zipPrefix >= 377 && zipPrefix <= 379) return { lat: 35.6, lon: -83.5 };  // Smokies
  if (zipPrefix >= 900 && zipPrefix <= 961) return { lat: 36.7, lon: -119.4 }; // California
  if (zipPrefix >= 850 && zipPrefix <= 865) return { lat: 34.0, lon: -111.0 }; // Arizona
  if (zipPrefix >= 800 && zipPrefix <= 816) return { lat: 39.0, lon: -105.5 }; // Colorado
  if (zipPrefix >= 598 && zipPrefix <= 599) return { lat: 47.0, lon: -110.0 }; // Montana
  if (zipPrefix >= 830 && zipPrefix <= 831) return { lat: 43.5, lon: -110.5 }; // Jackson Hole
  if (zipPrefix >= 321 && zipPrefix <= 329) return { lat: 28.5, lon: -81.5 };  // Florida
  if (zipPrefix >= 100 && zipPrefix <= 149) return { lat: 40.7, lon: -74.0 };   // NYC
  if (zipPrefix >= 200 && zipPrefix <= 205) return { lat: 38.9, lon: -77.0 };  // DC
  if (zipPrefix >= 300 && zipPrefix <= 319) return { lat: 33.7, lon: -84.3 };  // Atlanta
  if (zipPrefix >= 600 && zipPrefix <= 629) return { lat: 41.8, lon: -87.6 };  // Chicago
  if (zipPrefix >= 750 && zipPrefix <= 799) return { lat: 32.7, lon: -96.8 };  // Dallas
  if (zipPrefix >= 980 && zipPrefix <= 994) return { lat: 47.6, lon: -122.3 }; // Seattle
  if (zipPrefix >= 850 && zipPrefix <= 860) return { lat: 33.4, lon: -112.0 }; // Phoenix
  if (zipPrefix >= 870 && zipPrefix <= 884) return { lat: 35.1, lon: -106.6 }; // Albuquerque
  if (zipPrefix >= 450 && zipPrefix <= 458) return { lat: 39.1, lon: -84.5 };  // Cincinnati
  if (zipPrefix >= 441 && zipPrefix <= 447) return { lat: 41.5, lon: -81.7 };  // Cleveland
  if (zipPrefix >= 150 && zipPrefix <= 196) return { lat: 40.0, lon: -75.0 };  // Pennsylvania
  if (zipPrefix >= 400 && zipPrefix <= 427) return { lat: 38.2, lon: -85.7 };  // Kentucky
  if (zipPrefix >= 700 && zipPrefix <= 714) return { lat: 30.0, lon: -91.0 };  // Louisiana
  if (zipPrefix >= 850 && zipPrefix <= 855) return { lat: 32.2, lon: -110.9 }; // Tucson

  // Default to middle US
  return { lat: 39.8, lon: -98.6 };
}
