'use client';

import { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Package,
  DollarSign,
  Store,
  Search,
  Plus,
  Check,
  Trash2,
  CloudRain,
  Sun,
  Wind,
  Thermometer,
  Tent,
  Fish,
  Bike,
  Mountain,
  Flame,
  Sparkles,
  ExternalLink,
  Calculator,
  Filter,
  Wrench,
  AlertCircle,
  Save,
  Download
} from 'lucide-react';

type StoreType = 'walmart' | 'amazon' | 'westmarine' | 'cabelas' | 'rei' | 'homedepot';
type CategoryType = 'weather' | 'activity' | 'maintenance' | 'safety' | 'comfort' | 'food';
type PriorityType = 'essential' | 'recommended' | 'optional';

interface ShoppingItem {
  id: string;
  name: string;
  description: string;
  category: CategoryType;
  priority: PriorityType;
  prices: { store: StoreType; price: number; inStock: boolean; url: string }[];
  quantity: number;
  inCart: boolean;
  reason: string; // AI-generated reason for suggestion
  estimatedWeight?: number; // lbs
  packSize?: string; // small/medium/large for packing
}

interface TripContext {
  weather: 'sunny' | 'rainy' | 'cold' | 'hot' | 'windy' | 'mixed';
  temperature: number;
  activities: string[];
  duration: number; // days
  location: string;
  rvType: 'motorhome' | 'trailer' | 'campervan' | 'tent' | 'other';
}

const STORES: { id: StoreType; name: string; color: string }[] = [
  { id: 'walmart', name: 'Walmart', color: 'text-blue-400' },
  { id: 'amazon', name: 'Amazon', color: 'text-orange-400' },
  { id: 'westmarine', name: 'West Marine', color: 'text-red-400' },
  { id: 'cabelas', name: "Cabela's", color: 'text-emerald-400' },
  { id: 'rei', name: 'REI', color: 'text-green-400' },
  { id: 'homedepot', name: 'Home Depot', color: 'text-amber-400' },
];

const CATEGORIES: { id: CategoryType; name: string; icon: any; color: string }[] = [
  { id: 'weather', name: 'Weather Gear', icon: CloudRain, color: 'text-blue-400 bg-blue-900/30' },
  { id: 'activity', name: 'Activity Gear', icon: Mountain, color: 'text-emerald-400 bg-emerald-900/30' },
  { id: 'maintenance', name: 'Maintenance', icon: Wrench, color: 'text-amber-400 bg-amber-900/30' },
  { id: 'safety', name: 'Safety', icon: AlertCircle, color: 'text-red-400 bg-red-900/30' },
  { id: 'comfort', name: 'Comfort', icon: Tent, color: 'text-purple-400 bg-purple-900/30' },
  { id: 'food', name: 'Food/Cooking', icon: Flame, color: 'text-orange-400 bg-orange-900/30' },
];

// AI-generated suggestions - REQUIRES REAL API INTEGRATION
// This function previously contained mock data. Now returns empty until real AI service connected.
function generateSmartSuggestions(context: TripContext): ShoppingItem[] {
  // TODO: Connect to real AI recommendation service (OpenAI, Claude, etc.)
  // or product search API (Amazon Product API, Walmart API, etc.)
  return [];
}

export default function SmartShoppingList() {
  const [context, setContext] = useState<TripContext>({
    weather: 'mixed',
    temperature: 65,
    activities: [],
    duration: 3,
    location: '',
    rvType: 'motorhome',
  });

  const [items, setItems] = useState<ShoppingItem[]>([]); // Start empty - no mock data

  const [showContextForm, setShowContextForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [selectedStore, setSelectedStore] = useState<StoreType | 'all'>('all');
  const [showAIGenerate, setShowAIGenerate] = useState(false);

  // AI generate new suggestions - requires API integration
  const handleAIGenerate = () => {
    // TODO: Connect to real AI service
    alert('AI recommendations require API integration (OpenAI/Claude + Product APIs)');
  };

  const toggleCart = (id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, inCart: !item.inCart } : item
    ));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const getBestPrice = (item: ShoppingItem) => {
    return Math.min(...item.prices.map(p => p.price));
  };

  const getBestPriceStore = (item: ShoppingItem) => {
    const best = item.prices.reduce((min, p) => p.price < min.price ? p : min);
    return best;
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedStore !== 'all' && !item.prices.some(p => p.store === selectedStore && p.inStock)) return false;
      return true;
    });
  }, [items, selectedCategory, selectedStore]);

  const cartItems = items.filter(i => i.inCart);
  const cartTotal = cartItems.reduce((sum, item) => sum + getBestPrice(item) * item.quantity, 0);
  const cartWeight = cartItems.reduce((sum, item) => sum + (item.estimatedWeight || 0) * item.quantity, 0);

  // Shop button - open best price links for cart items
  const handleShop = () => {
    cartItems.forEach(item => {
      const bestStore = getBestPriceStore(item);
      const url = item.prices.find(p => p.store === bestStore.store)?.url;
      if (url) {
        window.open(url, '_blank');
      }
    });
  };

  // Export button - generate and download list as text
  const handleExport = () => {
    const listText = cartItems.map(item => {
      const bestStore = getBestPriceStore(item);
      return `${item.name} (${item.quantity}x) - ${bestStore.store} - $${(bestStore.price * item.quantity).toFixed(2)}`;
    }).join('\n');

    const totalText = `\n\nTotal: $${cartTotal.toFixed(2)}\nWeight: ${cartWeight.toFixed(1)} lbs`;
    const fullText = `WildReady Shopping List for ${context.location}\n\n${listText}${totalText}`;

    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildready-shopping-${context.location.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save button - save to localStorage
  const handleSave = () => {
    const saveData = {
      context,
      items: cartItems,
      total: cartTotal,
      weight: cartWeight,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(`wildready-shopping-${context.location}`, JSON.stringify(saveData));
    alert('Shopping list saved!');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-semibold">AI Gear Recommendations</h2>
        </div>
        <p className="text-slate-400">Smart shopping list based on your trip, weather, and activities.</p>
      </div>

      {/* Trip Context */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Location</label>
            <input
              type="text"
              value={context.location}
              onChange={(e) => setContext({ ...context, location: e.target.value })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-40"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Weather</label>
            <select
              value={context.weather}
              onChange={(e) => setContext({ ...context, weather: e.target.value as any })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="sunny">☀️ Sunny</option>
              <option value="rainy">🌧️ Rainy</option>
              <option value="cold">❄️ Cold</option>
              <option value="hot">🌡️ Hot</option>
              <option value="windy">💨 Windy</option>
              <option value="mixed">🌤️ Mixed</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Temp (°F)</label>
            <input
              type="number"
              value={context.temperature}
              onChange={(e) => setContext({ ...context, temperature: parseInt(e.target.value) || 65 })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-20"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Duration (days)</label>
            <input
              type="number"
              value={context.duration}
              onChange={(e) => setContext({ ...context, duration: parseInt(e.target.value) || 1 })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white w-24"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">RV Type</label>
            <select
              value={context.rvType}
              onChange={(e) => setContext({ ...context, rvType: e.target.value as any })}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            >
              <option value="motorhome">Motorhome</option>
              <option value="trailer">Travel Trailer</option>
              <option value="campervan">Campervan</option>
              <option value="tent">Tent Camping</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button
            onClick={handleAIGenerate}
            disabled={showAIGenerate}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Sparkles className={`w-4 h-4 ${showAIGenerate ? 'animate-spin' : ''}`} />
            {showAIGenerate ? 'Analyzing...' : 'AI Generate'}
          </button>
        </div>
      </div>

      {/* Cart Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-400">In Cart</span>
          </div>
          <div className="text-2xl font-bold text-white">{cartItems.length} items</div>
        </div>
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-400">Best Price Total</span>
          </div>
          <div className="text-2xl font-bold text-white">${cartTotal.toFixed(2)}</div>
        </div>
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-400">Est. Weight</span>
          </div>
          <div className="text-2xl font-bold text-white">{cartWeight.toFixed(1)} lbs</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Filter by Category</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedCategory === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
              >
                All
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedCategory === cat.id ? cat.color : 'bg-slate-700 text-slate-300'
                    }`}
                >
                  <cat.icon className="w-3 h-3" />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const bestPrice = getBestPrice(item);
          const bestStore = getBestPriceStore(item);
          const categoryConfig = CATEGORIES.find(c => c.id === item.category);
          const CategoryIcon = categoryConfig?.icon || Package;

          return (
            <div
              key={item.id}
              className={`bg-slate-800 rounded-xl p-4 border transition-all ${item.inCart ? 'border-emerald-600 bg-emerald-900/10' : 'border-slate-700 hover:border-slate-600'
                }`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleCart(item.id)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${item.inCart ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-500 hover:bg-slate-600'
                    }`}
                >
                  {item.inCart && <Check className="w-4 h-4" />}
                </button>

                {/* Category Icon */}
                <div className={`p-2 rounded-lg ${categoryConfig?.color || 'bg-slate-700'}`}>
                  <CategoryIcon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`font-semibold ${item.inCart ? 'text-emerald-400 line-through' : 'text-white'}`}>
                          {item.name}
                        </h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${item.priority === 'essential' ? 'bg-red-900/50 text-red-400' :
                          item.priority === 'recommended' ? 'bg-amber-900/50 text-amber-400' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{item.description}</p>
                    </div>

                    {/* Price & Actions */}
                    <div className="text-right">
                      <div className="text-xl font-bold text-emerald-400">${bestPrice.toFixed(2)}</div>
                      <div className="text-xs text-slate-500">
                        at {STORES.find(s => s.id === bestStore.store)?.name}
                      </div>
                    </div>
                  </div>

                  {/* AI Reason */}
                  <div className="mt-2 bg-slate-900/50 rounded-lg p-2 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-400">{item.reason}</p>
                  </div>

                  {/* Price Comparison */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.prices.map(price => (
                      <a
                        key={price.store}
                        href={price.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${price.store === bestStore.store
                          ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/30'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                      >
                        <Store className="w-3 h-3" />
                        {STORES.find(s => s.id === price.store)?.name}
                        <span className={price.store === bestStore.store ? 'font-bold' : ''}>
                          ${price.price.toFixed(2)}
                        </span>
                        {!price.inStock && <span className="text-red-400">(OOS)</span>}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      {item.estimatedWeight && (
                        <span>{item.estimatedWeight} lbs</span>
                      )}
                      {item.packSize && (
                        <span className={`px-2 py-0.5 rounded text-xs ${item.packSize === 'small' ? 'bg-green-900/30 text-green-400' :
                          item.packSize === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                            'bg-red-900/30 text-red-400'
                          }`}>
                          {item.packSize} pack
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-2 p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No items match your filters.</p>
          <button
            onClick={() => { setSelectedCategory('all'); setSelectedStore('all'); }}
            className="mt-2 text-emerald-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Actions */}
      {cartItems.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleShop}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Shop Best Prices (${cartTotal.toFixed(2)})
            </button>
            <button
              onClick={handleExport}
              className="px-6 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export List
            </button>
            <button
              onClick={handleSave}
              className="px-6 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save for Trip
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-start gap-3">
          <Calculator className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="mb-1"><strong className="text-slate-300">How AI Recommendations Work:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Analyzes weather, temperature, and location</li>
              <li>Matches gear to your planned activities</li>
              <li>Compares prices across 6 major retailers</li>
              <li>Prioritizes by essential/recommended/optional</li>
              <li>Estimates pack weight and size for RV storage</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
