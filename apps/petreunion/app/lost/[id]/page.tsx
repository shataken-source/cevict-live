'use client';

import FacebookFlyerPost from '@/components/petreunion/FacebookFlyerPost';
import LostPetFlyer from '@/components/petreunion/LostPetFlyer';
import SocialShareButtons from '@/components/petreunion/SocialShareButtons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, ArrowLeft, Calendar, DollarSign, Heart, Loader2, Mail, MapPin, Phone, Printer, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface LostPet {
  id: string;
  pet_name: string | null;
  pet_type: string;
  breed: string;
  color: string;
  size: string | null;
  date_lost: string;
  location_city: string;
  location_state: string;
  location_zip: string | null;
  location_detail: string | null;
  markings: string | null;
  description: string | null;
  microchip: string | null;
  collar: string | null;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  reward_amount: number | null;
  photo_url: string | null;
  status: string;
  created_at: string;
}

export default function LostPetPage() {
  const params = useParams();
  const id = (params?.id as string) || '';

  const [pet, setPet] = useState<LostPet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Fetch pet data via API route
  useEffect(() => {
    async function fetchPet() {
      if (!id) {
        setError('Invalid pet ID');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/petreunion/pet/${id}`);
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404) {
            setError('Pet report not found');
          } else {
            setError(data.error || 'Failed to load pet report');
          }
        } else {
          setPet(data.pet);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load pet report');
      } finally {
        setLoading(false);
      }
    }

    fetchPet();
  }, [id]);

  const getPetUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/lost/${id}`;
    }
    return `/lost/${id}`;
  };

  const handleShare = async () => {
    const url = getPetUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Lost Pet: ${pet?.pet_name || 'Unknown'}`,
          text: `Help find ${pet?.pet_name || 'this pet'}! Lost ${pet?.breed} in ${pet?.location_city}, ${pet?.location_state}`,
          url: url,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const handlePrint = () => {
    window.print();
    // Show share dialog after a short delay to allow print dialog to appear
    setTimeout(() => {
      setShowShareDialog(true);
    }, 500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading pet report...</p>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-8 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error || 'Pet report not found'}
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent>
            <Link href="/search">
              <Button className="w-full">Back to Search</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-8 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error || 'Pet report not found'}
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent>
            <Link href="/report">
              <Button className="w-full">Report a Lost Pet</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysLost = Math.floor((new Date().getTime() - new Date(pet.date_lost).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <Link href="/search">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card className="border-2 border-blue-200 shadow-lg">
              <CardHeader>
                <div className="flex items-start gap-6">
                  {pet.photo_url && (
                    <div className="w-40 h-40 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-md">
                      <img
                        src={pet.photo_url}
                        alt={pet.pet_name || 'Lost pet'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <CardTitle className="text-3xl mb-2">
                          {pet.pet_name || 'Lost Pet'}
                        </CardTitle>
                        <CardDescription className="text-lg">
                          {pet.breed} • {pet.color} {pet.pet_type}
                          {pet.size && ` • ${pet.size} size`}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleShare}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePrint}>
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </Button>
                      </div>
                    </div>
                    {pet.status === 'lost' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                        <div className="flex items-center gap-2 text-red-700">
                          <Heart className="w-5 h-5" />
                          <span className="font-semibold">Still Missing</span>
                          <span className="text-sm">• Lost {daysLost} day{daysLost !== 1 ? 's' : ''} ago</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* When & Where */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">When & Where</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Date Lost</p>
                      <p className="text-gray-700">
                        {new Date(pet.date_lost).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <MapPin className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Last Seen</p>
                      <p className="text-gray-700">
                        {pet.location_city}, {pet.location_state}
                        {pet.location_zip && ` ${pet.location_zip}`}
                      </p>
                      {pet.location_detail && (
                        <p className="text-sm text-gray-600 mt-1">{pet.location_detail}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {pet.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{pet.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Markings & Details */}
            {(pet.markings || pet.microchip || pet.collar) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Identifying Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {pet.markings && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-yellow-900 mb-1">Markings</p>
                        <p className="text-yellow-800">{pet.markings}</p>
                      </div>
                    )}
                    {pet.microchip && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Microchip</p>
                        <p className="text-blue-800 font-mono">{pet.microchip}</p>
                      </div>
                    )}
                    {pet.collar && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-green-900 mb-1">Collar</p>
                        <p className="text-green-800 capitalize">{pet.collar}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Information - Privacy Wall */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-xl text-blue-900">Contact Information</CardTitle>
                <CardDescription className="text-blue-700">
                  Contact released after a verified match. No direct contact shown here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm italic text-gray-600 mb-3">
                  ⚠️ Match probability is an estimate. 100% accuracy is not guaranteed.
                </p>
                <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 text-blue-900">
                  Privacy Protected: Contact details are released only after a verified match handshake.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Facebook Flyer Post - Prominent */}
            {pet && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2 text-blue-700">
                    <Share2 className="w-6 h-6" />
                    Post Flyer to Facebook
                  </CardTitle>
                  <CardDescription className="text-base">
                    One-click button to format and post your lost pet flyer on Facebook
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FacebookFlyerPost
                    pet={pet}
                    petUrl={getPetUrl()}
                  />
                </CardContent>
              </Card>
            )}

            {/* Social Share */}
            {pet && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Share on Social Media
                  </CardTitle>
                  <CardDescription>
                    Share this lost pet report on Facebook, Twitter, and other platforms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SocialShareButtons
                    pet={pet}
                    petUrl={getPetUrl()}
                  />
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  className="w-full"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Flyer
                </Button>
                <Link href="/report" className="block">
                  <Button variant="outline" className="w-full">
                    Report Another Pet
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Printable Flyer */}
            <Card className="hidden print:block">
              <CardContent className="p-0">
                <LostPetFlyer
                  pet={{
                    name: pet.pet_name || 'Unknown Pet',
                    type: pet.pet_type || 'unknown',
                    breed: pet.breed || 'Unknown',
                    color: pet.color || 'Unknown',
                    size: pet.size || 'Unknown',
                    age: 'Unknown', // Default value since age doesn't exist in LostPet type
                    lastSeen: pet.date_lost || 'Unknown',
                    location: `${pet.location_city || 'Unknown'}, ${pet.location_state || 'Unknown'}`,
                    description: pet.description || 'No description available',
                    contact: {
                      phone: pet.owner_phone || 'Not provided',
                      email: pet.owner_email || 'Not provided'
                    },
                    imageUrl: pet.photo_url || undefined
                  }}
                />
              </CardContent>
            </Card>

            {/* Helpful Tips */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-lg text-yellow-900">If You Found This Pet</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-yellow-800">
                  <li>• Approach slowly and calmly</li>
                  <li>• Check for ID tags or microchip</li>
                  <li>• Contact the owner immediately</li>
                  <li>• If safe, keep the pet secure</li>
                  <li>• Take photos if possible</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Dialog - Appears after printing flyer */}
      {pet && (
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Share2 className="w-6 h-6 text-blue-600" />
                Share on Social Media?
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                Your flyer is ready! Would you like to share {pet.pet_name || 'this lost pet'}'s report on Facebook, Twitter, or other social media platforms to reach more people?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <SocialShareButtons
                pet={pet}
                petUrl={getPetUrl()}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowShareDialog(false)}
              >
                Maybe Later
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
