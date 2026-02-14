'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo, useState } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const bugReportingEnabled = process.env.NEXT_PUBLIC_ENABLE_BUG_REPORTING === 'true';
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const payload = useMemo(() => {
    return {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      digest: error?.digest,
      page: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      timestamp: new Date().toISOString(),
      context: {
        source: 'app/error.tsx'
      }
    };
  }, [error]);

  const reportBug = async () => {
    if (!bugReportingEnabled) return;
    setReporting(true);
    setReportError(null);

    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((data as any)?.error || 'Failed to submit bug report');
      }

      setReported(true);
    } catch (e: any) {
      setReportError(e?.message || 'Failed to submit bug report');
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>{error?.message || 'Unexpected error'}</AlertDescription>
          </Alert>

          {reportError && (
            <Alert>
              <AlertDescription>{reportError}</AlertDescription>
            </Alert>
          )}

          {reported && (
            <Alert>
              <AlertDescription>Bug report sent. Thank you.</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button onClick={reset} disabled={reporting}>
              Try again
            </Button>
            {bugReportingEnabled && (
              <Button variant="outline" onClick={reportBug} disabled={reporting || reported}>
                Report bug
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
