'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Image as ImageIcon, Search, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AgeProgressionProps {
  originalImage: string | File;
  petType?: 'dog' | 'cat';
  breed?: string;
  monthsSinceLoss: number;
  petName?: string;
  onProgressionComplete?: (progressions: any[]) => void;
}

export default function AgeProgression({
  originalImage,
  petType = 'dog',
  breed,
  monthsSinceLoss,
  petName,
  onProgressionComplete
}: AgeProgressionProps) {
  const [loading, setLoading] = useState(false);
  const [progressions, setProgressions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  React.useEffect(() => {
    // Convert File to base64 or use URL
    if (originalImage instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(originalImage);
    } else {
      setImagePreview(originalImage);
    }
  }, [originalImage]);

  const generateProgression = async () => {
    setLoading(true);
    setError(null);

    try {
      let imageBase64 = '';
      let imageUrl = '';

      if (originalImage instanceof File) {
        // Convert file to base64
        const reader = new FileReader();
        imageBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(originalImage);
        });
      } else {
        imageUrl = originalImage;
      }

      const response = await fetch('/api/petreunion/age-progression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          imageBase64: imageBase64 ? imageBase64.split(',')[1] : null,
          monthsSinceLoss,
          petType,
          breed
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate progression');
      }

      setProgressions(data.progressions);
      if (onProgressionComplete) {
        onProgressionComplete(data.progressions);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate age progression');
      console.error('Age progression error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Age Progression
        </CardTitle>
        <CardDescription>
          Generate images showing how {petName || 'your pet'} might look now
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {imagePreview && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Original Photo:</p>
            <img 
              src={imagePreview} 
              alt="Original pet" 
              className="max-w-full h-auto rounded-lg border border-gray-200"
            />
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Pet:</strong> {petName || 'Unknown'} ({petType})<br />
            <strong>Breed:</strong> {breed || 'Unknown'}<br />
            <strong>Time Missing:</strong> {monthsSinceLoss} month{monthsSinceLoss !== 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={generateProgression}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Age Progression...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Generate Age Progression
            </>
          )}
        </Button>

        {progressions.length > 0 && (
          <div className="space-y-4 mt-6">
            <h3 className="font-semibold text-lg">Age Progression Stages:</h3>
            {progressions.map((progression, index) => (
              <Card key={index} className="border-2">
                <CardHeader>
                  <CardTitle className="text-base">{progression.stage}</CardTitle>
                  <CardDescription>{progression.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>Estimated Age:</strong> {progression.estimatedAge}
                    </p>
                    <div>
                      <p className="text-sm font-medium mb-1">Expected Changes:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {progression.changes.map((change: string, idx: number) => (
                          <li key={idx}>{change}</li>
                        ))}
                      </ul>
                    </div>
                    {progression.imageUrl && (
                      <div className="mt-4">
                        <img 
                          src={progression.imageUrl} 
                          alt={progression.stage}
                          className="max-w-full h-auto rounded-lg border border-gray-200"
                        />
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        // Search with this progression stage
                        window.location.href = `/petreunion/search?location=Albertville,Alabama&type=${petType}&progression=${progression.months}`;
                      }}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Search for This Stage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Alert>
          <AlertDescription className="text-sm">
            <strong>Note:</strong> Age progression uses AI estimates. Your pet may look different 
            based on breed, health, and individual development. Use these as guides when searching.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}





