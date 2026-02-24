'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle2, Share2, Home, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function SuccessContent() {
  const searchParams = useSearchParams();
  const petId = searchParams?.get('id') || null;

  const handleShare = async () => {
    const url = `${window.location.origin}/petreunion/lost/${petId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Lost Pet Report',
          text: 'Help us find this lost pet!',
          url: url,
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-8 px-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Report Submitted Successfully! 🎉
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Your lost pet report has been created and is now live.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ Your report is now visible to the community</li>
              <li>✅ People can search for your pet by location and description</li>
              <li>✅ You'll be notified if someone finds a matching pet</li>
              <li>✅ Share your report to reach more people</li>
            </ul>
          </div>

          {petId && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  onClick={handleShare}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Report
                </Button>
                <Link href={`/petreunion/lost/${petId}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Search className="w-4 h-4 mr-2" />
                    View Report
                  </Button>
                </Link>
              </div>
              
              <div className="text-center text-sm text-gray-600">
                <p>Report ID: <code className="bg-gray-100 px-2 py-1 rounded">{petId}</code></p>
                <p className="mt-2">Save this ID to check your report later</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex gap-3">
              <Link href="/petreunion/report" className="flex-1">
                <Button variant="outline" className="w-full">
                  Report Another Pet
                </Button>
              </Link>
              <Link href="/petreunion" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

