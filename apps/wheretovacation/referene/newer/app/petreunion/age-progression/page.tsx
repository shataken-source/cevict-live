'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Calendar, Dog, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

interface Progression {
  months: number;
  stage: string;
  estimatedAge: string;
  description: string;
  changes: string[];
  imageUrl: string | null;
}

interface AgeProgressionResponse {
  success: boolean;
  progressions: Progression[];
  ageProgressionDescription: string;
  fallback?: boolean;
  message?: string;
}

function AgeProgressionContent() {
  const searchParams = useSearchParams();
  const [image, setImage] = useState<string | null>(null);
  const [petType, setPetType] = useState<'dog' | 'cat'>('dog');
  const [breed, setBreed] = useState('');
  const [monthsSinceLoss, setMonthsSinceLoss] = useState(6);
  const [petName, setPetName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgeProgressionResponse | null>(null);

  useEffect(() => {
    // Read image from sessionStorage (set by Image Match page)
    const storedImage = sessionStorage.getItem('ageProgressionImage');
    if (storedImage) {
      setImage(storedImage);
      // Clear after reading to avoid stale data
      sessionStorage.removeItem('ageProgressionImage');
      sessionStorage.removeItem('ageProgressionCity');
      sessionStorage.removeItem('ageProgressionState');
    }
  }, []);

  const handleGenerate = async () => {
    if (!image) {
      setError('Please provide an image');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/petreunion/age-progression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image,
          monthsSinceLoss,
          petType,
          breed: breed || undefined,
          petName: petName || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as any)?.error || 'Failed to generate age progression');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate age progression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/petreunion/image-match">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Image Match
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-600" />
              Age Progression Analysis
            </h1>
            <p className="text-gray-600 mt-1">
              See how your pet may look after time has passed
            </p>
          </div>
        </div>

        {/* Input Card */}
        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="text-2xl">Pet Information</CardTitle>
            <CardDescription>
              Provide details about your pet to generate an age progression analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image Preview */}
            {image && (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  📸 Uploaded Photo
                </label>
                <div className="relative w-full max-w-md mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl blur-lg opacity-30"></div>
                  <img
                    src={image}
                    alt="Pet"
                    className="relative w-full rounded-xl border-4 border-white shadow-2xl transform hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            )}

            {/* Pet Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pet Type *
              </label>
              <div className="flex gap-4">
                <button
                  onClick={() => setPetType('dog')}
                  className={`flex-1 p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                    petType === 'dog'
                      ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <Dog className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <div className="font-semibold text-lg">Dog</div>
                </button>
                <button
                  onClick={() => setPetType('cat')}
                  className={`flex-1 p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                    petType === 'cat'
                      ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <span className="text-4xl block mb-2">🐱</span>
                  <div className="font-semibold text-lg">Cat</div>
                </button>
              </div>
            </div>

            {/* Breed */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Breed (optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., Labrador, Siamese"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>

            {/* Pet Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pet Name (optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., Max, Luna"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
              />
            </div>

            {/* Months Since Loss */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Months Since Loss *
              </label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min="0"
                  max="120"
                  value={monthsSinceLoss}
                  onChange={(e) => setMonthsSinceLoss(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-gray-600">
                  ({Math.floor(monthsSinceLoss / 12)} years, {monthsSinceLoss % 12} months)
                </span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!image || loading}
              size="lg"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Analysis...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 mr-2" />
                  Generate Age Progression
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card className="border-2 border-green-500 shadow-2xl bg-gradient-to-br from-white to-green-50">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
              <CardTitle className="text-3xl flex items-center gap-3">
                <Sparkles className="w-8 h-8 animate-pulse" />
                Age Progression Results
              </CardTitle>
              {result.fallback && (
                <CardDescription className="text-yellow-100 font-medium">
                  ⚠️ Using fallback analysis (AI service unavailable)
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Description */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-lg">
                <h3 className="font-bold text-xl text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Analysis Summary
                </h3>
                <p className="text-blue-900 whitespace-pre-line leading-relaxed">{result.ageProgressionDescription}</p>
              </div>

              {/* Progression Stages */}
              <div className="space-y-5">
                <h3 className="font-bold text-2xl text-gray-800 flex items-center gap-2">
                  <span className="text-3xl">⏱️</span>
                  Progression Stages
                </h3>
                {result.progressions.map((prog, idx) => {
                  const colors = [
                    { bg: 'from-blue-50 to-cyan-50', border: 'border-blue-400', badge: 'bg-blue-500', icon: '🔵' },
                    { bg: 'from-purple-50 to-pink-50', border: 'border-purple-400', badge: 'bg-purple-500', icon: '🟣' },
                    { bg: 'from-orange-50 to-red-50', border: 'border-orange-400', badge: 'bg-orange-500', icon: '🟠' }
                  ];
                  const color = colors[idx % colors.length];
                  return (
                    <Card key={idx} className={`border-2 ${color.border} shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br ${color.bg}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-5">
                          <div className={`flex-shrink-0 w-16 h-16 ${color.badge} rounded-2xl flex items-center justify-center shadow-lg transform hover:rotate-12 transition-transform`}>
                            <span className="text-white font-bold text-lg">{prog.months}m</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{color.icon}</span>
                              <h4 className="font-bold text-xl text-gray-900">{prog.stage}</h4>
                            </div>
                            <p className="text-sm text-gray-600 mb-3 font-medium">{prog.estimatedAge}</p>
                            <p className="text-gray-800 mb-4 leading-relaxed">{prog.description}</p>
                            <div className="space-y-2 bg-white/50 p-4 rounded-lg">
                              {prog.changes.map((change, changeIdx) => (
                                <div key={changeIdx} className="flex items-start gap-3 text-sm">
                                  <span className="text-lg mt-0.5">✨</span>
                                  <span className="text-gray-800 leading-relaxed">{change}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AgeProgressionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    }>
      <AgeProgressionContent />
    </Suspense>
  );
}
