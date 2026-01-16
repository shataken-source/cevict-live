import Link from 'next/link';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Heart, MapPin, Search } from '@/components/ui/icons';

export default function LostPetsTipsPage() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-4 py-2 text-sm font-medium text-slate-700 border border-white/60">
            Practical steps • Community powered • Free forever
          </div>
          <h1 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight text-slate-900">Tips for Finding a Lost Pet</h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            The first few hours matter most. Here’s a clear, calm checklist to help you take the right actions—fast.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/report/lost">
              <Button className="px-6 py-6 text-base font-semibold">
                Report Lost Pet
              </Button>
            </Link>
            <Link href="/search">
              <Button variant="outline" className="px-6 py-6 text-base font-semibold">
                Search Reports
              </Button>
            </Link>
          </div>
        </div>

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-700" />
          <AlertDescription className="text-yellow-800">
            <span className="font-semibold">Safety first:</span> never enter private property, storm drains, or unsafe areas.
            If a pet appears fearful or aggressive, contact animal control or a local rescue for help.
          </AlertDescription>
        </Alert>

        <Card className="border border-white/60 bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">01</span> Immediate actions (first 1–3 hours)
            </CardTitle>
            <CardDescription>Do these now to increase the chances of a quick reunion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-700">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
              <div>
                <div className="font-semibold">Return to the last-seen location</div>
                <div className="text-sm text-slate-600">Bring treats, a leash/carrier, and something that smells like home.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
              <div>
                <div className="font-semibold">Search quietly and thoroughly</div>
                <div className="text-sm text-slate-600">Call softly, listen for movement, check under porches, sheds, bushes.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
              <div>
                <div className="font-semibold">Create a report</div>
                <div className="text-sm text-slate-600">Upload clear photos, distinctive markings, collar/harness details, and exact location.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/60 bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">02</span> Boost visibility (today)
            </CardTitle>
            <CardDescription>Make it easy for the right person to recognize your pet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/60 bg-white/60 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <MapPin className="w-4 h-4" />
                  Post in the right radius
                </div>
                <div className="mt-1 text-sm text-slate-600">Start within 1–2 miles, then expand. Most pets stay close early.</div>
              </div>
              <div className="rounded-xl border border-white/60 bg-white/60 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Search className="w-4 h-4" />
                  Search daily
                </div>
                <div className="mt-1 text-sm text-slate-600">Check new intakes, “found pet” posts, and nearby shelters every day.</div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Flyers</Badge>
                Use one clear photo + big “LOST” + phone number + cross streets.
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Social</Badge>
                Post in neighborhood groups and ask friends to share.
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Microchip</Badge>
                If microchipped, call the registry immediately and report as lost.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-white/60 bg-white/70 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">03</span> If you get a possible sighting
            </CardTitle>
            <CardDescription>Move fast, but don’t chase—chasing often pushes pets farther away.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
              <div>
                <div className="font-semibold">Ask for a photo/video if possible</div>
                <div className="text-slate-600">It prevents wasted trips and confirms markings.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
              <div>
                <div className="font-semibold">Bring help + supplies</div>
                <div className="text-slate-600">Leash, treats, towel/blanket, carrier, flashlight for night searches.</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-1" />
              <div>
                <div className="font-semibold">Use calm, familiar cues</div>
                <div className="text-slate-600">Sit down, avoid eye contact, speak softly, offer food on the ground.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur border-white/60">
          <CardContent className="p-8 md:p-10">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-slate-600 font-semibold">
                <Heart className="w-4 h-4 text-red-600" />
                You’re not alone
              </div>
              <div className="mt-2 text-3xl md:text-4xl font-bold text-slate-900">Let’s bring them home.</div>
              <div className="mt-4 text-slate-600 max-w-3xl mx-auto">
                Create a report and share it. The community can’t help if they don’t know who to look for.
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/report/lost">
                  <Button className="px-6 py-6 text-base font-semibold">Report Lost Pet</Button>
                </Link>
                <Link href="/search">
                  <Button variant="outline" className="px-6 py-6 text-base font-semibold">Search New Reports</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
