import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, Shield, Clock, Award } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const mockCaptains = [
  {
    id: 'capt-001',
    name: 'Captain James Mitchell',
    location: 'Gulf Shores, AL',
    rating: 4.9,
    reviewCount: 127,
    responseTime: '2 hours',
    yearsExperience: 15,
    specialties: ['Deep Sea Fishing', 'Offshore Charters'],
    uscgLicense: 'OUPV 100-Ton',
    verified: true,
    topRated: true,
    quickResponder: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    totalTrips: 450
  },
  {
    id: 'capt-002',
    name: 'Captain Sarah Rodriguez',
    location: 'Destin, FL',
    rating: 5.0,
    reviewCount: 89,
    responseTime: '1 hour',
    yearsExperience: 12,
    specialties: ['Family Fishing', 'Eco Tours'],
    uscgLicense: 'Master 50-Ton',
    verified: true,
    topRated: true,
    quickResponder: true,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    totalTrips: 380
  }
];

export default function CaptainDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [captains] = useState(mockCaptains);

  const filteredCaptains = captains.filter(captain =>
    captain.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    captain.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    captain.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Verified Captains</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Browse our directory of USCG-licensed and verified captains
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, location, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 py-6 text-lg"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredCaptains.map((captain) => (
            <Card key={captain.id} className="p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={captain.avatar} alt={captain.name} />
                  <AvatarFallback>{captain.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{captain.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4" />
                    {captain.location}
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{captain.rating}</span>
                    <span className="text-sm text-gray-600">({captain.reviewCount})</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {captain.verified && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <Shield className="w-3 h-3 mr-1" />
                    USCG Verified
                  </Badge>
                )}
                {captain.topRated && (
                  <Badge className="bg-yellow-100 text-yellow-700">
                    <Award className="w-3 h-3 mr-1" />
                    Top Rated
                  </Badge>
                )}
                {captain.quickResponder && (
                  <Badge className="bg-green-100 text-green-700">
                    <Clock className="w-3 h-3 mr-1" />
                    Quick Response
                  </Badge>
                )}
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Experience:</span>
                  <span className="font-semibold">{captain.yearsExperience} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">License:</span>
                  <span className="font-semibold">{captain.uscgLicense}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Trips:</span>
                  <span className="font-semibold">{captain.totalTrips}</span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Specialties:</p>
                <div className="flex flex-wrap gap-1">
                  {captain.specialties.map((specialty, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              <Link to={`/captain/${captain.id}`}>
                <Button className="w-full">View Profile</Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
