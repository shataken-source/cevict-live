'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, TrendingUp, CheckCircle2, AlertCircle, Play, BarChart3 } from '@/components/ui/icons';
import { Progress } from '@/components/ui/progress';
import { US_STATES, getCitiesForState } from '@/data/us-states-cities';

export default function PopulateDatabasePage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [maxCities, setMaxCities] = useState(50);
  const [delayBetweenCities, setDelayBetweenCities] = useState(5);
  const [startState, setStartState] = useState('New Jersey');
  const [startCity, setStartCity] = useState('Camden');
  // Initialize with empty array to avoid hydration mismatch, then populate in useEffect
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/petreunion/populate-database');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  // Initialize cities on mount to avoid hydration mismatch
  useEffect(() => {
    setAvailableCities(getCitiesForState(startState));
  }, [startState]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [loadStats]);

  const handlePopulate = async () => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/petreunion/populate-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxCities,
          startCity,
          startState,
          useCityExpansion: true, // Use city expansion crawler (small rescues only)
          delayBetweenCities: delayBetweenCities * 1000
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResults(data);
        loadStats(); // Refresh stats
      } else {
        // Handle 501 Not Implemented status
        const errorMsg = data.error || data.message || 'Failed to populate database';
        setResults({ error: errorMsg });
      }
    } catch (error: any) {
      setResults({ error: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkFacebookScrape = async () => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/petreunion/bulk-scrape-facebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxShelters: 200,
          maxPetsPerShelter: 50,
          parallel: 5,
          city: startCity,
          state: startState
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResults({
          summary: data.summary,
          message: data.message,
          errors: data.errors
        });
        loadStats(); // Refresh stats
      } else {
        // Handle 501 Not Implemented status
        const errorMsg = data.error || data.message || 'Failed to bulk scrape Facebook';
        setResults({ error: errorMsg });
      }
    } catch (error: any) {
      setResults({ error: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAllPlatforms = async () => {
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/petreunion/bulk-scrape-all-platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cities: [], // Uses default cities (includes South Jersey)
          maxPetsPerCity: 100,
          platforms: ['facebook', 'pawboost', 'petharbor']
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResults({
          summary: data.summary,
          message: data.message,
          errors: data.errors
        });
        loadStats(); // Refresh stats
      } else {
        // Handle 501 Not Implemented status
        const errorMsg = data.error || data.message || 'Failed to bulk scrape all platforms';
        setResults({ error: errorMsg });
      }
    } catch (error: any) {
      setResults({ error: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Database className="w-10 h-10 text-blue-600" />
            Populate Pet Database
          </h1>
          <p className="text-gray-600 text-lg">
            Scrape pets from multiple sources to build a comprehensive database before launch
          </p>
        </div>

        {/* Current Stats */}
        {stats && (
          <Card className="mb-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Current Database Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{stats.totalPets}</div>
                  <div className="text-sm text-gray-600">Total Pets</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.dogs}</div>
                  <div className="text-sm text-gray-600">Dogs</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{stats.cats}</div>
                  <div className="text-sm text-gray-600">Cats</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.foundPets}</div>
                  <div className="text-sm text-gray-600">Available</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">{stats.lostPets}</div>
                  <div className="text-sm text-gray-600">Lost</div>
                </div>
              </div>
              {Object.keys(stats.petsByState || {}).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold mb-2">Pets by State:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.petsByState)
                      .sort(([, a]: any, [, b]: any) => b - a)
                      .slice(0, 10)
                      .map(([state, count]: any) => (
                        <span key={state} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                          {state}: {count}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Population Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Database Population Settings</CardTitle>
            <CardDescription>
              Configure how many cities to scrape and the delay between requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-semibold mb-1">Small Rescue Shelters Only</p>
                  <p>
                    This crawler discovers and scrapes SMALL LOCAL RESCUE SHELTERS only.
                    Large retailers (Petco, PetSmart, AdoptAPet, Petfinder) are automatically excluded.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="text-sm text-purple-800">
                  <p className="font-semibold mb-1">⚡⚡⚡ FASTEST METHOD: All Platforms Scrape</p>
                  <p>
                    The <strong>PURPLE button</strong> scrapes from <strong>Facebook + Pawboost + PetHarbor</strong> simultaneously!
                    This is the FASTEST way to get 15,000+ pets quickly.
                    It processes multiple cities across all platforms in parallel.
                  </p>
                  <p className="mt-2 font-semibold">
                    🎯 Target: 15,000 pets by lunch? Use the PURPLE button! 🚀
                  </p>
                  <p className="mt-2 text-xs">
                    Platforms: Facebook (shelter pages), Pawboost (lost/found aggregator), PetHarbor (shelter aggregator)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Starting State</Label>
              <select
                value={startState}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return; // Don't allow empty selection
                  setStartState(value);
                  const cities = getCitiesForState(value);
                  setAvailableCities(cities);
                  // Auto-select first city if available
                  if (cities.length > 0) {
                    setStartCity(cities[0]);
                  } else {
                    setStartCity('');
                  }
                }}
                className="mt-1 flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Select the state to start scraping from
              </p>
            </div>

            <div>
              <Label>Starting City</Label>
              <div className="mt-1 space-y-2">
                {availableCities.length > 0 && (
                  <select
                    value={availableCities.includes(startCity) ? startCity : 'custom'}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === 'custom') {
                        setStartCity('');
                      } else {
                        setStartCity(value);
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="custom">Custom (type below)</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                )}
                <Input
                  type="text"
                  value={startCity}
                  onChange={(e) => setStartCity(e.target.value)}
                  placeholder={availableCities.length > 0 ? "Or type custom city name" : "Enter city name"}
                  className={availableCities.length > 0 ? "" : "mt-1"}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                The crawler will start here and expand outward in circles
              </p>
            </div>

            <div>
              <Label>Maximum Cities to Process</Label>
              <Input
                type="number"
                value={maxCities}
                onChange={(e) => setMaxCities(parseInt(e.target.value) || 50)}
                min={1}
                max={100}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                The crawler will expand outward from the starting city, discovering shelters in each city.
              </p>
            </div>

            <div>
              <Label>Delay Between Cities (seconds)</Label>
              <Input
                type="number"
                value={delayBetweenCities}
                onChange={(e) => setDelayBetweenCities(parseInt(e.target.value) || 5)}
                min={1}
                max={30}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Prevents rate limiting. Recommended: 5-10 seconds.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Estimated Time:</p>
                  <p>
                    {maxCities} cities × {delayBetweenCities}s delay = ~{Math.round((maxCities * delayBetweenCities) / 60)} minutes
                  </p>
                  <p className="mt-2">
                    This will discover small rescue shelters from Facebook/Google and scrape their pet listings.
                    The crawler expands outward from {startCity}, {startState} in expanding circles.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleBulkAllPlatforms}
                disabled={loading}
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg py-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Scraping All Platforms...
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 mr-2" />
                    🚀🚀🚀 FASTEST: Scrape ALL Platforms (Facebook + Pawboost + PetHarbor)
                  </>
                )}
              </Button>

              <Button
                onClick={handleBulkFacebookScrape}
                disabled={loading}
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Bulk Scraping Facebook...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Facebook Only: Bulk Scrape (200 shelters, ~50 pets each)
                  </>
                )}
              </Button>

              <Button
                onClick={handlePopulate}
                disabled={loading}
                size="lg"
                variant="outline"
                className="w-full border-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Populating Database...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Full Process: Discover + Scrape All Shelters
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <Card className={results.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.error ? (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                )}
                Population Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.error ? (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-700">{results.error}</AlertDescription>
                </Alert>
              ) : results.summary ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="text-2xl font-bold text-gray-900">{results.summary.totalCitiesProcessed}</div>
                      <div className="text-sm text-gray-600">Cities Processed</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="text-2xl font-bold text-purple-600">{results.summary.sheltersDiscovered || 0}</div>
                      <div className="text-sm text-gray-600">Shelters Discovered</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="text-2xl font-bold text-blue-600">{results.summary.totalPetsScraped}</div>
                      <div className="text-sm text-gray-600">Pets Found</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="text-2xl font-bold text-green-600">{results.summary.totalPetsSaved}</div>
                      <div className="text-sm text-gray-600">Pets Saved</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border">
                    <div className="text-lg font-semibold mb-2">Database Total</div>
                    <div className="text-3xl font-bold text-purple-600">{results.summary.currentDatabaseTotal}</div>
                    <div className="text-sm text-gray-600">Total pets in database now</div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p><strong>Duration:</strong> {results.summary.duration}</p>
                    <p><strong>Message:</strong> {results.message}</p>
                  </div>

                  {results.citiesProcessed && results.citiesProcessed.length > 0 && (
                    <div className="mt-4">
                      <p className="font-semibold mb-2">City Breakdown (first 10):</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {results.citiesProcessed.slice(0, 10).map((city: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm bg-white p-2 rounded">
                            <span>{city.city}, {city.state}</span>
                            <span className="font-semibold">{city.petsSaved} saved</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Tips for Maximum Database Population</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• <strong>Small Rescue Shelters Only:</strong> Automatically excludes large retailers (Petco, PetSmart, AdoptAPet, Petfinder)</li>
              <li>• <strong>City Expansion:</strong> Starts from your chosen city and expands outward in circles</li>
              <li>• <strong>Safe to Re-run:</strong> Skips duplicates, so safe to run multiple times</li>
              <li>• <strong>Start Small:</strong> Try 10-20 cities first, then increase gradually</li>
              <li>• <strong>South Jersey Ready:</strong> Default starts from Camden, NJ - perfect for your Facebook post!</li>
              <li>• <strong>Automatic Discovery:</strong> Finds shelters from Facebook and Google searches</li>
              <li>• <strong>Rate Limiting:</strong> Built-in delays prevent blocking</li>
              <li>• <strong>Goal:</strong> Aim for 10,000+ pets from small rescues before launch</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

