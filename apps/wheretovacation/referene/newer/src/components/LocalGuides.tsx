import { Star, MapPin, MessageCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const guides = [
  { id: 1, name: 'Maria Santos', location: 'Barcelona, Spain', rating: 4.9, reviews: 127, tours: 45, image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763256636868_d70ab90e.webp', verified: true, specialty: 'Food Tours' },
  { id: 2, name: 'Kenji Tanaka', location: 'Kyoto, Japan', rating: 5.0, reviews: 203, tours: 67, image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763256638830_03249b98.webp', verified: true, specialty: 'Cultural Heritage' },
  { id: 3, name: 'Ahmed Hassan', location: 'Cairo, Egypt', rating: 4.8, reviews: 156, tours: 89, image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763256640736_a5fd0428.webp', verified: true, specialty: 'Historical Sites' },
  { id: 4, name: 'Sofia Rossi', location: 'Rome, Italy', rating: 4.9, reviews: 189, tours: 112, image: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763256642627_3c49dba9.webp', verified: true, specialty: 'Art & Architecture' },
];

export default function LocalGuides() {
  return (
    <div className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-bold mb-3">Connect with Local Guides</h2>
        <p className="text-gray-600 mb-10">Verified experts who know their cities inside out</p>

        <div className="grid md:grid-cols-4 gap-6">
          {guides.map(guide => (
            <div key={guide.id} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 hover:shadow-xl transition">
              <div className="relative mb-4">
                <img src={guide.image} alt={guide.name} className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-white shadow-lg" />
                {guide.verified && (
                  <CheckCircle className="w-6 h-6 text-blue-500 bg-white rounded-full absolute bottom-0 right-1/2 translate-x-12" />
                )}
              </div>
              
              <h3 className="font-bold text-lg text-center mb-1">{guide.name}</h3>
              <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mb-3">
                <MapPin className="w-4 h-4" />
                <span>{guide.location}</span>
              </div>

              <Badge className="w-full justify-center mb-3">{guide.specialty}</Badge>

              <div className="flex justify-between text-sm mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{guide.rating}</span>
                  <span className="text-gray-500">({guide.reviews})</span>
                </div>
                <span className="text-gray-600">{guide.tours} tours</span>
              </div>

              <Button className="w-full gap-2" size="sm">
                <MessageCircle className="w-4 h-4" />Contact
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}