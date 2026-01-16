'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, HeartHandshake, Mail, Sparkles, Star } from '@/components/ui/icons';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useMemo } from 'react';

type Sponsor = {
  name: string;
  tier: 'platinum' | 'gold' | 'silver' | 'community';
  description: string;
  link?: string;
  contact?: string;
};

const SPONSORS: Sponsor[] = [
  {
    name: 'Open Paws Foundation',
    tier: 'platinum',
    description: 'Funding rescue transports, medical care, and food for pets in crisis.',
    link: 'https://example.org',
  },
  {
    name: 'Safe Haven Vets',
    tier: 'gold',
    description: 'Veterinary care and triage for rescued animals.',
    link: 'https://example.org',
  },
  {
    name: 'Happy Trails Pet Supply',
    tier: 'silver',
    description: 'Food, crates, and supplies for field operations.',
    link: 'https://example.org',
  },
  {
    name: 'Community Heroes',
    tier: 'community',
    description: 'Local volunteers and small businesses supporting rescues.',
  },
];

const TIER_META: Record<Sponsor['tier'], { label: string; color: string; icon: ReactElement }> = {
  platinum: { label: 'Platinum', color: 'text-blue-700', icon: <Sparkles className="w-4 h-4" /> },
  gold: { label: 'Gold', color: 'text-amber-600', icon: <Star className="w-4 h-4" /> },
  silver: { label: 'Silver', color: 'text-slate-600', icon: <Star className="w-4 h-4" /> },
  community: { label: 'Community', color: 'text-green-600', icon: <HeartHandshake className="w-4 h-4" /> },
};

const HOW_TO_HELP = [
  { title: 'Donate', desc: 'Fund transport, medical care, and sheltering.', cta: 'Get a donate link from us', action: 'mailto:hello@petreunion.org?subject=Sponsorship%20Donation' },
  { title: 'In-kind support', desc: 'Food, crates, transport vehicles, media reach.', cta: 'Email to coordinate', action: 'mailto:hello@petreunion.org?subject=In-kind%20Support' },
  { title: 'Matching gifts', desc: 'Match donations during rescue drives.', cta: 'Schedule a call', action: 'mailto:hello@petreunion.org?subject=Matching%20Gifts' },
];

export default function SponsorsPage() {
  const sponsorsByTier = useMemo(() => {
    const grouped: Record<Sponsor['tier'], Sponsor[]> = {
      platinum: [],
      gold: [],
      silver: [],
      community: [],
    };
    SPONSORS.forEach((s) => grouped[s.tier].push(s));
    return grouped;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero */}
        <Card className="bg-white/80 backdrop-blur-md border-blue-100 shadow-lg">
          <CardContent className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-3">
                <Badge className="w-fit" variant="outline">
                  <Sparkles className="w-3 h-3 mr-2" /> Sponsors & Partners
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Together we reunite pets with their families
                </h1>
                <p className="text-gray-600 max-w-2xl">
                  We’re grateful to the organizations and people who power PetReunion. Your support funds rescue transport, medical care, and the technology that helps families find their lost pets.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button asChild className="bg-blue-600 hover:bg-blue-700">
                    <Link href="mailto:hello@petreunion.org?subject=Become%20a%20Sponsor">
                      Become a sponsor <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/">See the mission</Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-2xl font-bold text-blue-700">24/7</p>
                  <p>Rescue coordination</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <p className="text-2xl font-bold text-purple-700">10k+</p>
                  <p>Families reached</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-2xl font-bold text-amber-700">US Nationwide</p>
                  <p>Coverage</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-2xl font-bold text-green-700">High Impact</p>
                  <p>On every dollar</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tiers */}
        <div className="space-y-6">
          {(['platinum', 'gold', 'silver', 'community'] as Sponsor['tier'][]).map((tier) => {
            const items = sponsorsByTier[tier];
            if (!items.length) return null;
            const meta = TIER_META[tier];
            return (
              <Card key={tier} className="border-gray-100">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${meta.color} flex items-center gap-1`}>
                      {meta.icon} {meta.label} Sponsors
                    </span>
                  </div>
                  <CardDescription className="text-gray-600">
                    {tier === 'platinum' && 'Our highest-impact partners funding core operations and rapid response.'}
                    {tier === 'gold' && 'Major partners accelerating rescue, transport, and medical care.'}
                    {tier === 'silver' && 'Key supporters providing gear, food, and outreach.'}
                    {tier === 'community' && 'Grassroots supporters and volunteers who make local impact possible.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  {items.map((s) => (
                    <Card key={s.name} className="border-gray-100 shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-lg">
                          <span>{s.name}</span>
                          <Badge variant="outline">{meta.label}</Badge>
                        </CardTitle>
                        <CardDescription className="text-gray-600">{s.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex justify-between items-center">
                        <div />
                        {s.link && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={s.link} target="_blank" rel="noreferrer">
                              Visit <ArrowUpRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* How to help */}
        <Card className="border-blue-100 bg-white/80">
          <CardHeader>
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-blue-600" />
              <CardTitle>Become a sponsor</CardTitle>
            </div>
            <CardDescription>
              Join us—every dollar fuels reunions. We’ll work with you on the right exposure and reporting.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            {HOW_TO_HELP.map((item) => (
              <Card key={item.title} className="border-gray-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href={item.action}>
                      {item.cta} <Mail className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

