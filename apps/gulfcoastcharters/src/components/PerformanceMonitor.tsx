import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { checkDatabaseHealth, DatabaseHealthStatus } from '@/utils/databaseHealthCheck';
import { runStressTest, StressTestResult } from '@/utils/stressTesting';
import { Activity, Database, Zap, AlertTriangle } from 'lucide-react';

export default function PerformanceMonitor() {
  const [health, setHealth] = useState<DatabaseHealthStatus | null>(null);
  const [stressTest, setStressTest] = useState<StressTestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    const result = await checkDatabaseHealth();
    setHealth(result);
    setLoading(false);
  };

  const runTest = async () => {
    setLoading(true);
    const result = await runStressTest(1000, 5);
    setStressTest(result);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Health Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkHealth} disabled={loading}>
            {loading ? 'Checking...' : 'Check Database Health'}
          </Button>
          {health && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>Status:</span>
                <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
                  {health.status}
                </Badge>
              </div>
              <p>Response Time: {health.responseTime}ms</p>
              {health.errors.length > 0 && (
                <div className="text-red-600">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  {health.errors.join(', ')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Stress Test (1000 Concurrent Users)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runTest} disabled={loading}>
            {loading ? 'Running Test...' : 'Run Stress Test'}
          </Button>
          {stressTest && (
            <div className="grid grid-cols-2 gap-4">
              <div>Total Requests: {stressTest.totalRequests}</div>
              <div>Successful: {stressTest.successfulRequests}</div>
              <div>Failed: {stressTest.failedRequests}</div>
              <div>Avg Response: {stressTest.averageResponseTime.toFixed(2)}ms</div>
              <div>Min Response: {stressTest.minResponseTime}ms</div>
              <div>Max Response: {stressTest.maxResponseTime}ms</div>
              <div className="col-span-2">RPS: {stressTest.requestsPerSecond.toFixed(2)}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
