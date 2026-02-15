'use client';

import { useState, useMemo } from 'react';
import { 
  MapPin, 
  Utensils, 
  Fuel, 
  Toilet, 
  Wrench, 
  Mountain, 
  Landmark, 
  Tent,
  CloudRain,
  Navigation,
  Search,
  Phone,
  Clock,
  Star,
  Car,
  Bike,
  Info,
  ExternalLink,
  Wifi,
  Signal
} from 'lucide-react';

// Mock attraction database for demo - structured for real API integration
type AttractionType = 'food' | 'gas' | 'restroom' | 'repair' | 'trail' | 'historic' | 'shelter' | 'entertainment';

interface Attraction {
  id: string;
  name: string;
  type: AttractionType;
  distance: number; // miles from campsite
  rating: number;
  address: string;
  phone?: string;
  hours?: string;
  description: string;
  isOpen: boolean;
  tags: string[];
  website?: string;
}

interface LocationData {
  zip: string;
  name: string;
  coords: { lat: number; lng: number };
  attractions: Attraction[];
}

// Sample data for popular camping areas
const LOCATION_DATABASE: Record<string, LocationData> = {
  '25965': {
    zip: '25965',
    name: 'Summersville, WV',
    coords: { lat: 38.3237, lng: -80.8445 },
    attractions: [
      { id: '1', name: 'Summersville Lake', type: 'entertainment', distance: 3.2, rating: 4.8, address: 'Summersville Lake Marina', phone: '(304) 872-3412', hours: 'Dawn - Dusk', description: 'Crystal clear lake with swimming, boating, and cliff jumping', isOpen: true, tags: ['swimming', 'boating', 'fishing', 'cliff jumping'], website: 'https://summersvillelake.com' },
      { id: '2', name: 'Walmart Supercenter', type: 'food', distance: 4.1, rating: 3.5, address: '200 Walmart Way, Summersville', phone: '(304) 872-4444', hours: '24 hours', description: 'Full grocery, camping supplies, RV supplies', isOpen: true, tags: ['groceries', 'supplies', '24hr'] },
      { id: '3', name: 'Sheetz', type: 'gas', distance: 3.8, rating: 4.2, address: '605 Arbuckle Rd, Summersville', phone: '(304) 872-5555', hours: '24 hours', description: 'Gas, diesel, made-to-order food, coffee, propane exchange', isOpen: true, tags: ['diesel', 'propane', 'food'] },
      { id: '4', name: 'Love’s Travel Stop', type: 'gas', distance: 5.2, rating: 4.3, address: 'I-79 Exit 48', phone: '(304) 872-8888', hours: '24 hours', description: 'RV dump station, propane, showers, laundry', isOpen: true, tags: ['RV dump', 'showers', 'laundry', 'diesel'] },
      { id: '5', name: 'Summersville Rest Area', type: 'restroom', distance: 4.5, rating: 3.8, address: 'I-79 Southbound', description: 'Clean restrooms, picnic tables, tourist info', isOpen: true, tags: ['restrooms', 'picnic'] },
      { id: '6', name: 'NAPA Auto Parts', type: 'repair', distance: 4.3, rating: 4.1, address: '1201 Main St, Summersville', phone: '(304) 872-3333', hours: 'Mon-Sat 8-6', description: 'Parts, fluids, basic tools, roadside assistance referrals', isOpen: false, tags: ['parts', 'tools', 'emergency'] },
      { id: '7', name: 'Long Point Trail', type: 'trail', distance: 2.8, rating: 4.7, address: 'Summersville Lake West Side', description: '3-mile loop with stunning lake views and cliff overlooks', isOpen: true, tags: ['hiking', 'views', 'moderate', 'dog-friendly'] },
      { id: '8', name: 'Battle of Carnifex Ferry', type: 'historic', distance: 6.1, rating: 4.5, address: '1194 Carnifex Ferry Rd, Summersville', phone: '(304) 872-0824', hours: 'Dawn - Dusk', description: 'Civil War battlefield site with museum and trails', isOpen: true, tags: ['civil war', 'museum', 'history', 'picnic'] },
      { id: '9', name: 'Summersville Arena', type: 'shelter', distance: 3.5, rating: 4.0, address: '178 Arena Rd, Summersville', phone: '(304) 872-1810', description: 'Emergency shelter location during severe weather', isOpen: true, tags: ['emergency', 'shelter', 'storm'] },
      { id: '10', name: 'Pies & Pints', type: 'food', distance: 3.9, rating: 4.6, address: '211 Main St, Summersville', phone: '(304) 872-9000', hours: '11-10 daily', description: 'Gourmet pizza and craft beer - local favorite', isOpen: true, tags: ['pizza', 'beer', 'local'] },
      { id: '11', name: 'Cathedral Falls Trail', type: 'trail', distance: 8.3, rating: 4.8, address: 'US-60, Gauley Bridge', description: 'Short hike to spectacular 60-foot waterfall', isOpen: true, tags: ['waterfall', 'easy', 'scenic', 'photo'] },
      { id: '12', name: 'Charleston', type: 'entertainment', distance: 42, rating: 4.2, address: 'WV State Capitol', description: 'State capital - museums, restaurants, shopping', isOpen: true, tags: ['city', 'museums', 'shopping', 'food'] },
    ]
  },
  '82190': {
    zip: '82190',
    name: 'Yellowstone Area, WY',
    coords: { lat: 44.6, lng: -110.5 },
    attractions: [
      { id: '1', name: 'Old Faithful', type: 'entertainment', distance: 12, rating: 4.9, address: 'Upper Geyser Basin', description: 'Most famous geyser - erupts every 90 minutes', isOpen: true, tags: ['geyser', 'iconic', 'must-see'] },
      { id: '2', name: 'Grant Village General Store', type: 'food', distance: 8.5, rating: 3.8, address: 'Grant Village', hours: '7-9 daily', description: 'Groceries, camping supplies, basic gear', isOpen: true, tags: ['groceries', 'supplies', 'limited'] },
      { id: '3', name: 'Canyon Lodge Gas', type: 'gas', distance: 18, rating: 3.5, address: 'Canyon Village', hours: '7-7 seasonal', description: 'Last gas for many miles - premium prices', isOpen: true, tags: ['expensive', 'essential'] },
      { id: '4', name: 'West Yellowstone Visitor Center', type: 'restroom', distance: 25, rating: 4.2, address: 'West Yellowstone, MT', description: 'Clean facilities, info, maps, cell service', isOpen: true, tags: ['info', 'cell service', 'maps'] },
      { id: '5', name: 'Yellowstone RV Services', type: 'repair', distance: 28, rating: 4.0, address: 'West Yellowstone, MT', phone: '(406) 646-9010', hours: 'Mon-Sat 8-5', description: 'RV repairs, mobile service available', isOpen: false, tags: ['RV', 'mobile service', 'emergency'] },
      { id: '6', name: 'Fairy Falls Trail', type: 'trail', distance: 10, rating: 4.6, address: 'Lower Geyser Basin', description: '5-mile round trip to 200-foot waterfall', isOpen: true, tags: ['hiking', 'waterfall', 'moderate'] },
      { id: '7', name: 'Roosevelt Lodge', type: 'food', distance: 35, rating: 4.3, address: 'Tower-Roosevelt Area', phone: '(307) 344-7311', hours: 'Seasonal', description: 'Historic lodge, restaurant, frontier cookouts', isOpen: true, tags: ['historic', 'food', 'atmosphere'] },
      { id: '8', name: 'Mammoth Hot Springs', type: 'entertainment', distance: 45, rating: 4.7, address: 'North Entrance', description: 'Terraced hot springs, visitor center, elk herds', isOpen: true, tags: ['hot springs', 'wildlife', 'visitor center'] },
      { id: '9', name: 'Yellowstone Forever Institute', type: 'historic', distance: 15, rating: 4.8, address: 'Lake Yellowstone Hotel', phone: '(307) 344-2293', description: 'Ranger programs, educational tours, history', isOpen: true, tags: ['education', 'ranger', 'tours'] },
      { id: '10', name: 'Grant Village Emergency', type: 'shelter', distance: 8.5, rating: 4.0, address: 'Grant Village', phone: '911', description: 'Ranger station and emergency services', isOpen: true, tags: ['ranger', 'emergency', 'medical'] },
    ]
  }
};

const ATTRACTION_CATEGORIES: { type: AttractionType; icon: any; label: string; color: string }[] = [
  { type: 'food', icon: Utensils, label: 'Food & Groceries', color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50' },
  { type: 'gas', icon: Fuel, label: 'Fuel & Supplies', color: 'text-amber-400 bg-amber-900/30 border-amber-700/50' },
  { type: 'restroom', icon: Toilet, label: 'Restrooms', color: 'text-blue-400 bg-blue-900/30 border-blue-700/50' },
  { type: 'repair', icon: Wrench, label: 'Repairs', color: 'text-red-400 bg-red-900/30 border-red-700/50' },
  { type: 'trail', icon: Mountain, label: 'Trails & Nature', color: 'text-green-400 bg-green-900/30 border-green-700/50' },
  { type: 'historic', icon: Landmark, label: 'Historic Sites', color: 'text-purple-400 bg-purple-900/30 border-purple-700/50' },
  { type: 'entertainment', icon: Tent, label: 'Attractions', color: 'text-cyan-400 bg-cyan-900/30 border-cyan-700/50' },
  { type: 'shelter', icon: CloudRain, label: 'Emergency/Shelter', color: 'text-rose-400 bg-rose-900/30 border-rose-700/50' },
];

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine formula for rough distance calculation
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
}

// Generate mock attractions for unknown locations
function generateMockAttractions(zip: string, coords?: { lat: number; lng: number }): Attraction[] {
  const zipNum = parseInt(zip.substring(0, 3));
  
  return [
    { id: 'm1', name: 'Local Grocery', type: 'food', distance: 5.2, rating: 3.8, address: `${zip} Main St`, phone: '(555) 123-4567', hours: '7-10 daily', description: 'Local grocery and camping supplies', isOpen: true, tags: ['groceries', 'supplies'] },
    { id: 'm2', name: 'Shell Station', type: 'gas', distance: 3.8, rating: 4.0, address: `${zip} Highway`, phone: '(555) 234-5678', hours: '5-11 daily', description: 'Gas, diesel, basic convenience items', isOpen: true, tags: ['fuel', 'snacks'] },
    { id: 'm3', name: 'Rest Area', type: 'restroom', distance: 12, rating: 3.5, address: `I-Highway Mile 45`, description: 'Restrooms and picnic area', isOpen: true, tags: ['restrooms', 'picnic'] },
    { id: 'm4', name: 'NAPA Auto Parts', type: 'repair', distance: 8.5, rating: 4.1, address: `${zip} Industrial Rd`, phone: '(555) 345-6789', hours: 'Mon-Sat 8-6', description: 'Parts and emergency repairs', isOpen: false, tags: ['parts', 'tools'] },
    { id: 'm5', name: 'State Park Trailhead', type: 'trail', distance: 6.2, rating: 4.5, address: `State Park Rd`, description: 'Local hiking trails and nature walks', isOpen: true, tags: ['hiking', 'nature'] },
    { id: 'm6', name: 'Historic Downtown', type: 'historic', distance: 7.1, rating: 4.2, address: `${zip} Old Town`, description: 'Local history and architecture', isOpen: true, tags: ['history', 'walking'] },
    { id: 'm7', name: 'Community Center', type: 'shelter', distance: 4.5, rating: 4.0, address: `${zip} Center St`, phone: '(555) 456-7890', description: 'Emergency shelter during severe weather', isOpen: true, tags: ['emergency', 'shelter'] },
    { id: 'm8', name: 'Local Diner', type: 'food', distance: 4.2, rating: 4.3, address: `${zip} Oak Ave`, phone: '(555) 567-8901', hours: '6-9 daily', description: 'Home cooking and local atmosphere', isOpen: true, tags: ['food', 'local'] },
    { id: 'm9', name: 'Walmart', type: 'food', distance: 15, rating: 3.6, address: `${zip} Retail Blvd`, phone: '(555) 678-9012', hours: '24 hours', description: 'Full shopping and camping supplies', isOpen: true, tags: ['24hr', 'supplies', 'groceries'] },
    { id: 'm10', name: 'Riverwalk Trail', type: 'trail', distance: 3.5, rating: 4.4, address: `Riverside Park`, description: 'Scenic river walk and fishing access', isOpen: true, tags: ['scenic', 'fishing', 'easy'] },
  ];
}

export default function LocalAttractions() {
  const [searchInput, setSearchInput] = useState('25965');
  const [activeLocation, setActiveLocation] = useState<string>('25965');
  const [selectedCategories, setSelectedCategories] = useState<AttractionType[]>([]);
  const [maxDistance, setMaxDistance] = useState(50);
  const [hasConnectivity, setHasConnectivity] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const locationData = useMemo(() => {
    const data = LOCATION_DATABASE[activeLocation];
    if (data) return data;
    
    // Generate mock data for unknown locations
    return {
      zip: activeLocation,
      name: `Area ${activeLocation}`,
      coords: { lat: 38.0, lng: -95.0 },
      attractions: generateMockAttractions(activeLocation)
    };
  }, [activeLocation]);

  const filteredAttractions = useMemo(() => {
    return locationData.attractions.filter(attraction => {
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(attraction.type);
      const matchesDistance = attraction.distance <= maxDistance;
      return matchesCategory && matchesDistance;
    }).sort((a, b) => a.distance - b.distance);
  }, [locationData.attractions, selectedCategories, maxDistance]);

  const handleSearch = () => {
    if (!searchInput.trim()) return;
    setIsSearching(true);
    // Simulate API search
    setTimeout(() => {
      setActiveLocation(searchInput.trim());
      setIsSearching(false);
    }, 500);
  };

  const toggleCategory = (type: AttractionType) => {
    setSelectedCategories(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const getCategoryStyle = (type: AttractionType) => {
    const cat = ATTRACTION_CATEGORIES.find(c => c.type === type);
    return cat?.color || 'text-slate-400 bg-slate-900/30 border-slate-700/50';
  };

  const getCategoryIcon = (type: AttractionType) => {
    const cat = ATTRACTION_CATEGORIES.find(c => c.type === type);
    return cat?.icon || MapPin;
  };

  const getCategoryLabel = (type: AttractionType) => {
    const cat = ATTRACTION_CATEGORIES.find(c => c.type === type);
    return cat?.label || type;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-semibold">Local Explorer</h2>
        </div>
        <p className="text-slate-400">Find food, fuel, trails, and services near your campsite.</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
        {/* Location Input */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-slate-400 block mb-1">Location (ZIP or City)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter ZIP code or city"
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Search className="w-4 h-4" />
                {isSearching ? '...' : 'Find'}
              </button>
            </div>
          </div>
          
          {/* Connectivity Toggle */}
          <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
            <label className="text-sm text-slate-300 flex items-center gap-2">
              {hasConnectivity ? <Wifi className="w-4 h-4 text-emerald-400" /> : <Signal className="w-4 h-4 text-slate-400" />}
              <input
                type="checkbox"
                checked={hasConnectivity}
                onChange={(e) => setHasConnectivity(e.target.checked)}
                className="hidden"
              />
              <span onClick={() => setHasConnectivity(!hasConnectivity)} className="cursor-pointer">
                {hasConnectivity ? 'Online' : 'Offline'}
              </span>
            </label>
          </div>
        </div>

        {/* Distance Filter */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">
            Max Distance: <span className="text-white font-semibold">{maxDistance} miles</span>
          </label>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={maxDistance}
            onChange={(e) => setMaxDistance(parseInt(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>5 mi</span>
            <span>50 mi</span>
            <span>100 mi</span>
          </div>
        </div>

        {/* Category Filters */}
        <div>
          <label className="text-sm text-slate-400 block mb-2">Filter by Category</label>
          <div className="flex flex-wrap gap-2">
            {ATTRACTION_CATEGORIES.map(({ type, icon: Icon, label }) => {
              const isActive = selectedCategories.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleCategory(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    isActive 
                      ? getCategoryStyle(type)
                      : 'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {locationData.name}
          <span className="text-slate-500 text-sm font-normal ml-2">
            {filteredAttractions.length} places found
          </span>
        </h3>
        {hasConnectivity && (
          <div className="text-xs bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded flex items-center gap-1">
            <Wifi className="w-3 h-3" />
            Live results
          </div>
        )}
      </div>

      {/* Attractions List */}
      <div className="space-y-3">
        {filteredAttractions.map((attraction) => {
          const Icon = getCategoryIcon(attraction.type);
          const isOpen = attraction.isOpen;
          
          return (
            <div 
              key={attraction.id}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Icon & Category */}
                <div className={`p-3 rounded-lg ${getCategoryStyle(attraction.type)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                {/* Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-white flex items-center gap-2">
                        {attraction.name}
                        {attraction.rating >= 4.5 && (
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        )}
                      </h4>
                      <p className="text-sm text-slate-400 mt-0.5">{attraction.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-white">{attraction.distance} mi</div>
                      <div className={`text-xs ${isOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isOpen ? 'Open' : 'Closed'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Details Row */}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {attraction.address}
                    </span>
                    {attraction.phone && (
                      <a href={`tel:${attraction.phone}`} className="text-blue-400 flex items-center gap-1 hover:underline">
                        <Phone className="w-3 h-3" />
                        {attraction.phone}
                      </a>
                    )}
                    {attraction.hours && (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {attraction.hours}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-400">{attraction.rating}</span>
                    </span>
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {attraction.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <Navigation className="w-3 h-3" />
                      Directions
                    </button>
                    {attraction.website && (
                      <a 
                        href={attraction.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Website
                      </a>
                    )}
                    <button className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <Info className="w-3 h-3" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {filteredAttractions.length === 0 && (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
            <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No places found matching your filters.</p>
            <p className="text-sm text-slate-500 mt-1">Try increasing the distance or selecting different categories.</p>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-2">
              <strong className="text-slate-300">Offline Mode:</strong> Basic location data works without internet. 
              Toggle "Online" for live results, current hours, and reviews.
            </p>
            <p>
              <strong className="text-slate-300">RV Mode:</strong> Look for tags like "RV dump", "propane", and 
              "diesel" when traveling with a camper.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
