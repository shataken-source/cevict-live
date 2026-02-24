import React from 'react';
import CharterGrid from '../components/CharterGrid';
import AdBanner from '../components/AdBanner';
import SidebarAd from '../components/SidebarAd';
import GoogleAdSense from '../components/GoogleAdSense';

interface SearchResultsProps {
  filters: {
    location: string;
    boatType: string;
    priceRange: string;
    sortBy: string;
  };
}

export default function SearchResults({ filters }: SearchResultsProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Top Banner Ad */}
        <div className="mb-6">
          <AdBanner />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar with Ads */}
          <aside className="lg:w-64 space-y-6">
            <SidebarAd />
            <GoogleAdSense slot="sidebar-ad-1" />
          </aside>

          {/* Main Results */}
          <main className="flex-1">
            <CharterGrid filters={filters} />
          </main>

          {/* Right Sidebar with Ads */}
          <aside className="lg:w-64 space-y-6">
            <SidebarAd />
            <GoogleAdSense slot="sidebar-ad-2" />
          </aside>
        </div>

        {/* Bottom Banner Ad */}
        <div className="mt-8">
          <AdBanner />
        </div>
      </div>
    </div>
  );
}
