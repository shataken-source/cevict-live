import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Phone, Mail, Calendar, Shield, Award, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingCalendar from '@/components/BookingCalendar';
import ReviewCard from '@/components/ReviewCard';

const mockCaptainData = {
  'capt-001': {
    id: 'capt-001',
    name: 'Captain James Mitchell',
    location: 'Gulf Shores, AL',
    rating: 4.9,
    reviewCount: 127,
    responseTime: '2 hours',
    avgResponseTime: 'Within 2 hours',
    yearsExperience: 15,
    specialties: ['Deep Sea Fishing', 'Offshore Charters', 'Tournament Fishing'],
    uscgLicense: 'OUPV 100-Ton Master',
    licenseNumber: 'USCG-123456',
    licenseExpiry: '2026-12-31',
    verified: true,
    topRated: true,
    quickResponder: true,
    perfectSafety: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    totalTrips: 450,
    bio: 'With 15 years of experience navigating the Gulf Coast waters, I specialize in deep sea fishing and offshore charters. USCG licensed and fully insured.',
    certifications: ['CPR/First Aid', 'Marine Safety', 'Advanced Navigation', 'Weather Forecasting'],
    insurance: {
      provider: 'Maritime Insurance Co.',
      coverage: '$2,000,000',
      expiryDate: '2025-12-31'
    },
    safetyRecord: {
      totalTrips: 450,
      incidents: 0,
      safetyRating: '100%',
      lastInspection: '2024-11-01'
    },
    boats: ['Sea Ray 45', 'Boston Whaler 32'],
    languages: ['English', 'Spanish']
  }
};

const mockReviews = [
  {
    id: '1',
    customerName: 'John Smith',
    rating: 5,
    createdAt: '2024-11-10',
    reviewText: 'Captain James was fantastic! Very knowledgeable and made our trip unforgettable.',
    photos: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400']
  }
];

export default function CaptainProfile() {
  const { id } = useParams();
  const [showBooking, setShowBooking] = useState(false);
  const captain = mockCaptainData[id as keyof typeof mockCaptainData];

  if (!captain) {
    return <div className="container mx-auto px-4 py-12">Captain not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link to="/captains" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Directory
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-start gap-6 mb-6">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={captain.avatar} alt={captain.name} />
                  <AvatarFallback>{captain.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{captain.name}</h1>
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <MapPin className="w-5 h-5" />
                    {captain.location}
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold text-lg">{captain.rating}</span>
                      <span className="text-gray-600">({captain.reviewCount} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-4 h-4" />
                      Responds in {captain.responseTime}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {captain.verified && (
                      <Badge className="bg-blue-600"><Shield className="w-3 h-3 mr-1" />USCG Verified</Badge>
                    )}
                    {captain.topRated && (
                      <Badge className="bg-yellow-600"><Award className="w-3 h-3 mr-1" />Top Rated</Badge>
                    )}
                    {captain.quickResponder && (
                      <Badge className="bg-green-600"><Clock className="w-3 h-3 mr-1" />Quick Response</Badge>
                    )}
                    {captain.perfectSafety && (
                      <Badge className="bg-purple-600"><CheckCircle2 className="w-3 h-3 mr-1" />Perfect Safety</Badge>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-gray-700">{captain.bio}</p>
            </Card>

            <Tabs defaultValue="credentials" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
                <TabsTrigger value="safety">Safety Record</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="availability">Availability</TabsTrigger>
              </TabsList>

              <TabsContent value="credentials">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">USCG License</h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-600">License Type</p>
                      <p className="font-semibold">{captain.uscgLicense}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">License Number</p>
                      <p className="font-semibold">{captain.licenseNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Expiry Date</p>
                      <p className="font-semibold">{captain.licenseExpiry}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Experience</p>
                      <p className="font-semibold">{captain.yearsExperience} years</p>
                    </div>
                  </div>

                  <h4 className="font-bold mb-3">Certifications</h4>
                  <div className="grid grid-cols-2 gap-2 mb-6">
                    {captain.certifications.map((cert, idx) => (
                      <Badge key={idx} variant="outline" className="justify-start">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                        {cert}
                      </Badge>
                    ))}
                  </div>

                  <h4 className="font-bold mb-3">Insurance Coverage</h4>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="font-semibold text-green-900">{captain.insurance.coverage} Coverage</p>
                    <p className="text-sm text-green-700">Provider: {captain.insurance.provider}</p>
                    <p className="text-sm text-green-700">Valid until: {captain.insurance.expiryDate}</p>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="safety">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-4">Safety Record</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <div className="text-4xl font-bold text-green-600 mb-2">{captain.safetyRecord.safetyRating}</div>
                      <p className="text-gray-700">Safety Rating</p>
                    </div>
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <div className="text-4xl font-bold text-blue-600 mb-2">{captain.safetyRecord.incidents}</div>
                      <p className="text-gray-700">Incidents</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Trips Completed:</span>
                      <span className="font-semibold">{captain.safetyRecord.totalTrips}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Safety Inspection:</span>
                      <span className="font-semibold">{captain.safetyRecord.lastInspection}</span>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="space-y-4">
                  {mockReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="availability">
                <Card className="p-6">
                  <BookingCalendar />
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <h3 className="font-bold text-xl mb-4">Book with Captain {captain.name.split(' ')[1]}</h3>
              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">(251) 555-0123</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">james@gulfcoast.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{captain.avgResponseTime}</span>
                </div>
              </div>
              <Button className="w-full mb-3" size="lg" onClick={() => setShowBooking(!showBooking)}>
                Request Booking
              </Button>
              <Button variant="outline" className="w-full">
                Send Message
              </Button>
            </Card>

            <Card className="p-6">
              <h4 className="font-bold mb-3">Specialties</h4>
              <div className="space-y-2">
                {captain.specialties.map((specialty, idx) => (
                  <Badge key={idx} variant="secondary" className="w-full justify-start">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-bold mb-3">Boats</h4>
              <div className="space-y-2">
                {captain.boats.map((boat, idx) => (
                  <p key={idx} className="text-gray-700">{boat}</p>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
