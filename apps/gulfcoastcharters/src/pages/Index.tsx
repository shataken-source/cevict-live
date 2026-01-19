import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import SEO from '@/components/SEO';
import HeroSection from '@/components/HeroSection';
import PersonalizedHomepage from '@/components/personalization/PersonalizedHomepage';
import SmartSearchBar from '@/components/personalization/SmartSearchBar';
import UserInterestsManager from '@/components/personalization/UserInterestsManager';
import FeaturesSection from '@/components/FeaturesSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import CharterGrid from '@/components/CharterGrid';
import { generateReferralMetaTags, generateReferralStructuredData } from '@/utils/referralMetaTags';
import { useLocation } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';


const Index: React.FC = () => {
  const location = useLocation();
  const { user } = useUser();
  const searchParams = new URLSearchParams(location.search);
  const referralCode = searchParams.get('ref');
  const [filters, setFilters] = useState({
    location: '',
    boatType: '',
    priceRange: '',
    sortBy: 'rating',
    hideWeatherAffected: false,
  });

  const metaTags = referralCode 
    ? generateReferralMetaTags(referralCode)
    : {};

  const structuredData = referralCode 
    ? generateReferralStructuredData(referralCode)
    : undefined;

  return (
    <AppProvider>
      <SEO
        title={metaTags.title || "Gulf Charter Finder - Book Your Perfect Charter"}
        description={metaTags.description || "Find and book the best charter boats in the Gulf Coast"}
        image={metaTags.image}
        structuredData={structuredData}
      />
      <AppLayout>
        <HeroSection onFilterChange={setFilters} />
        
        {/* Smart AI Search Bar */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <SmartSearchBar />
        </div>

        {/* Personalized Homepage Sections (if logged in) */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          {user ? (
            <>
              <PersonalizedHomepage />
              <div className="mt-12">
                <UserInterestsManager />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold mb-8">Featured Charters</h2>
              <CharterGrid filters={filters} />
            </>
          )}
        </div>
        
        <FeaturesSection />
        <TestimonialsSection />

      </AppLayout>
    </AppProvider>
  );
};

export default Index;
