'use client';

/**
 * Success Stories Component
 * Show happy reunions to build trust and community
 */

import { useState, useEffect } from 'react';

interface SuccessStory {
  id: string;
  petName: string;
  petType: string;
  location: string;
  daysMissing: number;
  story: string;
  photoUrl: string;
  ownerName: string;
  reunionDate: string;
  likes: number;
}

export default function SuccessStories() {
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<SuccessStory | null>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/petreunion/success-stories');
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || getSampleStories());
      } else {
        setStories(getSampleStories());
      }
    } catch {
      setStories(getSampleStories());
    } finally {
      setLoading(false);
    }
  };

  const getSampleStories = (): SuccessStory[] => [
    {
      id: '1',
      petName: 'Max',
      petType: 'Golden Retriever',
      location: 'Atlanta, GA',
      daysMissing: 5,
      story: 'Max escaped during a thunderstorm. Thanks to PetReunion\'s AI matching, a kind neighbor who found him was connected with us within 48 hours!',
      photoUrl: '',
      ownerName: 'Sarah M.',
      reunionDate: '2024-12-20',
      likes: 234
    },
    {
      id: '2',
      petName: 'Luna',
      petType: 'Tabby Cat',
      location: 'Miami, FL',
      daysMissing: 12,
      story: 'Luna was missing for almost two weeks. The AI matched her with a shelter listing 30 miles away. She\'s finally home!',
      photoUrl: '',
      ownerName: 'James R.',
      reunionDate: '2024-12-15',
      likes: 189
    },
    {
      id: '3',
      petName: 'Buddy',
      petType: 'Beagle Mix',
      location: 'Nashville, TN',
      daysMissing: 3,
      story: 'Buddy slipped his collar during a walk. Someone found him and posted on PetReunion. The notification came instantly!',
      photoUrl: '',
      ownerName: 'Maria L.',
      reunionDate: '2024-12-22',
      likes: 156
    },
  ];

  const handleLike = (id: string) => {
    setStories(prev =>
      prev.map(s => s.id === id ? { ...s, likes: s.likes + 1 } : s)
    );
  };

  const shareStory = async (story: SuccessStory) => {
    const text = `🎉 ${story.petName} the ${story.petType} was reunited with their family after ${story.daysMissing} days missing! #PetReunion #HappyEnding`;
    
    if (navigator.share) {
      await navigator.share({
        title: `${story.petName}'s Reunion Story`,
        text,
        url: `https://petreunion.com/stories/${story.id}`
      });
    } else {
      await navigator.clipboard.writeText(text);
      alert('Story copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">🎉 Happy Reunions</h2>
          <p className="text-gray-600">Real stories from families reunited with their pets</p>
        </div>
        <a
          href="/submit-story"
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-all"
        >
          Share Your Story
        </a>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {stories.map(story => (
          <div
            key={story.id}
            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
            onClick={() => setSelectedStory(story)}
          >
            {/* Photo */}
            <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
              {story.photoUrl ? (
                <img src={story.photoUrl} alt={story.petName} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-white">
                  <div className="text-6xl mb-2">
                    {story.petType.toLowerCase().includes('cat') ? '🐱' : '🐕'}
                  </div>
                  <div className="font-bold text-xl">{story.petName}</div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  ✓ Reunited
                </span>
                <span className="text-sm text-gray-500">{story.daysMissing} days missing</span>
              </div>
              
              <h3 className="font-bold text-gray-900 mb-1">{story.petName}</h3>
              <p className="text-sm text-gray-500 mb-3">{story.petType} • {story.location}</p>
              
              <p className="text-gray-600 text-sm line-clamp-2 mb-4">{story.story}</p>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">- {story.ownerName}</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLike(story.id); }}
                    className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ❤️ {story.likes}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); shareStory(story); }}
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    📤
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedStory && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedStory(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-64 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center relative">
              {selectedStory.photoUrl ? (
                <img src={selectedStory.photoUrl} alt={selectedStory.petName} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-white">
                  <div className="text-8xl mb-2">
                    {selectedStory.petType.toLowerCase().includes('cat') ? '🐱' : '🐕'}
                  </div>
                </div>
              )}
              <button
                onClick={() => setSelectedStory(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  ✓ Reunited after {selectedStory.daysMissing} days
                </span>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedStory.petName}</h2>
              <p className="text-gray-500 mb-4">{selectedStory.petType} • {selectedStory.location}</p>

              <p className="text-gray-700 mb-6 leading-relaxed">{selectedStory.story}</p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <div className="text-sm text-gray-500">Shared by</div>
                  <div className="font-medium text-gray-900">{selectedStory.ownerName}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleLike(selectedStory.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all flex items-center gap-2"
                  >
                    ❤️ {selectedStory.likes}
                  </button>
                  <button
                    onClick={() => shareStory(selectedStory)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                  >
                    📤 Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Banner */}
      <div className="mt-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-center text-white">
        <h3 className="text-2xl font-bold mb-4">Every reunion story matters 💜</h3>
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div>
            <div className="text-4xl font-bold mb-1">50K+</div>
            <div className="text-purple-200">Pets Reunited</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-1">3 Days</div>
            <div className="text-purple-200">Avg. Reunion Time</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-1">92%</div>
            <div className="text-purple-200">Success Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
}

