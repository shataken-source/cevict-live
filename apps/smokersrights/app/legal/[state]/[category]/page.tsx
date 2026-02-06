import { notFound } from 'next/navigation';
import { FileText, Calendar, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

async function getLaw(state: string, category: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('laws')
      .select('*')
      .eq('state_code', state.toUpperCase())
      .eq('category', category)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching law:', error);
    return null;
  }
}

export default async function LawPage({
  params,
}: {
  params: { state: string; category: string };
}) {
  const law = await getLaw(params.state, params.category);

  if (!law) {
    notFound();
  }

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
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">{law.state_name}</h1>
              </div>
              <p className="text-lg text-gray-600 capitalize">
                {law.category?.replace(/_/g, ' ') || 'Law'}
              </p>
            </div>
          </div>

          <div className="prose max-w-none mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Calendar className="w-4 h-4" />
              <span>
                Last updated: {law.last_updated_at ? new Date(law.last_updated_at).toLocaleDateString() : 'Recently'}
              </span>
            </div>

            {law.summary && (
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Summary</h2>
                <p className="text-gray-700 leading-relaxed">{law.summary}</p>
              </div>
            )}

            {law.full_text && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Full Text</h2>
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {law.full_text}
                </div>
              </div>
            )}

            {law.effective_date && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-blue-900 mb-3">Effective Date</h2>
                <div className="text-blue-800">
                  {new Date(law.effective_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )}

            {law.source_url && (
              <div className="border-t border-gray-200 pt-6">
                <a
                  href={law.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-2"
                >
                  View Source <FileText className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <Link
              href={`/legal/${params.state.toLowerCase()}`}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              View all laws for {law.state_name} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
