import { useState, useEffect } from 'react';
import { Shield, MapPin, Anchor, Users, Calendar, Clock, Award, FileText, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CaptainVerificationBadges from './CaptainVerificationBadges';
import CertificationBadges from './CertificationBadges';
import ReviewCard from './ReviewCard';
import CaptainWeatherBadge from './CaptainWeatherBadge';



interface CaptainProfilePageProps {
  captainId: string;
}

export default function CaptainProfilePage({ captainId }: CaptainProfilePageProps) {
  const [captain, setCaptain] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with actual API call
    setCaptain({
      id: captainId,
      name: 'Captain Mike Johnson',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
      location: 'Destin, FL',
      uscgLicense: 'USCG-123456',
      uscgExpiry: '2026-12-31',
      yearsExperience: 15,
      specialties: ['Deep Sea Fishing', 'Inshore Fishing', 'Shark Fishing', 'Bottom Fishing'],
      boatCertifications: ['6-Pack License', 'CPR Certified', 'First Aid', 'Safety Equipment'],
      insuranceProvider: 'BoatUS Insurance',
      insuranceCoverage: '$2,000,000',
      safetyScore: 100,
      totalTrips: 1247,
      responseTime: 45,
      rating: 4.9,
      reviewCount: 342,
      bio: 'Professional charter captain with 15 years experience in Gulf Coast waters...',
      phone: '(850) 555-0123',
      email: 'mike@gulfcoastcharters.com'
    });
    setLoading(false);
  }, [captainId]);

  if (loading || !captain) return <div>Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <CaptainWeatherBadge 
          captainId={captainId} 
          location={captain.location}
          compact={false}
        />
      </div>
      
      <Card className="mb-6">

        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center">
              <Avatar className="w-32 h-32 mb-4">
                <AvatarImage src={captain.avatar} />
                <AvatarFallback>{captain.name[0]}</AvatarFallback>
              </Avatar>
              <CertificationBadges 
                certifications={{
                  uscg_license: true,
                  insurance: true,
                  first_aid: true,
                  cpr: true,
                  safety_cert: true,
                  master_captain: captain.yearsExperience >= 10
                }}
                size="lg"
              />
            </div>

            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{captain.name}</h1>
                  <div className="flex items-center gap-2 text-gray-600 mb-3">
                    <MapPin className="w-4 h-4" />
                    <span>{captain.location}</span>
                  </div>
                </div>
                <Button>Contact Captain</Button>
              </div>
              
              <CaptainVerificationBadges
                isVerified={true}
                isTopRated={captain.rating >= 4.8}
                isQuickResponder={captain.responseTime < 60}
                safetyScore={captain.safetyScore}
                yearsExperience={captain.yearsExperience}
              />
              
              <p className="mt-4 text-gray-700">{captain.bio}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                USCG License
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">License Number</p>
                  <p className="font-semibold">{captain.uscgLicense}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expiry Date</p>
                  <p className="font-semibold">{captain.uscgExpiry}</p>
                </div>
              </div>
              <Badge className="mt-3 bg-green-600">Verified</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Specialties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {captain.specialties.map((spec: string) => (
                  <Badge key={spec} variant="outline">{spec}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {captain.boatCertifications.map((cert: string) => (
                  <Badge key={cert} variant="secondary">{cert}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Insurance Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Provider</p>
                  <p className="font-semibold">{captain.insuranceProvider}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Coverage Amount</p>
                  <p className="font-semibold">{captain.insuranceCoverage}</p>
                </div>
              </div>
              <Badge className="mt-3 bg-green-600">Verified</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Safety Record</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Safety Score</span>
                    <span className="font-bold">{captain.safetyScore}%</span>
                  </div>
                  <Progress value={captain.safetyScore} className="h-2" />
                  <p className="text-sm text-green-600 font-semibold">Perfect Safety Record</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Experience</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Years Experience</span>
                  <span className="font-bold">{captain.yearsExperience} years</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Trips</span>
                  <span className="font-bold">{captain.totalTrips.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Avg Response Time</span>
                  <span className="font-bold">{captain.responseTime} min</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <ReviewCard
                key={i}
                review={{
                  id: `review-${i}`,
                  customerName: `Customer ${i}`,
                  rating: 5,
                  reviewText: "Excellent captain! Very knowledgeable and professional.",
                  createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
                  charterName: "Deep Sea Fishing",
                }}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
