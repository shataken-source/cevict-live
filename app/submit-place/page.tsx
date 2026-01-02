'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useUnifiedAuth } from '@/shared/auth/UnifiedAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, MapPin, Phone, Globe, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const SOUTHEAST_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'FL', name: 'Florida' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'GA', name: 'Georgia' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'SC', name: 'South Carolina' },
];

const PLACE_CATEGORIES = {
  lounge: 'Smoking Lounge',
  patio: 'Restaurant/Bar Patio',
  hotel: 'Hotel (Smoking Rooms)',
  bar: 'Bar/Nightclub',
  restaurant: 'Restaurant',
  shop: 'Vape/Tobacco Shop',
  other: 'Other',
};

const AMENITY_OPTIONS = [
  { id: 'outdoor_seating', label: 'Outdoor Seating' },
  { id: 'covered', label: 'Covered Area' },
  { id: 'food', label: 'Food Available' },
  { id: 'drinks', label: 'Drinks Available' },
  { id: 'valet', label: 'Valet Parking' },
  { id: 'music', label: 'Live Music' },
  { id: 'tv', label: 'TV/Sports' },
  { id: 'wifi', label: 'WiFi' },
];

export default function SubmitPlace() {
  const router = useRouter();
  const { user } = useUnifiedAuth();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state_code: 'AL',
    category: '',
    description: '',
    notes: '',
    website_url: '',
    phone: '',
    age_restriction: 'none' as 'none' | '18+' | '21+',
    amenities: [] as string[],
    source_url: '',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAmenityToggle = (amenityId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      amenities: checked 
        ? [...prev.amenities, amenityId]
        : prev.amenities.filter(a => a !== amenityId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a place');
      return;
    }

    if (!formData.source_url) {
      setError('Source URL (e.g., Google Maps, website) is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error: submitError } = await supabase
        .from('sr_directory_places')
        .insert({
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state_code: formData.state_code,
          category: formData.category,
          description: formData.description,
          notes: formData.notes,
          website_url: formData.website_url,
          phone: formData.phone,
          age_restriction: formData.age_restriction,
          amenities: formData.amenities,
          source_url: formData.source_url,
          submitted_by: user.id,
        });

      if (submitError) throw submitError;

      setSuccess(true);
      // Reset form
      setFormData({
        name: '',
        address: '',
        city: '',
        state_code: 'AL',
        category: '',
        description: '',
        notes: '',
        website_url: '',
        phone: '',
        age_restriction: 'none',
        amenities: [],
        source_url: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit place');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You must be signed in to submit places to the directory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/auth">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Place Submitted!</CardTitle>
            <CardDescription>
              Thank you for contributing to our smoker-friendly directory. Your submission will be reviewed before being published.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll earn points when your submission is verified by our team.
              </AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSuccess(false)} className="flex-1">
                Submit Another
              </Button>
              <Button asChild className="flex-1">
                <Link href="/">Back to Explorer</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Law Explorer
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Submit a Place</h1>
          <p className="mt-2 text-slate-600">
            Share smoker-friendly places with the community. All submissions are reviewed before publication.
          </p>
        </div>

        {/* Form */}
        <Card className="submit-form">
          <CardHeader>
            <CardTitle>Place Information</CardTitle>
            <CardDescription>
              Provide accurate details about the smoker-friendly establishment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="form-section">
                  <Label htmlFor="name">Place Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., The Smokeasy Lounge"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-section">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLACE_CATEGORIES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <div className="form-section">
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="form-section">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="Birmingham"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="form-section">
                    <Label htmlFor="state_code">State *</Label>
                    <Select value={formData.state_code} onValueChange={(value) => handleInputChange('state_code', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOUTHEAST_STATES.map((state) => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="form-section">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(205) 555-0123"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                
                <div className="form-section">
                  <Label htmlFor="website_url" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website
                  </Label>
                  <Input
                    id="website_url"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.website_url}
                    onChange={(e) => handleInputChange('website_url', e.target.value)}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-section">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the atmosphere, what makes it smoker-friendly, etc."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              {/* Age Restriction */}
              <div className="form-section">
                <Label>Age Restriction</Label>
                <Select value={formData.age_restriction} onValueChange={(value) => handleInputChange('age_restriction', value as 'none' | '18+' | '21+')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None / All Ages</SelectItem>
                    <SelectItem value="18+">18+ Only</SelectItem>
                    <SelectItem value="21+">21+ Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amenities */}
              <div className="form-section">
                <Label>Amenities</Label>
                <div className="grid gap-3 md:grid-cols-2 mt-2">
                  {AMENITY_OPTIONS.map((amenity) => (
                    <div key={amenity.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={amenity.id}
                        checked={formData.amenities.includes(amenity.id)}
                        onCheckedChange={(checked) => handleAmenityToggle(amenity.id, checked as boolean)}
                      />
                      <Label htmlFor={amenity.id} className="text-sm font-normal">
                        {amenity.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              <div className="form-section">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special rules, best times to visit, etc."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={2}
                />
              </div>

              {/* Source URL */}
              <div className="form-section">
                <Label htmlFor="source_url" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Source URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="source_url"
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={formData.source_url}
                  onChange={(e) => handleInputChange('source_url', e.target.value)}
                  required
                />
                <p className="mt-1 text-sm text-slate-500">
                  Google Maps link, official website, or other verification source.
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Submitting...' : 'Submit Place'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
