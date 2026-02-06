import { notFound } from 'next/navigation';
import { FileText, Calendar, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
};

const CATEGORY_LABELS: Record<string, string> = {
  'indoor-smoking': 'Indoor Smoking',
  'outdoor-smoking': 'Outdoor Smoking',
  'vaping': 'Vaping',
  'cannabis': 'Cannabis',
  'tobacco-tax': 'Tobacco Tax',
  'age-restrictions': 'Age Restrictions',
};

async function getStateLaws(stateCode: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return [];
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('laws')
      .select('*')
      .eq('state_code', stateCode.toUpperCase())
      .order('category', { ascending: true });

    if (error || !data) {
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error fetching state laws:', error);
    return [];
  }
}

export default async function StateLawsPage({
  params,
}: {
  params: { state: string };
}) {
  const stateCode = params.state.toUpperCase();
  const stateName = STATE_NAMES[stateCode] || stateCode;
  const laws = await getStateLaws(stateCode);

  // Show a friendly message instead of 404 for states without laws
  if (laws.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <MapPin className="w-6 h-6 text-gray-400" />
              <h1 className="text-3xl font-bold text-gray-900">{stateName}</h1>
            </div>
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No laws found</h2>
            <p className="text-gray-600 mb-6">
              We don't have any laws on file for {stateName} yet. Check back soon!
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
            >
              Browse other states →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Group laws by category
  const lawsByCategory = laws.reduce((acc, law) => {
    const category = law.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(law);
    return acc;
  }, {} as Record<string, typeof laws>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">{stateName}</h1>
              </div>
              <p className="text-lg text-gray-600">
                {laws.length} {laws.length === 1 ? 'law' : 'laws'} found
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {Object.entries(lawsByCategory).map(([category, categoryLaws]) => (
              <div key={category} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 capitalize">
                  {CATEGORY_LABELS[category] || category.replace(/-/g, ' ')}
                </h2>
                
                <div className="space-y-4">
                  {categoryLaws.map((law) => (
                    <Link
                      key={law.id}
                      href={`/legal/${params.state.toLowerCase()}/${law.category}`}
                      className="block bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {law.summary || `${CATEGORY_LABELS[category] || category} Law`}
                          </h3>
                          {law.summary && law.summary.length > 150 ? (
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {law.summary}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {law.effective_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Effective: {new Date(law.effective_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {law.last_updated_at && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>Updated: {new Date(law.last_updated_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3 text-blue-600 text-sm font-medium">
                        Read full law →
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
