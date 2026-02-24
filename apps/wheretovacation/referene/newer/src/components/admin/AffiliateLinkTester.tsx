import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface TestResult {
  retailer: string;
  isWorking: boolean;
  status: number;
  isRedirect: boolean;
  redirectUrl: string | null;
  hasAffiliateId: boolean;
  affiliateParam: string | null;
  affiliateValue: string | null;
  responseTime: number;
  testedAt: string;
  error: string | null;
}

export default function AffiliateLinkTester() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const testAllLinks = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('affiliate-link-tester', {
        body: { action: 'test-all' }
      });

      if (error) throw error;
      setResults(data.results || []);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (result: TestResult) => {
    if (result.isWorking && result.hasAffiliateId) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (result.isWorking && !result.hasAffiliateId) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (result: TestResult) => {
    if (result.isWorking && result.hasAffiliateId) {
      return <Badge className="bg-green-500">Working</Badge>;
    }
    if (result.isWorking && !result.hasAffiliateId) {
      return <Badge className="bg-yellow-500">Missing ID</Badge>;
    }
    return <Badge variant="destructive">Failed</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Affiliate Link Tester</h2>
          <p className="text-muted-foreground">Test all affiliate links to verify they're working correctly</p>
        </div>
        <Button onClick={testAllLinks} disabled={testing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Testing...' : 'Test All Links'}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((result) => (
            <Card key={result.retailer}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize">{result.retailer}</CardTitle>
                  {getStatusIcon(result)}
                </div>
                <CardDescription>
                  Tested {new Date(result.testedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {getStatusBadge(result)}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">HTTP Status:</span>
                  <Badge variant="outline">{result.status}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Response Time:</span>
                  <Badge variant="outline">{result.responseTime}ms</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Affiliate ID:</span>
                  {result.hasAffiliateId ? (
                    <Badge className="bg-green-500">Present</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>

                {result.affiliateValue && (
                  <div className="text-sm">
                    <span className="font-medium">ID Value: </span>
                    <code className="bg-muted px-2 py-1 rounded">{result.affiliateValue}</code>
                  </div>
                )}

                {result.isRedirect && result.redirectUrl && (
                  <div className="text-sm">
                    <span className="font-medium">Redirects to: </span>
                    <a href={result.redirectUrl} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:underline flex items-center gap-1">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {result.error && (
                  <div className="text-sm text-red-600">
                    <span className="font-medium">Error: </span>
                    {result.error}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}