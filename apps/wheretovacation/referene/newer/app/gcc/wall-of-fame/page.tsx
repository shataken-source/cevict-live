import GCCNavigation, { GCCFooter } from '@/components/GCCNavigation';
import { Button } from '@/components/ui/button';
import { 
  Camera, 
  Upload, 
  Star, 
  Heart, 
  Share2, 
  Users, 
  Fish, 
  MapPin, 
  Calendar,
  Trophy,
  Image as ImageIcon,
  CheckCircle
} from 'lucide-react';

export default function WallOfFamePage() {
  const featuredPhotos = [
    {
      id: 1,
      imageUrl: "/api/placeholder/400/300",
      caption: "Captain Mike with a beautiful 25lb Red Snapper!",
      fisherman: "The Johnson Family",
      date: "Dec 15, 2024",
      location: "Orange Beach, AL",
      likes: 245,
      captain: "Capt. Mike Thompson"
    },
    {
      id: 2,
      imageUrl: "/api/placeholder/400/300", 
      caption: "First-time angler Sarah with her first King Mackerel!",
      fisherman: "Sarah Davis",
      date: "Dec 14, 2024",
      location: "Gulf Shores, AL",
      likes: 189,
      captain: "Capt. Sarah Jenkins"
    },
    {
      id: 3,
      imageUrl: "/api/placeholder/400/300",
      caption: "The Wilson boys with their limit of Speckled Trout!",
      fisherman: "The Wilson Family",
      date: "Dec 13, 2024",
      location: "Back Bay, AL",
      likes: 312,
      captain: "Capt. David Rodriguez"
    },
    {
      id: 4,
      imageUrl: "/api/placeholder/400/300",
      caption: "Bachelor party crew with some serious offshore catches!",
      fisherman: "Mark's Bachelor Party",
      date: "Dec 12, 2024",
      location: "Offshore, AL",
      likes: 428,
      captain: "Capt. Mike Thompson"
    },
    {
      id: 5,
      imageUrl: "/api/placeholder/400/300",
      caption: "Little Emma's first fish - a beautiful Flounder!",
      fisherman: "The Martinez Family",
      date: "Dec 11, 2024",
      location: "Perdido Pass, AL",
      likes: 567,
      captain: "Capt. Sarah Jenkins"
    },
    {
      id: 6,
      imageUrl: "/api/placeholder/400/300",
      caption: "Corporate retreat team with an amazing catch!",
      fisherman: "TechCorp Team Building",
      date: "Dec 10, 2024",
      location: "Gulf Shores, AL",
      likes: 234,
      captain: "Capt. David Rodriguez"
    }
  ];

  const uploadGuidelines = [
    "Upload your best fishing photos from your Gulf Coast Charters trip",
    "Include details about your catch, location, and captain",
    "Photos must be from Gulf Coast Charters trips",
    "Keep it family-friendly and appropriate for all ages",
    "Maximum file size: 10MB per photo",
    "Accepted formats: JPG, PNG, HEIC"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <GCCNavigation currentPage="wall-of-fame" />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Wall of Fame</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Real photos from real anglers! Share your Gulf Coast Charters catches and join 
              our community of fishing enthusiasts. Better than any professional photography - 
              these are authentic moments from our customers!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Users className="w-4 h-4" />
                <span>Customer Photos</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Trophy className="w-4 h-4" />
                <span>Authentic Catches</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full">
                <Heart className="w-4 h-4" />
                <span>Community Favorite</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 border border-blue-200">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Share Your Catch!</h2>
              <p className="text-xl text-gray-600">
                Been fishing with us? Upload your photos to join our Wall of Fame!
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="bg-white rounded-xl p-6 border-2 border-dashed border-blue-300 text-center">
                  <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Your Photos</h3>
                  <p className="text-gray-600 mb-4">
                    Drag and drop your photos here, or click to browse
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Camera className="w-4 h-4 mr-2" />
                    Choose Photos
                  </Button>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Upload Guidelines:</h4>
                  <ul className="space-y-2">
                    {uploadGuidelines.map((guideline, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{guideline}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Why Share Your Photos?</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Star className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Featured Spot</h4>
                      <p className="text-sm text-gray-600">Best photos get featured on our homepage and social media</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Fish className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Monthly Prizes</h4>
                      <p className="text-sm text-gray-600">Win free gear and charter trips for the best catches</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Heart className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Community Love</h4>
                      <p className="text-sm text-gray-600">Join thousands of anglers sharing their passion</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Trophy className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Hall of Fame</h4>
                      <p className="text-sm text-gray-600">Top catches earn permanent spots in our Hall of Fame</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Recent Catches</h2>
            <p className="text-xl text-gray-600">
              Real photos from our amazing customers and their Gulf Coast adventures
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPhotos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                <div className="aspect-w-16 aspect-h-12 bg-gray-200">
                  <img 
                    src={photo.imageUrl} 
                    alt={photo.caption}
                    className="w-full h-64 object-cover"
                  />
                </div>
                
                <div className="p-4">
                  <p className="text-gray-900 font-medium mb-2">{photo.caption}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{photo.fisherman}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{photo.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{photo.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-500 transition-colors">
                        <Heart className="w-4 h-4" />
                        <span>{photo.likes}</span>
                      </button>
                      <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-500 transition-colors">
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                    </div>
                    <div className="text-sm text-blue-600 font-medium">
                      Capt. {photo.captain.split(' ')[1]}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Photos
            </Button>
          </div>
        </div>
      </section>

      {/* Hall of Fame */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Hall of Fame</h2>
            <p className="text-xl text-gray-600">
              The most memorable catches from our charter history
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">85lb</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Largest Grouper</h3>
              <p className="text-gray-600 mb-2">Caught by the Miller Family</p>
              <p className="text-sm text-blue-600">Capt. Mike Thompson • July 2024</p>
            </div>

            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">47</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Most Fish Caught</h3>
              <p className="text-gray-600 mb-2">Corporate Team Building Event</p>
              <p className="text-sm text-blue-600">Capt. Sarah Jenkins • September 2024</p>
            </div>

            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">5yrs</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Youngest Angler</h3>
              <p className="text-gray-600 mb-2">Little Emma's First Flounder</p>
              <p className="text-sm text-blue-600">Capt. David Rodriguez • October 2024</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Join the Wall of Fame?</h2>
            <p className="text-xl text-blue-100 mb-8">
              Book your Gulf Coast Charters adventure and create memories that last a lifetime!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                <Camera className="w-5 h-5 mr-2" />
                Book Your Trip
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Upload className="w-5 h-5 mr-2" />
                Upload Your Photos
              </Button>
            </div>
          </div>
        </div>
      </section>

      <GCCFooter />
    </div>
  );
}
