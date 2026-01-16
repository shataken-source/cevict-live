'use client';

import React from 'react';
import Image from 'next/image';
import { Heart, Search } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export function HeroSection() {
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const query = formData.get('search')?.toString() || '';
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  };

  return (
    <div className="hero-gradient text-slate-900 py-16 px-4 md:py-20">
      <div className="max-w-6xl mx-auto flex flex-col gap-10 lg:flex-row lg:items-center">
        <div className="flex-1 text-center lg:text-left space-y-4">
          <div className="flex items-center justify-center lg:justify-start gap-3">
            <div className="rounded-full bg-white shadow p-3">
              <Image
                src="/logo-petreunion.jpg"
                alt="PetReunion logo"
                width={56}
                height={56}
                className="rounded-full object-cover"
                priority
              />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Comfort & Urgency</p>
              <p className="text-base text-slate-500">AI-powered reunions, free forever</p>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-slate-900">
            PetReunion
          </h1>
          <p className="text-xl md:text-2xl text-slate-700">
            Fast help for lost pets. Safe handoffs for found pets. Zero fees.
          </p>
          <p className="text-base text-slate-600 max-w-2xl">
            We move quickly when every minute matters—while keeping owners and finders safe through guarded contact sharing and verified matches.
          </p>

          <Card className="max-w-2xl mx-auto lg:mx-0 mt-6 bg-white/95 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
                <Input
                  name="search"
                  type="text"
                  placeholder="Search by breed, color, city, or description..."
                  className="flex-1 text-gray-900"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 md:min-w-[150px]"
                >
                  <Search className="w-5 h-5 mr-2" />
                  Search
                </Button>
              </form>
              <div className="mt-3 text-sm text-slate-500 flex items-center justify-center gap-2">
                <Heart className="w-4 h-4 text-orange-500" />
                Free, privacy-safe, and backed by AI confidence checks.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-3 lg:max-w-md">
          <div className="p-4 rounded-2xl glass-card text-center">
            <p className="text-4xl font-bold text-orange-500">60s</p>
            <p className="text-sm text-slate-600">to file a panic report</p>
          </div>
          <div className="p-4 rounded-2xl glass-card text-center">
            <p className="text-4xl font-bold text-blue-600">80%+</p>
            <p className="text-sm text-slate-600">confidence to notify</p>
          </div>
          <div className="p-4 rounded-2xl card-soft text-center">
            <p className="text-lg font-semibold text-slate-800">Shelter-safe</p>
            <p className="text-sm text-slate-600">Contact released only after match</p>
          </div>
          <div className="p-4 rounded-2xl card-soft text-center">
            <p className="text-lg font-semibold text-slate-800">Fuzzy location</p>
            <p className="text-sm text-slate-600">Protecting users by default</p>
          </div>
        </div>
      </div>
    </div>
  );
}
