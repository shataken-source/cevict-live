'use client';

import React, { useState } from 'react';
import { 
  Trophy, 
  Star, 
  Calendar, 
  Users, 
  Fish, 
  Award, 
  Mail, 
  Share2, 
  Heart,
  Camera,
  Gift,
  Target,
  TrendingUp
} from 'lucide-react';

interface AnglerOfMonth {
  id: string;
  name: string;
  group: string;
  photo: string;
  story: string;
  catch: string;
  size: string;
  date: string;
  captain: string;
  quote: string;
  achievements: string[];
  socialShare?: string;
}

interface PastWinner {
  id: string;
  name: string;
  month: string;
  catch: string;
  photo: string;
}

export default function AnglerOfMonth() {
  const [currentWinner, setCurrentWinner] = useState<AnglerOfMonth>({
    id: '1',
    name: 'Emma Miller',
    group: 'The Miller Family',
    photo: '/api/placeholder/400/500',
    story: 'Emma caught her first Red Snapper on her 8th birthday! She was patient all morning and finally landed this beautiful 12.5-pounder. The whole family celebrated with a sunset dinner at The Wharf where the restaurant cooked her catch to perfection.',
    catch: 'Red Snapper',
    size: '12.5 lbs',
    date: 'November 2024',
    captain: 'Captain Mike Thompson',
    quote: 'This was the best birthday ever! I can\'t wait to come back and catch an even bigger fish!',
    achievements: [
      'First Red Snapper',
      'Youngest Angler This Month',
      'Perfect Release Technique'
    ],
    socialShare: 'https://gulfcoastcharters.com/angler/emma-miller'
  });

  const [pastWinners] = useState<PastWinner[]>([
    {
      id: '2',
      name: 'The Johnson Group',
      month: 'October 2024',
      catch: '24 King Mackerel',
      photo: '/api/placeholder/200/200'
    },
    {
      id: '3',
      name: 'Robert Davis',
      month: 'September 2024',
      catch: '18.2 lb Grouper',
      photo: '/api/placeholder/200/200'
    },
    {
      id: '4',
      name: 'The Wilson Family',
      month: 'August 2024',
      catch: 'First Family Charter',
      photo: '/api/placeholder/200/200'
    }
  ]);

  const [showNominationForm, setShowNominationForm] = useState(false);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Angler of the Month - Emma Miller',
        text: 'Check out Emma\'s amazing 12.5 lb Red Snapper catch!',
        url: currentWinner.socialShare
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(currentWinner.socialShare || '');
    }
  };

  const handleNominate = () => {
    setShowNominationForm(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Angler of the Month</h2>
            <p className="text-yellow-100">Celebrating our fishing community stars</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-2 rounded-lg">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{currentWinner.date}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-2 rounded-lg">
            <Star className="w-4 h-4" />
            <span className="text-sm">Featured Catch</span>
          </div>
        </div>
      </div>

      {/* Current Winner Spotlight */}
      <div className="p-6">
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Photo Section */}
          <div className="relative">
            <div className="aspect-[4/5] bg-gray-200 rounded-lg overflow-hidden">
              <img 
                src={currentWinner.photo} 
                alt={currentWinner.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute top-4 left-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              Featured Winner
            </div>
            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-2 rounded-lg text-sm">
              {currentWinner.catch} • {currentWinner.size}
            </div>
          </div>

          {/* Story Section */}
          <div className="flex flex-col">
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentWinner.name}</h3>
              <p className="text-gray-600 mb-4">{currentWinner.group}</p>
              
              <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Fish className="w-4 h-4" />
                  <span>{currentWinner.catch}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>{currentWinner.size}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{currentWinner.captain}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-900 italic">"{currentWinner.quote}"</p>
            </div>

            <p className="text-gray-700 mb-6">{currentWinner.story}</p>

            {/* Achievements */}
            <div className="mb-6">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Achievements
              </h4>
              <div className="flex flex-wrap gap-2">
                {currentWinner.achievements.map((achievement, index) => (
                  <span 
                    key={index}
                    className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {achievement}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share Story
              </button>
              <button className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                <Heart className="w-4 h-4" />
                Congratulate
              </button>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Gift className="w-6 h-6 text-blue-600" />
            <h4 className="font-bold text-gray-900">Win a Free GCC T-Shirt!</h4>
          </div>
          <p className="text-gray-700 mb-4">
            Each month we feature one outstanding angler. Winners receive a free Gulf Coast Charters t-shirt, 
            featured spot on our website, and bragging rights for the entire month!
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleNominate}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Nominate Someone
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4" />
              <span>Join our community of fishing enthusiasts!</span>
            </div>
          </div>
        </div>

        {/* Past Winners */}
        <div>
          <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            Past Winners
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {pastWinners.map((winner) => (
              <div key={winner.id} className="text-center group cursor-pointer">
                <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden mb-2 group-hover:shadow-md transition-shadow">
                  <img 
                    src={winner.photo} 
                    alt={winner.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <h5 className="font-medium text-gray-900 text-sm">{winner.name}</h5>
                <p className="text-xs text-gray-600">{winner.month}</p>
                <p className="text-xs text-blue-600 font-medium">{winner.catch}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nomination Form Modal */}
      {showNominationForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Nominate an Angler</h3>
              <button
                onClick={() => setShowNominationForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Angler's Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Smith"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tell Their Story
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="What made their catch special?"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Nomination
                </button>
                <button
                  type="button"
                  onClick={() => setShowNominationForm(false)}
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
