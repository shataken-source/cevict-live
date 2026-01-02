'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, 
  ArrowLeft, 
  Download, 
  Share2, 
  Scale, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Printer,
  Mail
} from 'lucide-react';
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

const CATEGORY_LABELS = {
  indoor_smoking: 'Indoor Smoking',
  vaping: 'Vaping',
  outdoor_public: 'Outdoor Public Spaces',
  patio_private: 'Patio/Private Areas',
  retail_sales: 'Retail Sales',
  hemp_restrictions: 'Hemp Restrictions',
  penalties: 'Penalties & Enforcement',
};

const CATEGORY_COLORS = {
  indoor_smoking: 'bg-red-100 text-red-800',
  vaping: 'bg-purple-100 text-purple-800',
  outdoor_public: 'bg-green-100 text-green-800',
  patio_private: 'bg-blue-100 text-blue-800',
  retail_sales: 'bg-orange-100 text-orange-800',
  hemp_restrictions: 'bg-yellow-100 text-yellow-800',
  penalties: 'bg-gray-100 text-gray-800',
};

interface LawCard {
  id: string;
  state_code: string;
  state_name: string;
  category: keyof typeof CATEGORY_LABELS;
  summary: string;
  details?: string;
  tags: string[];
  source_urls: string[];
  last_verified_at: string;
  last_updated_at: string;
}

interface ComparisonResult {
  category: keyof typeof CATEGORY_LABELS;
  state1Law: LawCard | null;
  state2Law: LawCard | null;
  difference: 'identical' | 'similar' | 'different' | 'missing_one' | 'missing_both';
  keyDifferences: string[];
}

export default function LawComparison() {
  const [state1, setState1] = useState<string>('AL');
  const [state2, setState2] = useState<string>('FL');
  const [lawCards, setLawCards] = useState<LawCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult[]>([]);
  const [activeTab, setActiveTab] = useState('comparison');
  
  const supabase = createClient();

  useEffect(() => {
    loadLawCards();
  }, []);

  useEffect(() => {
    if (lawCards.length > 0) {
      performComparison();
    }
  }, [state1, state2, lawCards]);

  const loadLawCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sr_law_cards')
        .select('*')
        .eq('is_active', true)
        .in('state_code', [state1, state2])
        .order('category');

      if (error) throw error;
      setLawCards(data || []);
    } catch (error) {
      console.error('Error loading law cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const performComparison = () => {
    const categories = Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>;
    const results: ComparisonResult[] = [];

    categories.forEach(category => {
      const state1Law = lawCards.find(card => card.state_code === state1 && card.category === category) || null;
      const state2Law = lawCards.find(card => card.state_code === state2 && card.category === category) || null;
      
      let difference: ComparisonResult['difference'] = 'missing_both';
      let keyDifferences: string[] = [];

      if (state1Law && state2Law) {
        // Compare the laws
        if (state1Law.summary === state2Law.summary) {
          difference = 'identical';
        } else if (state1Law.summary.includes(state2Law.summary) || state2Law.summary.includes(state1Law.summary)) {
          difference = 'similar';
          keyDifferences = ['Minor wording differences'];
        } else {
          difference = 'different';
          keyDifferences = ['Different regulations', 'Different restrictions'];
        }
      } else if (state1Law || state2Law) {
        difference = 'missing_one';
        keyDifferences = ['Law exists in one state but not the other'];
      }

      results.push({
        category,
        state1Law,
        state2Law,
        difference,
        keyDifferences
      });
    });

    setComparison(results);
  };

  const swapStates = () => {
    const temp = state1;
    setState1(state2);
    setState2(temp);
  };

  const generatePrintableSummary = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const state1Name = SOUTHEAST_STATES.find(s => s.code === state1)?.name;
    const state2Name = SOUTHEAST_STATES.find(s => s.code === state2)?.name;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Smoking Laws Comparison: ${state1Name} vs ${state2Name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .comparison { margin: 20px 0; }
            .law-card { border: 1px solid #ddd; margin: 10px 0; padding: 15px; }
            .category { font-weight: bold; color: #333; }
            .state { font-weight: bold; color: #666; }
            .difference { font-style: italic; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Smoking & Vaping Laws Comparison</h1>
            <h2>${state1Name} vs ${state2Name}</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          ${comparison.map(comp => `
            <div class="comparison">
              <h3 class="category">${CATEGORY_LABELS[comp.category]}</h3>
              <div class="law-card">
                <div class="state">${state1Name}:</div>
                ${comp.state1Law ? comp.state1Law.summary : 'No specific laws found'}
              </div>
              <div class="law-card">
                <div class="state">${state2Name}:</div>
                ${comp.state2Law ? comp.state2Law.summary : 'No specific laws found'}
              </div>
              <div class="difference">Status: ${comp.difference}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const shareComparison = async () => {
    const state1Name = SOUTHEAST_STATES.find(s => s.code === state1)?.name;
    const state2Name = SOUTHEAST_STATES.find(s => s.code === state2)?.name;
    
    const shareText = `Smoking & Vaping Laws Comparison: ${state1Name} vs ${state2Name}\n\n` +
      comparison.map(comp => 
        `${CATEGORY_LABELS[comp.category]}: ${comp.difference.replace('_', ' ')}`
      ).join('\n');

    if (navigator.share) {
      await navigator.share({
        title: `Laws: ${state1Name} vs ${state2Name}`,
        text: shareText,
        url: window.location.href
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Comparison copied to clipboard!');
    }
  };

  const getDifferenceIcon = (difference: ComparisonResult['difference']) => {
    switch (difference) {
      case 'identical':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'similar':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'different':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'missing_one':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'missing_both':
        return <XCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getDifferenceColor = (difference: ComparisonResult['difference']) => {
    switch (difference) {
      case 'identical':
        return 'bg-green-50 border-green-200';
      case 'similar':
        return 'bg-yellow-50 border-yellow-200';
      case 'different':
        return 'bg-red-50 border-red-200';
      case 'missing_one':
        return 'bg-orange-50 border-orange-200';
      case 'missing_both':
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-6 h-6" />
                Law Comparison Tool
              </h1>
              <p className="text-slate-600">Compare smoking and vaping laws between states</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={shareComparison}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" onClick={generatePrintableSummary}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* State Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select States to Compare</CardTitle>
            <CardDescription>Choose two states to compare their smoking and vaping laws</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">First State</label>
                <Select value={state1} onValueChange={setState1}>
                  <SelectTrigger>
                    <SelectValue />
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
              
              <div className="flex justify-center">
                <Button variant="outline" onClick={swapStates} className="mt-6">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Swap
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Second State</label>
                <Select value={state2} onValueChange={setState2}>
                  <SelectTrigger>
                    <SelectValue />
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
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-slate-600">Loading comparison...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comparison">Side-by-Side</TabsTrigger>
              <TabsTrigger value="differences">Key Differences</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            {/* Side-by-Side Comparison */}
            <TabsContent value="comparison" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* State 1 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {SOUTHEAST_STATES.find(s => s.code === state1)?.name}
                  </h3>
                  <div className="space-y-4">
                    {comparison.map((comp) => (
                      <Card key={comp.category} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{CATEGORY_LABELS[comp.category]}</CardTitle>
                            <Badge className={CATEGORY_COLORS[comp.category]}>
                              {comp.state1Law ? 'Law Found' : 'No Law'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {comp.state1Law ? (
                            <div>
                              <p className="text-sm text-slate-700 mb-2">{comp.state1Law.summary}</p>
                              {comp.state1Law.details && (
                                <p className="text-xs text-slate-600">{comp.state1Law.details}</p>
                              )}
                              <div className="text-xs text-slate-500 mt-2">
                                Verified: {new Date(comp.state1Law.last_verified_at).toLocaleDateString()}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 italic">No specific laws found for this category</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* State 2 */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    {SOUTHEAST_STATES.find(s => s.code === state2)?.name}
                  </h3>
                  <div className="space-y-4">
                    {comparison.map((comp) => (
                      <Card key={comp.category} className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{CATEGORY_LABELS[comp.category]}</CardTitle>
                            <Badge className={CATEGORY_COLORS[comp.category]}>
                              {comp.state2Law ? 'Law Found' : 'No Law'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {comp.state2Law ? (
                            <div>
                              <p className="text-sm text-slate-700 mb-2">{comp.state2Law.summary}</p>
                              {comp.state2Law.details && (
                                <p className="text-xs text-slate-600">{comp.state2Law.details}</p>
                              )}
                              <div className="text-xs text-slate-500 mt-2">
                                Verified: {new Date(comp.state2Law.last_verified_at).toLocaleDateString()}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 italic">No specific laws found for this category</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Key Differences */}
            <TabsContent value="differences" className="space-y-4">
              <div className="space-y-4">
                {comparison.map((comp) => (
                  <Card key={comp.category} className={getDifferenceColor(comp.difference)}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          {getDifferenceIcon(comp.difference)}
                          {CATEGORY_LABELS[comp.category]}
                        </CardTitle>
                        <Badge variant="outline">
                          {comp.difference.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-sm text-slate-900 mb-1">
                            {SOUTHEAST_STATES.find(s => s.code === state1)?.name}:
                          </h4>
                          <p className="text-sm text-slate-700">
                            {comp.state1Law?.summary || 'No specific laws'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm text-slate-900 mb-1">
                            {SOUTHEAST_STATES.find(s => s.code === state2)?.name}:
                          </h4>
                          <p className="text-sm text-slate-700">
                            {comp.state2Law?.summary || 'No specific laws'}
                          </p>
                        </div>
                      </div>
                      {comp.keyDifferences.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <h4 className="font-medium text-sm text-slate-900 mb-1">Key Differences:</h4>
                          <ul className="text-sm text-slate-600 list-disc list-inside">
                            {comp.keyDifferences.map((diff, index) => (
                              <li key={index}>{diff}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Summary */}
            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Comparison Summary</CardTitle>
                  <CardDescription>
                    Overview of smoking and vaping laws between {SOUTHEAST_STATES.find(s => s.code === state1)?.name} 
                    and {SOUTHEAST_STATES.find(s => s.code === state2)?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {Object.entries(
                      comparison.reduce((acc, comp) => {
                        acc[comp.difference] = (acc[comp.difference] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).map(([difference, count]) => (
                      <div key={difference} className="text-center">
                        <div className="text-2xl font-bold text-primary">{count}</div>
                        <div className="text-sm text-slate-600">{difference.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-6" />

                  <div className="prose max-w-none">
                    <h3>Key Takeaways</h3>
                    <ul>
                      {comparison.filter(comp => comp.difference === 'different').map(comp => (
                        <li key={comp.category}>
                          <strong>{CATEGORY_LABELS[comp.category]}:</strong> Significant differences exist between the states
                        </li>
                      ))}
                      {comparison.filter(comp => comp.difference === 'identical').map(comp => (
                        <li key={comp.category}>
                          <strong>{CATEGORY_LABELS[comp.category]}:</strong> Both states have similar regulations
                        </li>
                      ))}
                      {comparison.filter(comp => comp.difference === 'missing_one').map(comp => (
                        <li key={comp.category}>
                          <strong>{CATEGORY_LABELS[comp.category]}:</strong> Only one state has specific laws
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Travel Advisory</h4>
                    <p className="text-sm text-blue-800">
                      Based on this comparison, travelers should be aware of the key differences in smoking and vaping 
                      regulations between these states. Always check local laws and respect designated smoking areas.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
