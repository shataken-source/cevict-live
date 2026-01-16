'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, ExternalLink, Globe, Mail, MapPin } from '@/components/ui/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Shelter = {
  id: string;
  shelter_name?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  shelter_url?: string;
  shelter_type?: string;
};

export default function SheltersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shelters, setShelters] = useState<Shelter[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/petreunion/shelter/list');
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setShelters([]);
          setError(data?.error || `Failed to load shelters (HTTP ${response.status})`);
          return;
        }

        const data = await response.json();
        setShelters(data?.shelters || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load shelters');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Partner Shelters
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Connect with our network of trusted shelters and rescue organizations.
            If you represent a shelter, register to manage your listings and help reunite more pets.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <Link href="/shelter/login">
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg">
              <span className="mr-2">🤖</span>
              AI Shelter Portal - Reunite More Pets
            </Button>
          </Link>
          <Link href="/shelter/login">
            <Button size="lg" variant="outline" className="border-2 border-purple-300 hover:bg-purple-50">
              <Building className="w-5 h-5 mr-2" />
              Join Our Network
            </Button>
          </Link>
        </div>
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <p className="text-lg text-gray-700 leading-relaxed">
            <span className="font-semibold text-purple-600">Love + AI = More Reunions</span>
            <br />
            Use our AI-powered matching tools to help pets find their way home faster.
            Every reunion starts with love, and we make it happen with technology.
          </p>
        </div>

        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-900">Shelter Directory</h2>
              <Badge variant="secondary" className="text-sm">
                {loading ? 'Loading…' : error ? 'Offline' : `${shelters.length} shelters`}
              </Badge>
            </div>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading shelters…</span>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-gray-700 mb-4">
                    <Building className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <div className="text-xl font-medium mb-2">Directory coming soon</div>
                    <div className="text-sm text-gray-600">We're building our shelter network. Check back soon!</div>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 max-w-md mx-auto">
                    Error: {error}
                  </div>
                </div>
              ) : shelters.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <div className="text-xl font-medium mb-2 text-gray-700">No shelters listed yet</div>
                  <div className="text-sm text-gray-600 mb-6">Be the first shelter to join our network!</div>
                  <Link href="/shelter/login">
                    <Button>Register Your Shelter</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {shelters.map((s) => (
                    <Card key={s.id} className="h-full hover:shadow-lg transition-shadow border-0 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl text-gray-900 mb-2">
                              {s.shelter_name || s.name || 'Shelter'}
                            </CardTitle>
                            <div className="flex items-center text-gray-600 text-sm">
                              <MapPin className="w-4 h-4 mr-1" />
                              {s.address ? s.address : 'Address not specified'}
                            </div>
                          </div>
                          {s.shelter_type && (
                            <Badge variant="outline" className="text-xs">
                              {s.shelter_type}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          {s.email && (
                            <a
                              href={`mailto:${s.email}`}
                              className="flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              {s.email}
                            </a>
                          )}
                          {s.phone && (
                            <a
                              href={`tel:${s.phone}`}
                              className="flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              {s.phone}
                            </a>
                          )}
                          {s.shelter_url && (
                            <a
                              href={s.shelter_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <Globe className="w-4 h-4 mr-2" />
                              Visit Website
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          )}
                        </div>
                        <div className="pt-3 border-t border-gray-100">
                          <Link href="/shelter/login">
                            <Button variant="outline" size="sm" className="w-full">
                              Shelter Portal
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        </div>

        <div className="text-center mt-12">
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0">
            <CardContent className="p-8">
              <Building className="w-12 h-12 mx-auto text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Want Your Shelter Listed?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Join our network of trusted shelters. Register to import your pets, manage listings,
                and help reunite lost pets with their families faster.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/shelter/login">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Register Shelter
                  </Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline">Learn More</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
