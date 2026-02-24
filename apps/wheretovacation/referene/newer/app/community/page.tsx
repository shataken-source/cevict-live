"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('stories');

  const communityPosts = [
    {
      id: 1,
      activity: '🏄 Surfing',
      title: 'Hidden Surf Spot in Costa Rica',
      author: 'AdventureSarah',
      excerpt: 'Found the most amazing break near Santa Teresa - perfect for intermediate surfers!',
      likes: 234,
      comments: 45
    },
    {
      id: 2,
      activity: '🏔️ Hiking',
      title: 'Summit Success: Mount Whitney Trail Guide',
      author: 'MountainMike',
      excerpt: 'Complete guide to conquering Whitney - permit tips, acclimatization, and gear list.',
      likes: 189,
      comments: 32
    },
    {
      id: 3,
      activity: '🎿 Skiing',
      title: 'Powder Day at Jackson Hole',
      author: 'SkiLifeJess',
      excerpt: 'Epic conditions in the Corbet\'s Couloir area today! Here\'s my run analysis.',
      likes: 156,
      comments: 28
    },
    {
      id: 4,
      activity: '🏖️ Beach',
      title: 'Secret Beach in Thailand',
      author: 'BeachWanderer',
      excerpt: 'Away from the crowds in Krabi - crystal clear water and amazing snorkeling.',
      likes: 298,
      comments: 67
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Travel Community
          </h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Share your activity-based adventures and connect with travelers who love the same experiences you do.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur rounded-lg p-1">
            <button
              onClick={() => setActiveTab('stories')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'stories'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Adventure Stories
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'tips'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Travel Tips
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === 'groups'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-200 hover:text-white'
              }`}
            >
              Activity Groups
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'stories' && (
          <div className="grid md:grid-cols-2 gap-6">
            {communityPosts.map((post) => (
              <div key={post.id} className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{post.activity}</span>
                  <div className="flex items-center gap-4 text-blue-200 text-sm">
                    <span>❤️ {post.likes}</span>
                    <span>💬 {post.comments}</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{post.title}</h3>
                <p className="text-blue-200 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-blue-300 text-sm">by {post.author}</span>
                  <button className="text-cyan-400 hover:text-cyan-300 font-medium">
                    Read More →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Activity-Based Travel Tips</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-cyan-400 mb-3">🏄 Watersports</h4>
                <ul className="space-y-2 text-blue-200">
                  <li>• Best surf seasons by destination</li>
                  <li>• Essential gear for beginners</li>
                  <li>• Safety tips for open water</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-cyan-400 mb-3">🏔️ Mountain Adventures</h4>
                <ul className="space-y-2 text-blue-200">
                  <li>• Altitude acclimatization guide</li>
                  <li>• Trail difficulty ratings</li>
                  <li>• Leave No Trace principles</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Join Activity Groups</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {['Surfing Enthusiasts', 'Mountain Hikers', 'Ski & Snowboard', 'Beach Lovers', 'Cultural Explorers', 'Fishing Adventures'].map((group) => (
                <div key={group} className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">
                    {group.includes('Surf') ? '🏄' : 
                     group.includes('Mountain') ? '🏔️' :
                     group.includes('Ski') ? '🎿' :
                     group.includes('Beach') ? '🏖️' :
                     group.includes('Cultural') ? '🏛️' : '🎣'}
                  </div>
                  <h4 className="text-white font-medium mb-2">{group}</h4>
                  <p className="text-blue-300 text-sm mb-3">2,847 members</p>
                  <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-md transition-colors">
                    Join Group
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            ← Back to Activity Search
          </Link>
        </div>
      </div>
    </div>
  );
}

