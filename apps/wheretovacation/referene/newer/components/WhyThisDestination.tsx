import React from 'react';

interface Reason {
  type: 'weather' | 'cost' | 'seasonality' | 'audience' | 'activity';
  title: string;
  description: string;
  strength: 'high' | 'medium' | 'low';
}

interface WhyThisDestinationProps {
  destination: string;
  reasons: Reason[];
  compact?: boolean;
}

const reasonIcons = {
  weather: '🌤️',
  cost: '💰',
  seasonality: '📅',
  audience: '👥',
  activity: '🎯',
};

const strengthColors = {
  high: 'text-green-400 bg-green-400/10 border-green-400/30',
  medium: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  low: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
};

export default function WhyThisDestination({ destination, reasons, compact = false }: WhyThisDestinationProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-white mb-3">Why {destination}?</h4>
        {reasons.slice(0, 3).map((reason, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <span className="text-lg">{reasonIcons[reason.type]}</span>
            <div>
              <div className="font-medium text-white">{reason.title}</div>
              <div className="text-blue-200">{reason.description}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🎯</span>
        Why {destination}?
      </h3>
      
      <div className="grid gap-4">
        {reasons.map((reason, index) => (
          <div
            key={index}
            className={`flex items-start gap-4 p-4 rounded-lg border transition-all hover:bg-white/5 ${strengthColors[reason.strength]}`}
          >
            <div className="text-2xl flex-shrink-0">{reasonIcons[reason.type]}</div>
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-1">{reason.title}</h4>
              <p className="text-blue-200 text-sm leading-relaxed">{reason.description}</p>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${strengthColors[reason.strength]}`}>
                  {reason.strength === 'high' ? 'Strong Match' : 
                   reason.strength === 'medium' ? 'Good Match' : 'Consider'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <p className="text-blue-300 text-sm">
          These recommendations are based on your travel preferences, seasonal patterns, and destination characteristics.
        </p>
      </div>
    </div>
  );
}

// Helper function to generate reasons for destinations
export function generateDestinationReasons(
  destination: string,
  userPreferences?: {
    budget?: 'low' | 'medium' | 'high';
    travelStyle?: 'relax' | 'adventure' | 'family' | 'nightlife';
    weatherPreference?: 'warm' | 'cold' | 'moderate';
    month?: number;
  }
): Reason[] {
  const reasons: Reason[] = [];
  
  // Stub data - in production this would come from a database or API
  const destinationData: Record<string, any> = {
    'costa rica': {
      bestMonths: [12, 1, 2, 3],
      costLevel: 'medium',
      greatFor: ['adventure', 'family'],
      weather: 'warm',
      activities: ['surfing', 'rainforest', 'wildlife'],
    },
    'hawaii': {
      bestMonths: [4, 5, 9, 10],
      costLevel: 'high',
      greatFor: ['relax', 'family', 'adventure'],
      weather: 'warm',
      activities: ['beach', 'volcanoes', 'surfing'],
    },
    'colorado': {
      bestMonths: [6, 7, 8, 12, 1, 2],
      costLevel: 'medium',
      greatFor: ['adventure', 'family'],
      weather: 'cold',
      activities: ['skiing', 'hiking', 'mountains'],
    },
  };

  const data = destinationData[destination.toLowerCase()];
  if (!data) return [];

  // Weather-based reasoning
  if (userPreferences?.weatherPreference === data.weather) {
    reasons.push({
      type: 'weather',
      title: 'Perfect Weather Match',
      description: `${destination} offers the ${data.weather} conditions you're looking for during this time of year.`,
      strength: 'high',
    });
  }

  // Cost-based reasoning
  if (userPreferences?.budget === data.costLevel) {
    reasons.push({
      type: 'cost',
      title: 'Fits Your Budget',
      description: `${destination} is priced ${data.costLevel} compared to similar destinations, offering great value for your money.`,
      strength: 'high',
    });
  }

  // Seasonality reasoning
  const currentMonth = userPreferences?.month || new Date().getMonth() + 1;
  if (data.bestMonths.includes(currentMonth)) {
    reasons.push({
      type: 'seasonality',
      title: 'Peak Season Timing',
      description: `You're planning to visit during one of the best months for ${destination}, with ideal conditions and activities.`,
      strength: 'high',
    });
  } else {
    reasons.push({
      type: 'seasonality',
      title: 'Shoulder Season Opportunity',
      description: `Visit ${destination} during this time for fewer crowds and potentially lower prices while still enjoying great experiences.`,
      strength: 'medium',
    });
  }

  // Travel style reasoning
  if (userPreferences?.travelStyle && data.greatFor.includes(userPreferences.travelStyle)) {
    reasons.push({
      type: 'audience',
      title: 'Perfect For Your Travel Style',
      description: `${destination} is specifically known for being excellent for ${userPreferences.travelStyle} travelers.`,
      strength: 'high',
    });
  }

  // Activity-based reasoning
  reasons.push({
    type: 'activity',
    title: 'Incredible Activities',
    description: `Experience world-class ${data.activities.join(', ')} in ${destination}. These activities are among the best in the world.`,
    strength: 'medium',
  });

  return reasons;
}
