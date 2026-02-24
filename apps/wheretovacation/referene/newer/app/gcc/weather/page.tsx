import { Button } from '@/components/ui/button';
import { Anchor, Cloud, CloudRain, Sun, Wind, Waves, Thermometer, Eye, Droplets, Navigation } from 'lucide-react';
import Link from 'next/link';
import GCCNavigation, { GCCFooter } from '@/components/GCCNavigation';

export default function GCCWeatherPage() {
  const currentWeather = {
    temperature: 72,
    feelsLike: 75,
    condition: 'Partly Cloudy',
    windSpeed: 12,
    windDirection: 'SE',
    humidity: 65,
    visibility: 10,
    pressure: 30.15,
    uvIndex: 6,
    waterTemp: 68,
    tideStatus: 'Incoming',
    nextHighTide: '2:45 PM',
    nextLowTide: '8:30 PM'
  };

  const hourlyForecast = [
    { time: '12 PM', temp: 72, condition: 'Partly Cloudy', icon: Cloud },
    { time: '1 PM', temp: 74, condition: 'Partly Cloudy', icon: Cloud },
    { time: '2 PM', temp: 76, condition: 'Sunny', icon: Sun },
    { time: '3 PM', temp: 78, condition: 'Sunny', icon: Sun },
    { time: '4 PM', temp: 77, condition: 'Partly Cloudy', icon: Cloud },
    { time: '5 PM', temp: 75, condition: 'Partly Cloudy', icon: Cloud },
    { time: '6 PM', temp: 73, condition: 'Cloudy', icon: Cloud },
    { time: '7 PM', temp: 71, condition: 'Clear', icon: Sun }
  ];

  const weeklyForecast = [
    { day: 'Today', high: 78, low: 65, condition: 'Partly Cloudy', icon: Cloud },
    { day: 'Tomorrow', high: 80, low: 67, condition: 'Sunny', icon: Sun },
    { day: 'Wednesday', high: 82, low: 69, condition: 'Sunny', icon: Sun },
    { day: 'Thursday', high: 79, low: 66, condition: 'Partly Cloudy', icon: Cloud },
    { day: 'Friday', high: 75, low: 64, condition: 'Showers', icon: CloudRain },
    { day: 'Saturday', high: 77, low: 65, condition: 'Partly Cloudy', icon: Cloud },
    { day: 'Sunday', high: 80, low: 68, condition: 'Sunny', icon: Sun }
  ];

  const fishingConditions = {
    overall: 'Good',
    fishActivity: 'High',
    bestTime: 'Early Morning',
    recommendedSpecies: ['Redfish', 'Speckled Trout', 'Flounder'],
    moonPhase: 'Waxing Crescent',
    solunarTimes: {
      major: '6:30 AM - 8:30 AM',
      minor: '2:00 PM - 3:00 PM'
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return Sun;
      case 'partly cloudy':
      case 'cloudy':
        return Cloud;
      case 'showers':
      case 'rain':
        return CloudRain;
      default:
        return Sun;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <GCCNavigation currentPage="weather" />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Cloud className="w-16 h-16 mx-auto mb-6" />
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Gulf Coast Weather Intelligence</h1>
            <p className="text-xl text-purple-100 mb-8 max-w-3xl mx-auto">
              Real-time weather conditions, tide predictions, and fishing forecasts to help you plan the perfect day on the water.
            </p>
          </div>
        </div>
      </section>

      {/* Current Weather */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Current Conditions - Orange Beach, AL</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Main Current Weather */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-6xl font-bold mb-2">{currentWeather.temperature}°F</div>
                  <div className="text-xl text-blue-100">Feels like {currentWeather.feelsLike}°F</div>
                </div>
                <Sun className="w-24 h-24 text-yellow-300" />
              </div>
              <div className="text-xl font-medium mb-4">{currentWeather.condition}</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-200">Wind:</span>
                  <div className="font-medium">{currentWeather.windSpeed} mph {currentWeather.windDirection}</div>
                </div>
                <div>
                  <span className="text-blue-200">Humidity:</span>
                  <div className="font-medium">{currentWeather.humidity}%</div>
                </div>
                <div>
                  <span className="text-blue-200">UV Index:</span>
                  <div className="font-medium">{currentWeather.uvIndex}</div>
                </div>
                <div>
                  <span className="text-blue-200">Pressure:</span>
                  <div className="font-medium">{currentWeather.pressure} in</div>
                </div>
              </div>
            </div>

            {/* Marine Conditions */}
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-xl p-8">
              <Waves className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-6">Marine Conditions</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-cyan-100">Water Temperature:</span>
                  <span className="font-medium">{currentWeather.waterTemp}°F</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-100">Visibility:</span>
                  <span className="font-medium">{currentWeather.visibility} miles</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-100">Wave Height:</span>
                  <span className="font-medium">1-2 ft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-100">Water Clarity:</span>
                  <span className="font-medium">Good</span>
                </div>
              </div>
            </div>

            {/* Tide Information */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-8">
              <Navigation className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-6">Tide Information</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-green-100">Current Status:</span>
                  <div className="font-medium text-lg">{currentWeather.tideStatus}</div>
                </div>
                <div>
                  <span className="text-green-100">Next High Tide:</span>
                  <div className="font-medium">{currentWeather.nextHighTide}</div>
                </div>
                <div>
                  <span className="text-green-100">Next Low Tide:</span>
                  <div className="font-medium">{currentWeather.nextLowTide}</div>
                </div>
                <div>
                  <span className="text-green-100">Tide Range:</span>
                  <div className="font-medium">1.8 ft</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fishing Forecast */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Fishing Forecast</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">{fishingConditions.overall}</div>
              <div className="text-gray-600 text-sm mb-4">Overall Conditions</div>
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                <span className="text-sm">Favorable</span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">{fishingConditions.fishActivity}</div>
              <div className="text-gray-600 text-sm mb-4">Fish Activity</div>
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                <span className="text-sm">Very Active</span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-lg font-bold text-purple-600 mb-2">{fishingConditions.bestTime}</div>
              <div className="text-gray-600 text-sm mb-4">Best Fishing Time</div>
              <div className="flex items-center gap-2 text-purple-600">
                <div className="w-2 h-2 bg-purple-600 rounded-full" />
                <span className="text-sm">Optimal</span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-lg font-bold text-orange-600 mb-2">{fishingConditions.moonPhase}</div>
              <div className="text-gray-600 text-sm mb-4">Moon Phase</div>
              <div className="flex items-center gap-2 text-orange-600">
                <div className="w-2 h-2 bg-orange-600 rounded-full" />
                <span className="text-sm">Good</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recommended Species</h3>
              <div className="flex flex-wrap gap-2">
                {fishingConditions.recommendedSpecies.map((species, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {species}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Solunar Times</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Major Activity:</span>
                  <span className="font-medium">{fishingConditions.solunarTimes.major}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Minor Activity:</span>
                  <span className="font-medium">{fishingConditions.solunarTimes.minor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hourly Forecast */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Hourly Forecast</h2>
          
          <div className="overflow-x-auto">
            <div className="flex gap-4 pb-4">
              {hourlyForecast.map((hour, index) => {
                const Icon = getWeatherIcon(hour.condition);
                return (
                  <div key={index} className="flex-shrink-0 bg-gray-50 rounded-xl p-4 text-center min-w-[100px]">
                    <div className="text-sm text-gray-600 mb-2">{hour.time}</div>
                    <Icon className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <div className="text-lg font-bold text-gray-900">{hour.temp}°</div>
                    <div className="text-xs text-gray-600 mt-1">{hour.condition}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 7-Day Forecast */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">7-Day Forecast</h2>
          
          <div className="grid md:grid-cols-7 gap-4">
            {weeklyForecast.map((day, index) => {
              const Icon = getWeatherIcon(day.condition);
              return (
                <div key={index} className="bg-white rounded-xl p-4 text-center">
                  <div className="font-medium text-gray-900 mb-2">{day.day}</div>
                  <Icon className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <div className="text-sm text-gray-600 mb-2">{day.condition}</div>
                  <div className="flex justify-center gap-2 text-sm">
                    <span className="font-bold text-gray-900">{day.high}°</span>
                    <span className="text-gray-500">{day.low}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Weather Alerts */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Weather Alerts</h2>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Wind className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-yellow-800 mb-2">Small Craft Advisory</h3>
                <p className="text-yellow-700 mb-4">
                  A small craft advisory is in effect from Friday evening through Saturday morning. 
                  Winds expected 15-20 knots with seas 3-5 feet.
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button size="sm">
                    Get Notifications
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Perfect Weather for Your Trip?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Book your charter now while conditions are optimal. Our captains know the best spots 
            for any weather condition.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="px-8 py-6 text-lg bg-white text-blue-600 hover:bg-blue-50">
              <Link href="/gcc/booking">
                Book Your Trip
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="px-8 py-6 text-lg border-2 border-white text-white hover:bg-white hover:text-blue-600">
              <Link href="/gcc/boats">
                View Available Boats
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <GCCFooter />
    </div>
  );
}
