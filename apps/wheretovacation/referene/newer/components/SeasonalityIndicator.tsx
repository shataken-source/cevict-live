import React from 'react';
import { getSeasonalityInfo, getMonthQuality, getCrowdLevel, getSeasonalRecommendation, getWeatherForMonth, getEventsForMonth } from '@/lib/seasonality';

interface SeasonalityIndicatorProps {
  destinationId: string;
  month?: number;
  compact?: boolean;
  showRecommendation?: boolean;
}

export default function SeasonalityIndicator({ 
  destinationId, 
  month, 
  compact = false, 
  showRecommendation = true 
}: SeasonalityIndicatorProps) {
  const seasonalityData = getSeasonalityInfo(destinationId, month);
  
  if (!seasonalityData) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <p className="text-yellow-300 text-sm">Seasonality data not available</p>
      </div>
    );
  }

  const targetMonth = month || new Date().getMonth() + 1;
  const quality = getMonthQuality(seasonalityData, targetMonth);
  const crowd = getCrowdLevel(seasonalityData, targetMonth);
  const weather = getWeatherForMonth(seasonalityData, targetMonth);
  const recommendation = getSeasonalRecommendation(seasonalityData, targetMonth);
  const events = getEventsForMonth(seasonalityData, targetMonth);

  const monthName = new Date(2000, targetMonth - 1).toLocaleDateString('en', { month: 'long' });

  const qualityColors = {
    best: 'bg-green-500/20 text-green-300 border-green-500/30',
    shoulder: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    off: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  };

  const crowdColors = {
    peak: 'bg-red-500/20 text-red-300 border-red-500/30',
    high: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-300 border-green-500/30',
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className={`px-3 py-1 rounded-full border ${qualityColors[quality]}`}>
          {quality === 'best' ? '🌟 Peak' : quality === 'shoulder' ? '⭐ Great' : '💰 Budget'}
        </div>
        <div className={`px-3 py-1 rounded-full border ${crowdColors[crowd]}`}>
          {crowd === 'peak' ? '🔴 Crowded' : crowd === 'high' ? '🟡 Busy' : '🟢 Quiet'}
        </div>
        <div className="text-blue-300">
          {weather.temp}°F {weather.description}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">📅</span>
          Best Time to Visit
        </h3>
        <div className="text-blue-300 text-sm">
          {monthName} {new Date().getFullYear()}
        </div>
      </div>

      {/* Quality Indicator */}
      <div className="mb-6">
        <div className={`inline-flex items-center px-4 py-2 rounded-lg border ${qualityColors[quality]}`}>
          <span className="text-lg mr-2">
            {quality === 'best' ? '🌟' : quality === 'shoulder' ? '⭐' : '💰'}
          </span>
          <span className="font-medium">
            {quality === 'best' ? 'Peak Season' : 
             quality === 'shoulder' ? 'Shoulder Season' : 'Off Season'}
          </span>
        </div>
      </div>

      {/* Weather & Crowd Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🌡️</span>
            <span className="text-white font-medium">Weather</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{weather.temp}°F</div>
          <div className="text-blue-300 text-sm capitalize">{weather.description}</div>
          <div className="text-blue-400 text-xs mt-1">
            Humidity: {weather.humidity}% • Rainfall: {weather.rainfall} days/month
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">👥</span>
            <span className="text-white font-medium">Crowds</span>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full border ${crowdColors[crowd]} mb-2`}>
            <span className="text-sm font-medium capitalize">{crowd}</span>
          </div>
          <div className="text-blue-300 text-sm">
            {crowd === 'peak' ? 'High demand, book early' : 
             crowd === 'high' ? 'Moderate demand' : 'Fewer crowds'}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {showRecommendation && (
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💡</span>
            <span className="text-white font-medium">Recommendation</span>
          </div>
          <div className="font-medium text-white mb-1">{recommendation.recommendation}</div>
          <div className="text-blue-300 text-sm mb-2">{recommendation.reasoning}</div>
          <div className="text-green-300 text-sm font-medium">{recommendation.savings}</div>
        </div>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎉</span>
            <span className="text-white font-medium">Events in {monthName}</span>
          </div>
          {events.map((event, index) => (
            <div key={index} className="text-blue-300 text-sm">
              • {event.name}
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                event.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                event.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-blue-500/20 text-blue-300'
              }`}>
                {event.impact} impact
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Best Months Overview */}
      <div className="border-t border-white/10 pt-4">
        <div className="text-white font-medium mb-3">Season Overview</div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-green-300 font-medium mb-1">🌟 Best Months</div>
            <div className="text-blue-200">
              {seasonalityData.bestMonths.map(m => 
                new Date(2000, m - 1).toLocaleDateString('en', { month: 'short' })
              ).join(', ')}
            </div>
          </div>
          <div>
            <div className="text-blue-300 font-medium mb-1">⭐ Shoulder Months</div>
            <div className="text-blue-200">
              {seasonalityData.shoulderMonths.map(m => 
                new Date(2000, m - 1).toLocaleDateString('en', { month: 'short' })
              ).join(', ')}
            </div>
          </div>
          <div>
            <div className="text-orange-300 font-medium mb-1">💰 Off Season</div>
            <div className="text-blue-200">
              {seasonalityData.offSeasonMonths.map(m => 
                new Date(2000, m - 1).toLocaleDateString('en', { month: 'short' })
              ).join(', ')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
