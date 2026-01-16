import { Metadata } from 'next';
import Link from 'next/link';
import { Heart, MapPin, Calendar, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Success Stories - PetReunion',
  description: 'Real stories of pets reunited with their families through PetReunion\'s AI-powered matching technology.',
  robots: {
    index: true,
    follow: true,
  },
};

const stories = [
  {
    id: '1',
    petName: 'Max',
    petType: 'Golden Retriever',
    location: 'Atlanta, GA',
    daysMissing: 5,
    story: 'Max escaped during a thunderstorm. Thanks to PetReunion\'s AI matching, a kind neighbor who found him was connected with us within 48 hours! The confidence score was 95%, and when we saw his photo, we knew immediately it was our boy.',
    photoUrl: '',
    ownerName: 'Sarah M.',
    reunionDate: 'December 20, 2024',
    likes: 234
  },
  {
    id: '2',
    petName: 'Luna',
    petType: 'Tabby Cat',
    location: 'Miami, FL',
    daysMissing: 12,
    story: 'Luna was missing for almost two weeks. We had given up hope when we got the email from PetReunion. The AI matched her with a shelter listing 30 miles away—she had wandered much further than we thought possible. She\'s finally home and hasn\'t left our side since!',
    photoUrl: '',
    ownerName: 'James R.',
    reunionDate: 'December 15, 2024',
    likes: 189
  },
  {
    id: '3',
    petName: 'Buddy',
    petType: 'Beagle Mix',
    location: 'Nashville, TN',
    daysMissing: 3,
    story: 'Buddy slipped his collar during our evening walk. Someone found him and posted on PetReunion. The notification came instantly! We were reunited the same night. This platform is a lifesaver—I don\'t know what we would have done without it.',
    photoUrl: '',
    ownerName: 'Maria L.',
    reunionDate: 'December 22, 2024',
    likes: 156
  },
  {
    id: '4',
    petName: 'Whiskers',
    petType: 'Siamese Cat',
    location: 'Seattle, WA',
    daysMissing: 8,
    story: 'Whiskers got out through a window we didn\'t realize was open. A neighbor three blocks away found her and used PetReunion to report it. The AI facial recognition identified her markings and matched us within hours. We\'re so grateful!',
    photoUrl: '',
    ownerName: 'David K.',
    reunionDate: 'January 2, 2025',
    likes: 203
  }
];

export default function SuccessStoriesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Hero Section */}
      <section className="hero-gradient text-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="text-6xl mb-6">❤️</div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Happy Endings
          </h1>
          <p className="text-xl md:text-2xl opacity-95 leading-relaxed max-w-3xl mx-auto">
            Real stories of families reunited with their beloved pets through PetReunion's AI-powered matching technology.
          </p>
        </div>
      </section>

      {/* Success Stories Grid */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Every Pet Deserves to Come Home
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              These families never gave up hope. Neither should you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {stories.map((story) => (
              <div
                key={story.id}
                className="glass-card p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Story Header */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl flex-shrink-0">
                    🐾
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">
                      {story.petName}
                    </h3>
                    <p className="text-slate-600 font-medium">{story.petType}</p>
                  </div>
                </div>

                {/* Story Details */}
                <div className="flex gap-4 mb-4 text-sm text-slate-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {story.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {story.daysMissing} days missing
                  </div>
                </div>

                {/* Story Content */}
                <p className="text-slate-700 leading-relaxed mb-6">
                  {story.story}
                </p>

                {/* Story Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{story.ownerName}</span>
                    <span className="mx-2">•</span>
                    {story.reunionDate}
                  </div>
                  <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm font-medium">{story.likes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="text-5xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Your Story Could Be Next
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Don't wait. Every minute counts when your pet is missing. Let our AI help you find them.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/report/lost"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                Report Lost Pet
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/report/found"
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 border-2 border-blue-600"
              >
                Report Found Pet
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="py-16 px-4 bg-white/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold text-blue-600 mb-2">50K+</div>
              <div className="text-lg text-slate-700">Pets Reunited</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-purple-600 mb-2">3 Days</div>
              <div className="text-lg text-slate-700">Average Reunion Time</div>
            </div>
            <div>
              <div className="text-5xl font-bold text-pink-600 mb-2">95%</div>
              <div className="text-lg text-slate-700">Success Rate</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
