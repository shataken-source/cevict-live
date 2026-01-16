'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { petAIService } from '@/lib/pet-ai-service'
import { Camera, Search, AlertCircle, CheckCircle, Loader2, MapPin, Map, Clock } from 'lucide-react'
import Image from 'next/image'
import AgeProgression from '@/components/petreunion/AgeProgression'

interface SimilarPet {
  pet_id: string
  similarity: number
  photo_url: string
  match_type: 'lost_found' | 'found_found' | 'lost_lost'
}

interface PhotoMatcherProps {
  petId: string
  photoUrl: string
  petType?: string
  petAge?: string
  petBreed?: string
  petName?: string
  onMatchFound?: (matches: SimilarPet[]) => void
  onFeaturesExtracted?: (features: string) => void
}

export function PhotoMatcher({ petId, photoUrl, petType, petAge, petBreed, petName, onMatchFound, onFeaturesExtracted }: PhotoMatcherProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [matches, setMatches] = useState<SimilarPet[]>([])
  const [error, setError] = useState<string | null>(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [extractedFeatures, setExtractedFeatures] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [heatMapData, setHeatMapData] = useState<{ lat: number; lng: number; probability: number }[]>([])
  const [petBreedState, setPetBreedState] = useState<string>(petBreed || '')
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [showAgeProgression, setShowAgeProgression] = useState(false)
  const [monthsSinceLoss, setMonthsSinceLoss] = useState<number>(0)
  const [currentPetAge, setCurrentPetAge] = useState<string>(petAge || '')

  const handlePhotoMatch = useCallback(async () => {
    try {
      setIsScanning(true)
      setError(null)
      setMatches([])
      setScanProgress(0)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const result = await petAIService.generateEmbeddingAndMatch(petId, photoUrl)
      
      clearInterval(progressInterval)
      setScanProgress(100)

      if (result.success && result.similar_pets.length > 0) {
        setMatches(result.similar_pets)
        onMatchFound?.(result.similar_pets)
      }
      
      // Store extracted features
      if (result.features) {
        setExtractedFeatures(result.features)
        onFeaturesExtracted?.(result.features)
        
        // Extract breed from features for predictive map
        const breedMatch = result.features.match(/breed[:\s]+([^\n,]+)/i)
        if (breedMatch) {
          setPetBreedState(breedMatch[1].trim())
        }
      } else {
        setMatches([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan photo')
    } finally {
      setIsScanning(false)
      setTimeout(() => setScanProgress(0), 1000)
    }
  }, [petId, photoUrl, onMatchFound, onFeaturesExtracted])

  const generatePredictiveMap = async () => {
    if (!petBreed || !lastLocation) {
      setError('Please provide pet breed and last seen location for predictive search')
      return
    }

    try {
      // Determine terrain based on location (simplified)
      const terrain = 'mixed' // In production, use geocoding API
      
      // Generate heat map
      const heatMap = await petAIService.generatePredictiveHeatMap(
        petBreedState,
        ['explorer', 'curious'], // Default behaviors
        lastLocation,
        terrain
      )
      
      setHeatMapData(heatMap)
      setShowMap(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate predictive map')
    }
  }

  const getMatchTypeColor = (type: string) => {
    switch (type) {
      case 'lost_found':
        return 'bg-green-100 text-green-800'
      case 'found_found':
        return 'bg-blue-100 text-blue-800'
      case 'lost_lost':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case 'lost_found':
        return 'Potential Match!'
      case 'found_found':
        return 'Similar Found Pet'
      case 'lost_lost':
        return 'Similar Lost Pet'
      default:
        return 'Unknown'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          AI Photo Matching
        </CardTitle>
        <CardDescription>
          Our AI analyzes over 500 facial features to find potential matches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Original Photo */}
        <div className="relative aspect-square w-full max-w-sm mx-auto rounded-lg overflow-hidden">
          <Image
            src={photoUrl}
            alt="Pet photo"
            fill
            className="object-cover"
          />
          {isScanning && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Analyzing photo...</p>
                <Progress value={scanProgress} className="w-32 mt-2" />
              </div>
            </div>
          )}
        </div>

        {/* Scan Button */}
        <Button
          onClick={handlePhotoMatch}
          disabled={isScanning}
          className="w-full"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Find Similar Pets
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Age Progression */}
        {extractedFeatures && petType && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-900">Age Progression Tool</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAgeProgression(!showAgeProgression)}
              >
                <Clock className="w-4 h-4 mr-2" />
                {showAgeProgression ? 'Hide' : 'Show'} Age Tool
              </Button>
            </div>
            
            {showAgeProgression && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Months Since Lost</Label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={monthsSinceLoss}
                          onChange={(e) => setMonthsSinceLoss(parseInt(e.target.value) || 0)}
                          className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Current Age Stage</Label>
                        <p className="text-sm text-slate-600 mt-1">{currentPetAge || 'Not set'}</p>
                      </div>
                    </div>
                    
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Why this matters:</strong> Pets can change appearance as they age. 
                        This tool helps you visualize how your pet might look now, making it easier 
                        for others to recognize them.
                      </AlertDescription>
                    </Alert>
                    
                    <AgeProgression
                      currentAge={currentPetAge}
                      petType={petType}
                      breed={petBreedState}
                      monthsSinceLoss={monthsSinceLoss}
                      petName={petName}
                      originalImage={photoUrl}
                      onAgeChange={(newAge) => setCurrentPetAge(newAge)}
                      onProgressionComplete={(progressions) => {
                        console.log('Age progression completed:', progressions)
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Predictive Search Map */}
        {extractedFeatures && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-900">Predictive Search Map</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMap(!showMap)}
              >
                <Map className="w-4 h-4 mr-2" />
                {showMap ? 'Hide' : 'Show'} Map
              </Button>
            </div>
            
            {showMap && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Breed</Label>
                        <p className="text-sm text-slate-600">{petBreed || 'Unknown'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Last Seen Location</Label>
                        <input
                          type="text"
                          placeholder="Enter city or address"
                          className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                          onChange={(e) => {
                            // In production, use geocoding API
                            setLastLocation({ lat: 30.4, lng: -87.2 }) // Default to Mobile, AL
                          }}
                        />
                      </div>
                    </div>
                    
                    <Button
                      onClick={generatePredictiveMap}
                      disabled={!petBreed}
                      className="w-full"
                      variant="secondary"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Generate Search Heat Map
                    </Button>
                    
                    {heatMapData.length > 0 && (
                      <div className="mt-4">
                        <div className="bg-slate-100 rounded-lg p-4 h-64 flex items-center justify-center">
                          <div className="text-center">
                            <Map className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm text-slate-600">
                              Interactive map showing {heatMapData.length} high-probability search areas
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              (Map integration would go here)
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          Based on breed behavior and typical travel patterns
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Extracted Features */}
        {extractedFeatures && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">AI-Identified Features</h4>
            <p className="text-sm text-blue-800">{extractedFeatures}</p>
          </div>
        )}

        {/* No Matches */}
        {!isScanning && matches.length === 0 && scanProgress === 100 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No similar pets found. This pet appears to be unique in our database.
            </AlertDescription>
          </Alert>
        )}

        {/* Matches Found */}
        {matches.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">
              Found {matches.length} potential match{matches.length > 1 ? 'es' : ''}
            </h4>
            <div className="grid gap-3">
              {matches.map((match, index) => (
                <div
                  key={`${match.pet_id}-${index}`}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <Image
                      src={match.photo_url}
                      alt="Matched pet"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getMatchTypeColor(match.match_type)}>
                        {getMatchTypeLabel(match.match_type)}
                      </Badge>
                      <Badge variant="outline">
                        {Math.round(match.similarity * 100)}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Similarity score: {match.similarity.toFixed(3)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Navigate to pet profile
                      window.open(`/pets/${match.pet_id}`, '_blank')
                    }}
                  >
                    View
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Info */}
        <Alert>
          <Camera className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> Our AI analyzes facial features, eye shape, whisker patterns,
            and coat patterns to find matches. Even if a pet's appearance has changed due to stress or
            environmental factors, our system can still recognize them.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
