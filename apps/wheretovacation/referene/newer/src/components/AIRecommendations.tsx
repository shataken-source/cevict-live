import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';

interface AIRecommendationsProps {
  preferences: string[];
  budget: number;
  travelerType: string;
}

export default function AIRecommendations({ preferences, budget, travelerType }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      // Check if Supabase is configured
      if (!supabase) {
        setError('AI recommendations are not available at this time.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { preferences, budget, travelerType }
      });
      
      if (error) {
        console.warn('AI recommendations not available:', error.message);
        setError('AI recommendations feature is not currently available.');
        setLoading(false);
        return;
      }

      if (!data || !data.recommendations) {
        setError('No recommendations received. Please try again later.');
        setLoading(false);
        return;
      }
      
      // Parse the AI response
      try {
        const parsed = typeof data.recommendations === 'string' 
          ? JSON.parse(data.recommendations.replace(/```json\n?|\n?```/g, ''))
          : data.recommendations;
          
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecommendations(parsed);
        } else {
          setError('Unable to generate recommendations. Please try again later.');
        }
      } catch (parseError) {
        console.warn('Parse error:', parseError);
        setError('Error processing recommendations. Please try again later.');
      }
    } catch (err: any) {
      console.warn('Error getting recommendations:', err);
      setError('AI recommendations are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 rounded-xl">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" />
          AI-Powered Recommendations
        </h3>
        <p className="text-gray-600">Get personalized destination suggestions</p>
      </div>

      <Button onClick={getRecommendations} disabled={loading} className="mx-auto block mb-6">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
        Generate Recommendations
      </Button>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200 mb-6">
          <p className="text-red-600 text-sm text-center">{error}</p>
        </Card>
      )}

      {recommendations.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {recommendations.map((rec, idx) => (
            <Card key={idx} className="p-5">
              <h4 className="font-bold text-lg mb-1">{rec.name}</h4>
              <p className="text-sm text-gray-500 mb-3">{rec.country}</p>
              <p className="text-sm mb-3">{rec.description}</p>
              <p className="text-green-600 font-semibold">~${rec.estimatedCost}</p>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}