import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PreRegisterProPage() {
  const priceYear = 19.95;
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-purple-100 text-purple-800">Proactive Search</Badge>
              <Badge className="bg-blue-100 text-blue-800">${priceYear}/year</Badge>
              <Badge className="bg-emerald-100 text-emerald-800">Soft-gated (pre-register is free)</Badge>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Pre-register your pet (Proactive Search)</h1>
            <p className="text-gray-700 mt-2 max-w-2xl">
              Pre-registering is free. If you choose to activate proactive monitoring, PetReunion will continuously match
              new found reports and new shelter listings against your pet’s profile.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/pre-register">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">Pre-register (free)</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Why pre-register?</CardTitle>
              <CardDescription>Most reunions happen fast—but only if someone is watching.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <div>
                <span className="font-semibold">Immediate matching</span>: when a found pet is reported, we compare it
                against your pre-registered profile.
              </div>
              <div>
                <span className="font-semibold">Shelter + rescue monitoring</span>: daily imports and scrapes add new
                listings; we match those to your pet profile automatically.
              </div>
              <div>
                <span className="font-semibold">Photo-aware matching</span>: if photos are available, we can use image
                similarity in addition to breed/color/size/text signals.
              </div>
              <div>
                <span className="font-semibold">One place to keep details</span>: collars, markings, microchip notes,
                temperament—ready the moment you need it.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What happens behind the scenes?</CardTitle>
              <CardDescription>A simple, automated pipeline runs every day (and after new reports).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <span className="font-semibold">Daily imports</span> add new shelter/rescue/found listings to the
                  database.
                </li>
                <li>
                  <span className="font-semibold">Post-ingest matching</span> runs automatically: new found ↔ lost and
                  new found ↔ pre-registered.
                </li>
                <li>
                  <span className="font-semibold">Matches are saved</span> for review in the admin panel, and can be
                  used to notify owners (email/SMS hooks).
                </li>
              </ol>
              <div className="text-xs text-gray-500">
                Note: Age progression is planned but depends on choosing a model/service first.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>${priceYear}/year value proposition</CardTitle>
            <CardDescription>Peace of mind + faster reunions, even if you’re asleep, traveling, or busy.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-gray-700">
            <div className="rounded-xl border bg-white p-4">
              <div className="font-semibold mb-1">Proactive search</div>
              <div className="text-sm">Your pet profile is continuously compared against newly added found pets.</div>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="font-semibold mb-1">Higher signal matches</div>
              <div className="text-sm">Uses location + description + (when available) photo similarity.</div>
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="font-semibold mb-1">Faster response</div>
              <div className="text-sm">When the first credible match appears, you can act immediately.</div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/pre-register">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
              Pre-register now
            </Button>
          </Link>
          <Link href="/pre-register/activate">
            <Button size="lg" variant="outline">
              Pet already missing? Activate a pre-registration
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

