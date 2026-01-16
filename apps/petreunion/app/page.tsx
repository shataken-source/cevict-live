'use client';

import AdBanner from '@/components/ads/AdBanner';
import SuccessStories from '@/components/SuccessStories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Search, Shield, Sparkles } from '@/components/ui/icons';
import { fetchJson } from '@/lib/fetcher';
import { useRecentPets } from '@/lib/useRecentPets';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ActionCard } from './components/ActionCard';
import { FeatureGrid } from './components/FeatureGrid';
import { HeroSection } from './components/HeroSection';
import { RecentPets } from './components/RecentPets';
import { StatsSection } from './components/StatsSection';

interface Pet {
  id: string;
  name: string;
  pet_type?: string;
  type: string;
  breed: string;
  gender: string;
  status: 'lost' | 'found';
  location: string;
  description: string;
  photoUrl: string | null;
  dateLost: string;
  createdAt: string;
}

export default function Home() {
  const [stats, setStats] = useState<{ total: number; found: number; active: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lost' | 'found'>('all');
  const { data: recentPets, loading, error: petsError } = useRecentPets<Pet>(statusFilter, 16);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await fetchJson('/api/petreunion/stats');
        const total = Number(data.total_pets || 0);
        const reunited = Number(data.by_status?.reunited || 0);
        const active = Number(data.by_status?.lost || 0) + Number(data.by_status?.found || 0);
        setStats({ total, found: reunited, active });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setError('We could not load stats right now. Please try again shortly.');
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    if (petsError) setError(petsError);
  }, [petsError]);

  const filteredPets = useMemo(() => {
    const normalized = (recentPets || []).map((pet: any) => {
      let cleanName = pet.name || pet.pet_name || '';
      cleanName = cleanName.replace(/_[FIT][BG]?T?_\d+.*$/, '').trim();
      cleanName = cleanName.replace(/_\d+_\d+.*$/, '').trim();
      return {
        ...pet,
        name: cleanName || 'Unknown',
        pet_type: pet.pet_type || pet.type || '',
        photoUrl: pet.photoUrl || pet.photo_url || pet.image_url || pet.image || null,
      } as Pet;
    });

    if (!searchQuery.trim()) return normalized;

    const query = searchQuery.toLowerCase();
    return normalized.filter((pet) => {
      return (
        (pet.name || '').toLowerCase().includes(query) ||
        (pet.breed || '').toLowerCase().includes(query) ||
        (pet.location || '').toLowerCase().includes(query)
      );
    });
  }, [recentPets, searchQuery]);

  const recentPetsForGrid = filteredPets.map((p) => ({
    id: p.id,
    name: p.name,
    pet_type: p.pet_type || p.type,
    imageUrl: p.photoUrl || undefined,
    breed: p.breed,
    location: p.location,
    dateLost: p.dateLost,
  }));

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 shadow-sm">
        <div className="panic-bar text-sm px-4 py-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="font-semibold">Lost pet? Use Panic Mode for fastest alerts.</div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/report/lost" className="underline font-semibold">Report lost</Link>
            <Link href="#panic-mode" className="underline">Open Panic Mode</Link>
          </div>
        </div>
        <div className="safety-bar text-sm px-4 py-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="font-semibold">Found pet? Use Safety Blue handoff to protect both sides.</div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/report/found" className="underline font-semibold">Report found</Link>
            <Link href="/shelter/login" className="underline">Shelter portal</Link>
          </div>
        </div>
      </div>

      <HeroSection />

      <StatsSection stats={stats || { total: 0, found: 0, active: 0 }} />

      <FeatureGrid />

      <div className="max-w-6xl mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            title="Report a Lost Pet"
            description="Submit a report in under 2 minutes. Our AI starts scanning immediately."
            icon={<Heart className="w-6 h-6 text-red-600" />}
            gradient="from-red-50 to-orange-100"
            buttonText="I Lost My Pet"
            href="/report/lost"
            features={['Fast form', 'Photo optional', 'Instant matching']}
          />
          <ActionCard
            title="Report a Found Pet"
            description="Help a pet get home. Upload a photo and where you found them."
            icon={<Shield className="w-6 h-6 text-green-700" />}
            gradient="from-green-50 to-emerald-100"
            buttonText="I Found a Pet"
            href="/report/found"
            features={['Fuzzy location', 'Secure contact', 'AI match alerts']}
            buttonVariant="outline"
          />
          <ActionCard
            title="Shelter / Rescue Tools"
            description="Use the AI portal to reunite pets faster with better data and workflows."
            icon={<Sparkles className="w-6 h-6 text-purple-700" />}
            gradient="from-purple-50 to-pink-100"
            buttonText="AI Shelter Portal"
            href="/shelter/login"
            features={['Bulk intake', 'Advanced search', 'Faster reunions']}
            buttonVariant="ghost"
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mb-10">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Lost &amp; Found Pets</h2>
              <p className="text-muted-foreground">Browse recent reports and share to spread the word.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'lost', 'found'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'All' : status === 'lost' ? 'Lost' : 'Found'}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, breed, or location…"
                className="pl-9"
              />
            </div>
            <Link href="/search" className="md:self-stretch">
              <Button className="w-full md:w-auto md:h-full">Open full search</Button>
            </Link>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="max-w-6xl mx-auto px-4 mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-lg h-64 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <RecentPets pets={recentPetsForGrid} />
      )}

      {/* Ad Section - Only shows when ad loads */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-center mb-12">
          <AdBanner adSlot="petreunion-header" adFormat="leaderboard" width={728} height={90} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-16">
        <SuccessStories />
      </div>
    </div>
  );
}
