'use client';

import React from 'react';
import { usePreferences } from '@/lib/preferences';

export default function PreferenceSettings() {
  const { preferences, updatePreferences, setBudget, setTravelStyle, setWeatherPreference, reset } = usePreferences();

  const handleBudgetChange = (budget: typeof preferences.budget) => {
    setBudget(budget);
  };

  const handleTravelStyleChange = (style: typeof preferences.travelStyle) => {
    setTravelStyle(style);
  };

  const handleWeatherChange = (weather: typeof preferences.weatherPreference) => {
    setWeatherPreference(weather);
  };

  const handlePersonalizationToggle = (enabled: boolean) => {
    updatePreferences({ enablePersonalization: enabled });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all preferences? This cannot be undone.')) {
      reset();
    }
  };

  const budgetOptions = [
    { value: 'low', label: 'Budget', description: '$50-100/night', icon: '💰' },
    { value: 'medium', label: 'Moderate', description: '$100-200/night', icon: '💵' },
    { value: 'high', label: 'Luxury', description: '$200+/night', icon: '💎' },
  ];

  const travelStyleOptions = [
    { value: 'relax', label: 'Relaxation', description: 'Beaches, spas, peaceful', icon: '🏖️' },
    { value: 'adventure', label: 'Adventure', description: 'Hiking, sports, excitement', icon: '🏔️' },
    { value: 'family', label: 'Family-Friendly', description: 'Kids activities, safety', icon: '👨‍👩‍👧‍👦' },
    { value: 'nightlife', label: 'Nightlife', description: 'Bars, clubs, entertainment', icon: '🌃' },
    { value: 'culture', label: 'Cultural', description: 'Museums, history, local', icon: '🏛️' },
    { value: 'eco-tourism', label: 'Eco-Tourism', description: 'Nature, sustainability', icon: '🌿' },
  ];

  const weatherOptions = [
    { value: 'warm', label: 'Warm & Sunny', description: '75°F+', icon: '☀️' },
    { value: 'moderate', label: 'Moderate', description: '60-75°F', icon: '🌤️' },
    { value: 'cold', label: 'Cold & Snowy', description: 'Below 60°F', icon: '❄️' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Personalize Your Experience</h2>
          <p className="text-blue-200">
            Set your preferences to get better recommendations and a personalized experience. No account required.
          </p>
        </div>

        {/* Personalization Toggle */}
        <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Enable Personalization</h3>
              <p className="text-blue-200 text-sm">
                Allow us to remember your preferences and provide personalized recommendations
              </p>
            </div>
            <button
              onClick={() => handlePersonalizationToggle(!preferences.enablePersonalization)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.enablePersonalization ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.enablePersonalization ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {preferences.enablePersonalization && (
          <>
            {/* Budget Preference */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Budget Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {budgetOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleBudgetChange(option.value as typeof preferences.budget)}
                    className={`p-4 rounded-lg border transition-all text-left ${
                      preferences.budget === option.value
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-white/5 border-white/20 text-blue-200 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <div className="text-sm opacity-75">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Style */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Travel Style</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {travelStyleOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTravelStyleChange(option.value as typeof preferences.travelStyle)}
                    className={`p-4 rounded-lg border transition-all text-left ${
                      preferences.travelStyle === option.value
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-white/5 border-white/20 text-blue-200 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <div className="text-sm opacity-75">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Weather Preference */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Weather Preference</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {weatherOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleWeatherChange(option.value as typeof preferences.weatherPreference)}
                    className={`p-4 rounded-lg border transition-all text-left ${
                      preferences.weatherPreference === option.value
                        ? 'bg-cyan-500/20 border-cyan-400 text-white'
                        : 'bg-white/5 border-white/20 text-blue-200 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <div className="text-sm opacity-75">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">Your Activity</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-blue-300">Searches</div>
                  <div className="text-xl font-bold text-white">{preferences.searchedDestinations.length}</div>
                </div>
                <div>
                  <div className="text-blue-300">Views</div>
                  <div className="text-xl font-bold text-white">{preferences.viewedDestinations.length}</div>
                </div>
                <div>
                  <div className="text-blue-300">Favorites</div>
                  <div className="text-xl font-bold text-white">{preferences.favoriteDestinations.length}</div>
                </div>
                <div>
                  <div className="text-blue-300">Visits</div>
                  <div className="text-xl font-bold text-white">{preferences.visitCount}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-white/10">
          <div className="text-blue-300 text-sm">
            Preferences are stored locally in your browser. No account required.
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
          >
            Reset All Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
