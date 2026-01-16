'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Image, CheckCircle2, AlertCircle, BarChart3 } from '@/components/ui/icons';
import Link from 'next/link';

export default function ResizeImagesPage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [maxWidth, setMaxWidth] = useState(800);
  const [maxHeight, setMaxHeight] = useState(800);
  const [quality, setQuality] = useState(0.85);
  const [limit, setLimit] = useState<number | null>(null);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/petreunion/resize-all-images');
      const data = await response.json();
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleResize = async () => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/petreunion/resize-all-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxWidth,
          maxHeight,
          quality,
          format: 'jpeg',
          batchSize: 10,
          limit: limit || null
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResults(data);
        loadStats(); // Refresh stats
      } else {
        setResults({ error: data.error || 'Failed to resize images' });
      }
    } catch (error: any) {
      setResults({ error: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Image className="w-10 h-10 text-blue-600" />
              Resize All Images
            </h1>
            <p className="text-gray-600 text-lg">
              Resize all pet images in the database to fit the website better
            </p>
          </div>
          <Link href="/petreunion/admin/dashboard">
            <Button variant="outline">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Stats Card */}
        {stats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Image Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Pets with Images</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalWithImages || 0}</p>
                </div>
                {stats.sampleStats && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Base64 Images (Sample)</p>
                      <p className="text-2xl font-bold text-green-600">{stats.sampleStats.base64Count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">URL Images (Sample)</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.sampleStats.urlCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Size (Sample)</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {stats.sampleStats.averageSize ? `${Math.round(stats.sampleStats.averageSize / 1024)}KB` : 'N/A'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resize Settings</CardTitle>
            <CardDescription>
              Configure how images should be resized
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxWidth">Max Width (px)</Label>
                <Input
                  id="maxWidth"
                  type="number"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(parseInt(e.target.value) || 800)}
                  min={100}
                  max={2000}
                />
              </div>
              <div>
                <Label htmlFor="maxHeight">Max Height (px)</Label>
                <Input
                  id="maxHeight"
                  type="number"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(parseInt(e.target.value) || 800)}
                  min={100}
                  max={2000}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="quality">Quality (0.1 - 1.0)</Label>
              <Input
                id="quality"
                type="number"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value) || 0.85)}
                min={0.1}
                max={1.0}
              />
              <p className="text-xs text-gray-500 mt-1">
                Lower = smaller file size, Higher = better quality
              </p>
            </div>
            <div>
              <Label htmlFor="limit">Limit (Optional)</Label>
              <Input
                id="limit"
                type="number"
                value={limit || ''}
                onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Process all images"
                min={1}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to process all images, or enter a number to limit processing
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Button
              onClick={handleResize}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-lg py-6"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Resizing Images...
                </>
              ) : (
                <>
                  <Image className="w-5 h-5 mr-2" />
                  Resize All Images
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card className={results.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.error ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Error
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Resize Complete
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.error ? (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {results.error}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{results.processed || 0}</p>
                      <p className="text-sm text-gray-600">Processed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-600">{results.skipped || 0}</p>
                      <p className="text-sm text-gray-600">Skipped</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">{results.errors || 0}</p>
                      <p className="text-sm text-gray-600">Errors</p>
                    </div>
                  </div>
                  {results.message && (
                    <p className="text-sm text-gray-700">{results.message}</p>
                  )}
                  {results.errorsList && results.errorsList.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Errors:</p>
                      <div className="bg-white rounded p-3 max-h-48 overflow-y-auto">
                        {results.errorsList.map((error: string, idx: number) => (
                          <p key={idx} className="text-xs text-red-600 mb-1">{error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">How it works:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Processes all pets with images in the database</li>
                  <li>Resizes images to fit better on the website (default: 800x800px)</li>
                  <li>Converts URL images to optimized base64 format</li>
                  <li>Skips images that are already optimized</li>
                  <li>Processes in batches to avoid overwhelming the server</li>
                </ul>
                <p className="mt-3 text-xs text-blue-600">
                  ⚠️ This may take several minutes depending on the number of images. The process runs in the background.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

