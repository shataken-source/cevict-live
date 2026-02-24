'use client';

import ImageMatchUpload from '@/components/petreunion/ImageMatchUpload';
import { Heart, Sparkles, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ImageMatchPage() {
  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-full mb-4">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Pet Image Matching
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Found a pet? Upload their photo and our AI will search our database 
            to find potential matches with lost pets. Like facial recognition, but for pets!
          </p>
        </div>

        {/* How It Works */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Upload Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Take or upload a clear photo of the found pet. The clearer the image, 
                the better our matching will be.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                Our AI analyzes the image for breed, color, size, and distinctive 
                features, then compares it to all lost pets in our database.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Get Matches</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">
                View potential matches ranked by similarity score. Contact owners 
                directly to reunite pets with their families.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Upload Component */}
        <ImageMatchUpload />

        {/* Info Section */}
        <Card className="mt-8 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-xl">Tips for Best Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-gray-700">
              <li>• Use a clear, well-lit photo of the pet's face and body</li>
              <li>• Make sure the pet is in focus and visible</li>
              <li>• Include location information if you know where the pet was found</li>
              <li>• The more distinctive markings visible, the better the match</li>
              <li>• Multiple photos can improve accuracy (upload the clearest one first)</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


