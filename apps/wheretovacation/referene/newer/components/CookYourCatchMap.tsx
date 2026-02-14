'use client';

import React, { useState } from 'react';
import { 
  MapPin, 
  Star, 
  ChefHat, 
  Clock, 
  Phone, 
  Navigation, 
  Filter,
  Search,
  ThumbsUp,
  MessageSquare,
  Utensils,
  DollarSign,
  Users,
  Award,
  TrendingUp
} from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  coordinates: { lat: number; lng: number };
  rating: number;
  priceRange: string;
  specialties: string[];
  cookYourCatch: boolean;
  userReviews: UserReview[];
  distance?: string;
  prepTime?: string;
}

interface UserReview {
  id: string;
  userName: string;
  captain: string;
  fishType: string;
  rating: number;
  comment: string;
  date: string;
  helpful: number;
}

export default function CookYourCatchMap() {
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const restaurants: Restaurant[] = [
    {
      id: '1',
      name: "Tacky Jacks",
      address: "27267 E Beach Blvd, Orange Beach, AL 36561",
      phone: "(251) 981-4476",
      coordinates: { lat: 30.2926, lng: -87.5567 },
      rating: 4.5,
      priceRange: "$$",
      specialties: ["Fried Snapper", "Blackened Grouper", "Crab Legs"],
      cookYourCatch: true,
      distance: "2.3 miles",
      prepTime: "15-20 min",
      userReviews: [
        {
          id: '1',
          userName: "The Miller Family",
          captain: "Captain Mike Thompson",
          fishType: "Red Snapper",
          rating: 5,
          comment: "Captain Mike caught the fish, but Tacky Jacks grilled it to perfection! 5/5. The kids loved watching them cook our catch!",
          date: "2024-11-15",
          helpful: 12
        },
        {
          id: '2',
          userName: "Sarah Johnson",
          captain: "Captain Sarah Jenkins",
          fishType: "King Mackerel",
          rating: 4,
          comment: "Great blackened preparation. Could have been a bit spicier but overall excellent!",
          date: "2024-11-14",
          helpful: 8
        }
      ]
    },
    {
      id: '2',
      name: "Fisher's at Orange Beach Marina",
      address: "26999 Marina Rd, Orange Beach, AL 36561",
      phone: "(251) 981-6600",
      coordinates: { lat: 30.2926, lng: -87.5567 },
      rating: 4.7,
      priceRange: "$$$",
      specialties: ["Grilled Snapper", "Grouper Sandwich", "Seafood Platter"],
      cookYourCatch: true,
      distance: "0.1 miles",
      prepTime: "10-15 min",
      userReviews: [
        {
          id: '3',
          userName: "Robert Davis",
          captain: "Captain David Rodriguez",
          fishType: "Speckled Trout",
          rating: 5,
          comment: "Right at the marina - super convenient! They prepared our trout perfectly. Great service!",
          date: "2024-11-13",
          helpful: 15
        }
      ]
    },
    {
      id: '3',
      name: "The Gulf",
      address: "225 E Beach Blvd, Gulf Shores, AL 36542",
      phone: "(251) 968-4700",
      coordinates: { lat: 30.2745, lng: -87.6994 },
      rating: 4.3,
      priceRange: "$$",
      specialties: ["Pan-Seared Grouper", "Snapper Piccata", "Coconut Shrimp"],
      cookYourCatch: true,
      distance: "8.5 miles",
      prepTime: "20-25 min",
      userReviews: []
    },
    {
      id: '4',
      name: "Sassy Bass",
      address: "25101 Canal Rd, Orange Beach, AL 36561",
      phone: "(251) 981-5151",
      coordinates: { lat: 30.2856, lng: -87.5689 },
      rating: 4.6,
      priceRange: "$$",
      specialties: ["Blackened Redfish", "Fried Shrimp", "Oysters"],
      cookYourCatch: true,
      distance: "3.2 miles",
      prepTime: "15-20 min",
      userReviews: [
        {
          id: '4',
          userName: "The Wilson Group",
          captain: "Captain Mike Thompson",
          fishType: "Red Snapper",
          rating: 5,
          comment: "Amazing blackened preparation! The seasoning was perfect. Will definitely bring our catch back here!",
          date: "2024-11-12",
          helpful: 10
        }
      ]
    }
  ];

  const filteredRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         restaurant.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRating = filterRating === 0 || restaurant.rating >= filterRating;
    return matchesSearch && matchesRating && restaurant.cookYourCatch;
  });

  const handleGetDirections = (restaurant: Restaurant) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant.address)}`;
    window.open(url, '_blank');
  };

  const handleCallRestaurant = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const handleRatePrep = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowReviewForm(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Cook Your Catch Map</h2>
            <p className="text-green-100">Where local chefs prepare your fresh catch</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-green-100">
            {filteredRestaurants.length} restaurants ready to cook your catch
          </p>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-2 rounded-lg">
            <Award className="w-4 h-4" />
            <span className="text-sm">Community Rated</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search restaurants or specialties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value={0}>All Ratings</option>
              <option value={4}>4+ Stars</option>
              <option value={4.5}>4.5+ Stars</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Utensils className="w-4 h-4" />
            <span>Specialty preparations</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Fast prep times</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>Community approved</span>
          </div>
        </div>
      </div>

      {/* Restaurant List */}
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {filteredRestaurants.map((restaurant) => (
            <div key={restaurant.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{restaurant.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{restaurant.distance} away</span>
                    <span>•</span>
                    <span>{restaurant.prepTime}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    {renderStars(restaurant.rating)}
                    <span className="text-sm text-gray-600 ml-1">({restaurant.rating})</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{restaurant.priceRange}</span>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">{restaurant.address}</p>
                <div className="flex flex-wrap gap-1">
                  {restaurant.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              {/* User Reviews Section */}
              {restaurant.userReviews.length > 0 && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Community Reviews</h4>
                  <div className="space-y-2">
                    {restaurant.userReviews.slice(0, 2).map((review) => (
                      <div key={review.id} className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{review.userName}</span>
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        <p className="text-gray-600 italic">"{review.comment}"</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>Captain: {review.captain}</span>
                          <span>Fish: {review.fishType}</span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {review.helpful}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleGetDirections(restaurant)}
                  className="flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  Directions
                </button>
                <button
                  onClick={() => handleCallRestaurant(restaurant.phone)}
                  className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </button>
                <button
                  onClick={() => handleRatePrep(restaurant)}
                  className="flex items-center gap-1 bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm"
                >
                  <Star className="w-4 h-4" />
                  Rate Prep
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community Stats */}
      <div className="bg-gray-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>247 anglers have shared their experiences</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>523 reviews this month</span>
            </div>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All Community Reviews
          </button>
        </div>
      </div>

      {/* Review Form Modal */}
      {showReviewForm && selectedRestaurant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Rate Your Catch Preparation</h3>
              <button
                onClick={() => setShowReviewForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant
                </label>
                <input
                  type="text"
                  value={selectedRestaurant.name}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Captain
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Captain Mike Thompson"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fish Type
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Red Snapper"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rating
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      <Star className="w-6 h-6 text-gray-300 hover:text-yellow-500" />
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Review
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="How did they prepare your catch?"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Submit Review
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
