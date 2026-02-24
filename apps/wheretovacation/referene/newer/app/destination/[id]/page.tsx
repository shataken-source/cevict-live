import { Metadata } from 'next';
import SeasonalityIndicator from '@/components/SeasonalityIndicator';
import WhyThisDestination, { generateDestinationReasons } from '@/components/WhyThisDestination';
import { getSeasonalityInfo } from '@/lib/seasonality';
import { generateIntentMetadata } from '@/lib/seo-metadata';

interface DestinationPageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: DestinationPageProps): Promise<Metadata> {
  const destinationData = getDestinationData(params.id);
  
  if (!destinationData) {
    return {
      title: 'Destination Not Found',
      description: 'The destination you are looking for could not be found.',
    };
  }

  return generateIntentMetadata(
    {
      primary: 'best',
      secondary: destinationData.weather === 'warm' ? 'beach' : 'mountain',
    },
    destinationData,
    'Vacation'
  );
}

function getDestinationData(id: string) {
  const destinations = {
    'costa-rica': {
      name: 'Costa Rica',
      country: 'Costa Rica',
      description: 'Pura Vida paradise with stunning beaches, rainforests, and incredible wildlife.',
      activities: ['Surfing', 'Rainforest Tours', 'Wildlife Watching', 'Volcano Hiking'],
      weather: 'warm' as const,
      avgCost: 150,
      knownFor: 'Eco-tourism and adventure',
      bestMonths: 'December - April'
    },
    'hawaii': {
      name: 'Hawaii',
      country: 'USA',
      description: 'Tropical paradise with world-class beaches, volcanoes, and Hawaiian culture.',
      activities: ['Beach Activities', 'Surfing', 'Volcano Tours', 'Snorkeling'],
      weather: 'warm' as const,
      avgCost: 300,
      knownFor: 'Volcanic landscapes and surfing',
      bestMonths: 'April - May, September - October'
    },
    'colorado': {
      name: 'Colorado',
      country: 'USA',
      description: 'Mountain paradise with skiing, hiking, and stunning alpine scenery.',
      activities: ['Skiing', 'Hiking', 'Mountain Biking', 'Wildlife Tours'],
      weather: 'cold' as const,
      avgCost: 180,
      knownFor: 'Rocky Mountains and outdoor adventures',
      bestMonths: 'June - September'
    },
  };

  return destinations[id as keyof typeof destinations];
}

export default function DestinationPage({ params }: DestinationPageProps) {
  const destinationData = getDestinationData(params.id);
  
  if (!destinationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Destination Not Found</h1>
          <p className="text-blue-200 mb-8">The destination you are looking for could not be found.</p>
          <a href="/search" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all">
            ← Back to Search
          </a>
        </div>
      </div>
    );
  }

  const seasonalityData = getSeasonalityInfo(params.id);
  const currentMonth = new Date().getMonth() + 1;
  const reasons = generateDestinationReasons(destinationData.name, {
    budget: 'medium',
    travelStyle: 'adventure',
    weatherPreference: destinationData.weather,
    month: currentMonth,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {destinationData.name}
          </h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            {destinationData.description}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Why This Destination */}
            <WhyThisDestination 
              destination={destinationData.name}
              reasons={reasons}
              compact={false}
            />

            {/* Activities */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Popular Activities</h2>
              <div className="grid grid-cols-2 gap-4">
                {destinationData.activities.map((activity, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="text-white font-medium">{activity}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking CTA */}
            <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-8 border border-cyan-400/30">
              <h2 className="text-2xl font-bold text-white mb-4">Ready to Visit {destinationData.name}?</h2>
              <p className="text-blue-200 mb-6">
                Start planning your perfect vacation with our personalized recommendations and booking tools.
              </p>
              <div className="flex gap-4">
                <a href="/booking" className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all">
                  Book Now
                </a>
                <a href="/search" className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all">
                  Search More
                </a>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Seasonality Indicator */}
            <SeasonalityIndicator 
              destinationId={params.id}
              month={currentMonth}
              compact={false}
              showRecommendation={true}
            />

            {/* Quick Info */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">Quick Info</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-blue-300 text-sm">Average Cost</div>
                  <div className="text-white font-semibold">${destinationData.avgCost}/night</div>
                </div>
                <div>
                  <div className="text-blue-300 text-sm">Weather</div>
                  <div className="text-white font-semibold capitalize">{destinationData.weather}</div>
                </div>
                <div>
                  <div className="text-blue-300 text-sm">Country</div>
                  <div className="text-white font-semibold">{destinationData.country}</div>
                </div>
              </div>
            </div>

            {/* Compare */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">Compare Destinations</h3>
              <p className="text-blue-200 mb-4 text-sm">
                See how {destinationData.name} compares to other destinations.
              </p>
              <a href="/compare" className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-center block">
                ⚖️ Compare Now
              </a>
            </div>
          </div>
        </div>

        {/* Back Navigation */}
        <div className="text-center mt-12">
          <a href="/search" className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all">
            ← Back to Search
          </a>
        </div>
      </div>
    </div>
  );
}
