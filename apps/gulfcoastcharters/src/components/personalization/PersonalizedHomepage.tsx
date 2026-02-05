import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CharterCard from '@/components/CharterCard';

export default function PersonalizedHomepage() {
  const [topPicks, setTopPicks] = useState([]);
  const [dealsForYou, setDealsForYou] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [nearYou, setNearYou] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPersonalizedSections();
  }, []);

  const loadPersonalizedSections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      loadDefaultContent();
      return;
    }

    const { data: history } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data } = await supabase.functions.invoke('ai-personalization-engine', {
      body: { 
        action: 'generate_recommendations', 
        userId: user.id, 
        data: { userHistory: history }
      }
    });

    if (data?.data) {
      const charterIds = data.data.map((r: any) => r.charterId);
      const { data: charters } = await supabase
        .from('charters')
        .select('*')
        .in('id', charterIds);
      
      setTopPicks(charters || []);
    }

    loadDeals(user.id);
    loadRecentlyViewed(user.id);
    loadNearby();
    setLoading(false);
  };

  const loadDefaultContent = async () => {
    const { data } = await supabase
      .from('charters')
      .select('*')
      .limit(8);
    setTopPicks(data || []);
    setLoading(false);
  };

  const loadDeals = async (userId: string) => {
    const { data } = await supabase
      .from('charters')
      .select('*')
      .not('discount', 'is', null)
      .limit(4);
    setDealsForYou(data || []);
  };

  const loadRecentlyViewed = async (userId: string) => {
    const { data } = await supabase
      .from('user_activity')
      .select('charter_id, charters(*)')
      .eq('user_id', userId)
      .eq('activity_type', 'view')
      .order('created_at', { ascending: false })
      .limit(4);
    setRecentlyViewed(data?.map((d: any) => d.charters) || []);
  };

  const loadNearby = async () => {
    const { data } = await supabase
      .from('charters')
      .select('*')
      .limit(4);
    setNearYou(data || []);
  };

  if (loading) return <div className="text-center py-12">Loading your personalized experience...</div>;

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          Top Picks for You
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topPicks.slice(0, 4).map((charter: any) => (
            <CharterCard key={charter.id} charter={charter} />
          ))}
        </div>
      </section>

      {dealsForYou.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-600" />
            Deals for You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dealsForYou.map((charter: any) => (
              <CharterCard key={charter.id} charter={charter} />
            ))}
          </div>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-purple-600" />
            Recently Viewed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentlyViewed.map((charter: any) => (
              <CharterCard key={charter.id} charter={charter} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-red-600" />
          Popular Near You
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {nearYou.map((charter: any) => (
            <CharterCard key={charter.id} charter={charter} />
          ))}
        </div>
      </section>
    </div>
  );
}