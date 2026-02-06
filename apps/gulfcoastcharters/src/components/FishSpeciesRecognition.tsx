import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Brain, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface SpeciesMatch {
  species: string;
  confidence: number;
  estimatedWeight: number;
  estimatedLength: number;
}

interface RecognitionResult {
  species: string;
  confidence: number;
  estimatedWeight: number;
  estimatedLength: number;
  alternatives: SpeciesMatch[];
}

interface Props {
  imageUrl?: string;
  imageBase64?: string;
  onSpeciesSelect: (species: string, weight: number, length: number) => void;
}

export default function FishSpeciesRecognition({ imageUrl, imageBase64, onSpeciesSelect }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);

  const analyzeImage = async () => {
    if (!imageUrl && !imageBase64) {
      toast.error('No image provided');
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fish-species-recognition', {
        body: { action: 'identify', imageUrl, imageBase64 }
      });

      if (error) throw error;

      if (data.identification) {
        setResult(data.identification);
        toast.success('Fish identified!');
      } else {
        toast.error('Could not identify fish species');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAccept = () => {
    if (result) {
      onSpeciesSelect(result.species, result.estimatedWeight, result.estimatedLength);
      toast.success('Species data applied to form');
    }
  };

  const handleCorrection = async (actualSpecies: string) => {
    try {
      await supabase.functions.invoke('fish-species-recognition', {
        body: {
          action: 'submit_correction',
          imageUrl,
          predictedSpecies: result?.species,
          actualSpecies,
          confidence: result?.confidence
        }
      });

      // Award points for correcting AI (gamification)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.functions.invoke('points-rewards-system', {
            body: {
              action: 'award_points',
              userId: session.user.id,
              actionType: 'ai_correction',
              amount: 10,
            },
          });
          toast.success('Thank you! Your correction helps improve our AI. +10 points');
        } else {
          toast.success('Thank you! Your correction helps improve our AI.');
        }
      } catch (pointsError) {
        console.error('Error awarding correction points:', pointsError);
        toast.success('Thank you! Your correction helps improve our AI.');
      }

      setShowCorrection(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'bg-green-500';
    if (confidence >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.4) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-blue-600" />
          AI Species Recognition
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && (
          <Button onClick={analyzeImage} disabled={analyzing} className="w-full">
            {analyzing ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="mr-2 w-4 h-4" />
                Identify Fish Species
              </>
            )}
          </Button>
        )}

        {result && (
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">{result.species}</span>
                    <Badge className={getConfidenceColor(result.confidence)}>
                      {(result.confidence * 100).toFixed(0)}% {getConfidenceLabel(result.confidence)}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Est. Weight: <strong>{result.estimatedWeight} lbs</strong></p>
                    <p>Est. Length: <strong>{result.estimatedLength} inches</strong></p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={handleAccept} className="flex-1">
                <CheckCircle className="mr-2 w-4 h-4" />
                Use This
              </Button>
              <Button onClick={() => setShowCorrection(!showCorrection)} variant="outline" className="flex-1">
                <XCircle className="mr-2 w-4 h-4" />
                Wrong Species
              </Button>
            </div>

            {showCorrection && result.alternatives.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Select correct species:
                </p>
                {result.alternatives.map((alt, idx) => (
                  <Button
                    key={idx}
                    onClick={() => handleCorrection(alt.species)}
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span>{alt.species}</span>
                    <Badge variant="secondary">{(alt.confidence * 100).toFixed(0)}%</Badge>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}