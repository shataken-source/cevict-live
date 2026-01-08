'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Shield, Scale, ShoppingBag, Search, Map, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import SafeHavenMarketplace from '@/components/marketplace/SafeHavenMarketplace'
import { ALL_STATES } from '@/lib/states'

interface LawCard {
  id: string;
  state_code: string;
  state_name: string;
  category: string;
  summary: string;
  details?: string;
  last_updated_at: string;
}

export default function Home() {
  const [recentLaws, setRecentLaws] = useState<LawCard[]>([]);
  const [loadingLaws, setLoadingLaws] = useState(true);

  useEffect(() => {
    loadRecentLaws();
  }, []);

  const fallbackLaws: LawCard[] = [
    {
      id: 'fallback-al',
      state_code: 'AL',
      state_name: 'Alabama',
      category: 'indoor_smoking',
      summary: 'Statewide indoor smoking restrictions for public workplaces; local ordinances may be stricter.',
      last_updated_at: new Date().toISOString(),
    },
    {
      id: 'fallback-fl',
      state_code: 'FL',
      state_name: 'Florida',
      category: 'vaping',
      summary: 'Clean Indoor Air Act updated to include vaping in most indoor workplaces; beaches/localities may add outdoor restrictions.',
      last_updated_at: new Date().toISOString(),
    },
    {
      id: 'fallback-ga',
      state_code: 'GA',
      state_name: 'Georgia',
      category: 'indoor_smoking',
      summary: 'Smokefree Air Act limits indoor smoking with exemptions for bars and certain hospitality venues.',
      last_updated_at: new Date().toISOString(),
    },
  ]

  const loadRecentLaws = async () => {
    try {
      const supabase = createClient();
      if (!supabase) {
        console.warn('Supabase client not available, using fallback laws');
        setRecentLaws(fallbackLaws);
        setLoadingLaws(false);
        return;
      }
      const client = supabase as NonNullable<typeof supabase>;
      const { data, error } = await client
        .from('sr_law_cards')
        .select('*')
        .eq('is_active', true)
        .order('last_updated_at', { ascending: false })
        .limit(3);

      if (!error && data && data.length > 0) {
        setRecentLaws(data as LawCard[]);
      } else {
        if (error) {
          console.warn('Error loading laws from Supabase:', error.message);
        }
        setRecentLaws(fallbackLaws);
      }
    } catch (error: any) {
      console.error('Error loading laws:', error?.message || error);
      setRecentLaws(fallbackLaws);
    } finally {
      setLoadingLaws(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    indoor_smoking: 'Indoor Smoking',
    vaping: 'Vaping',
    outdoor_public: 'Outdoor Spaces',
    retail_sales: 'Retail Sales',
    hemp_restrictions: 'Hemp',
    penalties: 'Penalties',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Hero Section - Clean & Modern */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 mb-6 shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              SmokersRights
            </h1>
            <p className="text-xl md:text-2xl text-slate-700 mb-8 max-w-2xl mx-auto leading-relaxed">
              Navigate smoking and vaping laws across the United States with confidence.
              <span className="block mt-2 text-lg text-slate-600">Your comprehensive utility for civil liberties and harm reduction.</span>
            </p>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link 
                href="/search" 
                className="group inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                <Search className="w-5 h-5" />
                Explore Laws
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/shop" 
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-300 px-8 py-4 rounded-xl text-lg font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <ShoppingBag className="w-5 h-5" />
                Shop Products
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>50 States Covered</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>400+ Laws Tracked</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Always Updated</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions - Clean Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Link 
            href="/search" 
            className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all border border-slate-200 hover:border-blue-300"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Scale className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Law Explorer</h3>
            <p className="text-slate-600 mb-4">Search and filter smoking & vaping laws by state and category</p>
            <div className="flex items-center text-blue-600 font-semibold group-hover:gap-2 transition-all">
              Explore <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link 
            href="/compare" 
            className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all border border-slate-200 hover:border-purple-300"
          >
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <TrendingUp className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Compare States</h3>
            <p className="text-slate-600 mb-4">Side-by-side comparison of laws across different states</p>
            <div className="flex items-center text-purple-600 font-semibold group-hover:gap-2 transition-all">
              Compare <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link 
            href="/shop" 
            className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all border border-slate-200 hover:border-green-300"
          >
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <ShoppingBag className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Marketplace</h3>
            <p className="text-slate-600 mb-4">Support SmokersRights while shopping smoker-approved products</p>
            <div className="flex items-center text-green-600 font-semibold group-hover:gap-2 transition-all">
              Shop Now <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* Recent Law Updates - Simplified */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Recent Law Updates</h2>
              <p className="text-slate-600">Stay informed with the latest regulatory changes</p>
            </div>
            <Link 
              href="/search" 
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loadingLaws ? (
            <div className="text-center py-12 text-slate-400">Loading laws...</div>
          ) : recentLaws.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {recentLaws.map((law) => (
                <Link
                  key={law.id}
                  href={`/search?state=${law.state_code}&category=${law.category}`}
                  className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-6 transition-all hover:shadow-md group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-blue-600 mb-1">{law.state_name}</div>
                      <div className="text-xs text-slate-500">{categoryLabels[law.category] || law.category}</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-slate-700 mb-4 line-clamp-2 text-sm leading-relaxed">{law.summary}</p>
                  <div className="text-xs text-slate-500">
                    Updated {new Date(law.last_updated_at).toLocaleDateString()}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 max-w-6xl mx-auto">
              <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No recent updates. Check back soon for new law changes.</p>
            </div>
          )}
        </div>
      </section>

      {/* States Quick Access - All 50 */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Browse All 50 States</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {ALL_STATES.map(({ code }) => (
              <Link
                key={code}
                href={`/search?state=${code}`}
                className="bg-white border border-slate-200 rounded-lg p-3 text-center hover:bg-blue-50 hover:border-blue-300 transition-all text-sm font-medium text-slate-700 hover:text-blue-600"
              >
                {code}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Safe Haven Marketplace */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <SafeHavenMarketplace />
        </div>
      </section>

      {/* Support CTA - Simple */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Support SmokersRights</h2>
            <p className="text-blue-100 text-lg mb-6">
              Shop our affiliate products and help us keep this platform free while fighting for your rights.
            </p>
            <Link 
              href="/shop" 
              className="inline-flex items-center gap-2 bg-white text-blue-600 hover:bg-slate-50 px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <ShoppingBag className="w-5 h-5" />
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
