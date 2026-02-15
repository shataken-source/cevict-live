'use client';

import { useState } from 'react';
import { Backpack, Shirt, Thermometer, Wind, CloudRain, Check } from 'lucide-react';

export default function TripPlanner() {
  const [days, setDays] = useState(3);
  const [weather, setWeather] = useState({
    high: 75,
    low: 50,
    rain: true,
  });

  const packingLists = {
    clothing: [
      { item: 'Base layer shirts', count: days, essential: true },
      { item: 'Hiking pants/shorts', count: 2, essential: true },
      { item: 'Insulating layer (fleece)', count: 1, essential: weather.low < 60 },
      { item: 'Rain jacket', count: 1, essential: weather.rain },
      { item: 'Warm jacket', count: 1, essential: weather.low < 50 },
      { item: 'Underwear', count: days + 1, essential: true },
      { item: 'Socks (wool)', count: days + 1, essential: true },
      { item: 'Sleepwear', count: 1, essential: true },
      { item: 'Hat', count: 1, essential: true },
      { item: 'Gloves', count: 1, essential: weather.low < 50 },
    ],
    gear: [
      { item: 'Tent', count: 1, essential: true },
      { item: 'Sleeping bag', count: 1, essential: true },
      { item: 'Sleeping pad', count: 1, essential: true },
      { item: 'Headlamp + batteries', count: 1, essential: true },
      { item: 'Camping stove + fuel', count: 1, essential: true },
      { item: 'Cookware set', count: 1, essential: true },
      { item: 'First aid kit', count: 1, essential: true },
      { item: 'Multi-tool/knife', count: 1, essential: true },
      { item: 'Water filter/purifier', count: 1, essential: true },
      { item: 'Bear spray', count: 1, essential: false },
    ],
    food: [
      { item: 'Breakfast items', days: days, type: 'quick' },
      { item: 'Lunch items', days: days, type: 'no-cook' },
      { item: 'Dinner meals', days: days, type: 'cook' },
      { item: 'Snacks (trail mix, bars)', days: days * 3, type: 'any' },
      { item: 'Coffee/tea', days: days, type: 'drink' },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <Backpack className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-semibold">Trip Planner</h2>
        </div>
        <p className="text-slate-400">Generate packing lists based on weather and trip duration.</p>
      </div>

      {/* Trip Settings */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-medium mb-4">Trip Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-400 block mb-2">Number of Days</label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-2">Expected High</label>
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <input
                type="number"
                value={weather.high}
                onChange={(e) => setWeather({...weather, high: Number(e.target.value)})}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
              <span>°F</span>
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-2">Expected Low</label>
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-blue-400" />
              <input
                type="number"
                value={weather.low}
                onChange={(e) => setWeather({...weather, low: Number(e.target.value)})}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
              />
              <span>°F</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={weather.rain}
            onChange={(e) => setWeather({...weather, rain: e.target.checked})}
            className="w-4 h-4"
          />
          <label className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-400" />
            Rain expected
          </label>
        </div>
      </div>

      {/* Packing Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clothing */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Shirt className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold">Clothing</h3>
          </div>
          <div className="space-y-2">
            {packingLists.clothing.map((item) => (
              <div key={item.item} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className={!item.essential ? 'text-slate-500' : ''}>{item.item}</span>
                  {item.essential && <span className="text-xs text-red-400">*</span>}
                </div>
                <span className="text-slate-400">×{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gear */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Backpack className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold">Gear</h3>
          </div>
          <div className="space-y-2">
            {packingLists.gear.map((item) => (
              <div key={item.item} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className={!item.essential ? 'text-slate-500' : ''}>{item.item}</span>
                  {item.essential && <span className="text-xs text-red-400">*</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Food List */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-semibold mb-4">Food Plan ({days} days)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packingLists.food.map((item) => (
            <div key={item.item} className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>{item.item}</span>
              </div>
              <span className="text-sm text-slate-400">{item.days} servings</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-cyan-900/30 border border-cyan-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Check className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-cyan-400">Before You Leave</span>
        </div>
        <ul className="text-sm text-cyan-200 space-y-1">
          <li>• Check weather forecast one more time</li>
          <li>• Charge all devices and power banks</li>
          <li>• Fill propane/fuel tanks</li>
          <li>• Share your itinerary with someone</li>
          <li>• Download offline maps</li>
        </ul>
      </div>
    </div>
  );
}
