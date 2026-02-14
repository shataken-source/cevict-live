'use client';

import { useState, useRef } from 'react';
import { Upload, Search, Loader2, CheckCircle2, X, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

interface MatchResult {
  id: string;
  pet_name: string | null;
  pet_type: string;
  breed: string;
  color: string;
  photo_url: string | null;
  matchScore: number;
  matchReasons: string[];
  location_city: string;
  location_state: string;
}

export default function ImageMatchUpload() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [strongMatches, setStrongMatches] = useState<MatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image is too large. Please use an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setError(null);
      setMatches([]);
      setStrongMatches([]);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleMatch = async () => {
    if (!image) {
      setError('Please upload an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/petreunion/image-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: image,
          location_city: locationCity || undefined,
          location_state: locationState || undefined,
          maxResults: 20
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to match image');
      }

      const result = await response.json();
      setMatches(result.matches || []);
      setStrongMatches(result.strongMatches || []);
    } catch (err: any) {
      setError(err.message || 'Failed to match image');
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setMatches([]);
    setStrongMatches([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-blue-600" />
            Pet Image Matching
          </CardTitle>
          <CardDescription>
            Upload a photo of a found pet to search our database for potential matches. 
            Our AI analyzes the image to find lost pets that look similar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Pet Photo
            </label>
            {!image ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    if (file.size > 5 * 1024 * 1024) {
                      setError('Image is too large. Please use an image under 5MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImage(reader.result as string);
                      setError(null);
                      setMatches([]);
                      setStrongMatches([]);
                    };
                    reader.onerror = () => {
                      setError('Failed to read image file');
                    };
                    reader.readAsDataURL(file);
                  } else if (file) {
                    setError('Please select an image file');
                  }
                }}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={image}
                  alt="Uploaded pet"
                  className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Location Filters (Optional) */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City (optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., San Jose"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State (optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., California"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <X className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* Match Button */}
          <Button
            onClick={handleMatch}
            disabled={!image || loading}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing Image...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Find Matches
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {strongMatches.length > 0 && (
        <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="text-2xl text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Strong Matches ({strongMatches.length})
            </CardTitle>
            <CardDescription className="text-green-600">
              These pets match very closely with the uploaded image
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {strongMatches.map((match) => (
                <Link key={match.id} href={`/petreunion/lost/${match.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {match.photo_url && (
                          <img
                            src={match.photo_url}
                            alt={match.pet_name || 'Pet'}
                            className="w-24 h-24 object-cover rounded-lg border-2 border-green-300"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{match.pet_name || 'Unknown'}</h3>
                          <p className="text-sm text-gray-600">
                            {match.breed} • {match.color} • {match.pet_type}
                          </p>
                          <div className="mt-2 bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-semibold inline-block">
                            {match.matchScore}% Match
                          </div>
                          <ul className="mt-2 text-xs text-gray-600 space-y-1">
                            {match.matchReasons.slice(0, 3).map((reason, i) => (
                              <li key={i}>• {reason}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {matches.length > 0 && matches.length === matches.filter(m => m.matchScore < 70).length && (
        <Card>
          <CardHeader>
            <CardTitle>Potential Matches ({matches.length})</CardTitle>
            <CardDescription>
              These pets might match - worth checking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((match) => (
                <Link key={match.id} href={`/petreunion/lost/${match.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      {match.photo_url && (
                        <img
                          src={match.photo_url}
                          alt={match.pet_name || 'Pet'}
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                      )}
                      <h4 className="font-semibold">{match.pet_name || 'Unknown'}</h4>
                      <p className="text-sm text-gray-600">
                        {match.breed} • {match.color}
                      </p>
                      <div className="mt-2 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold inline-block">
                        {match.matchScore}% Match
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {matches.length === 0 && !loading && image && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-600">No matches found. Try adjusting your search or upload a clearer image.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


