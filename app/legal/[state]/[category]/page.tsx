import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
];

const CATEGORIES = [
  'indoor_smoking',
  'vaping',
  'outdoor_public',
  'patio_private',
  'retail_sales',
  'hemp_restrictions',
  'penalties',
];

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function LegalPage({ params }: { params: { state: string; category: string } }) {
  const stateCode = params.state.toUpperCase();
  const category = params.category;

  if (!STATES.includes(stateCode) || !CATEGORIES.includes(category)) {
    notFound();
  }

  const supabase = getSupabaseClient();
  let lawCards: any[] = [];
  let products: any[] = [];

  if (supabase) {
    const { data } = await supabase
      .from('sr_law_cards')
      .select('*')
      .eq('state_code', stateCode)
      .eq('category', category)
      .eq('is_active', true);
    lawCards = data || [];

    const { data: prod } = await supabase
      .from('affiliate_products')
      .select('id,name,category,price,affiliate_link,commission_rate,description,sponsor,is_active')
      .eq('is_active', true)
      .order('sponsor', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(24);
    products = prod || [];
  }

  const legalProducts = products.filter((p: any) =>
    String(p.category || '').toLowerCase().includes('legal')
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800 }}>
          {stateCode} – {category.replace(/_/g, ' ')}
        </h1>
        <p style={{ color: '#555' }}>
          Current policy snapshot for {stateCode} in the category "{category.replace(/_/g, ' ')}".
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Policy Summary</h2>
        {lawCards.length === 0 ? (
          <div style={{ padding: '16px', background: '#f8f9fa', border: '1px solid #e5e7eb' }}>
            No active law cards found for this state/category.
          </div>
        ) : (
          lawCards.map((card) => (
            <div
              key={card.id}
              style={{
                padding: '16px',
                marginBottom: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: '#fff',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '8px' }}>{card.summary}</div>
              {card.details && <div style={{ color: '#444', marginBottom: '8px' }}>{card.details}</div>}
              {card.tags && card.tags.length > 0 && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Tags: {card.tags.join(', ')}
                </div>
              )}
              {card.source_urls && card.source_urls.length > 0 && (
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  Sources:{' '}
                  {card.source_urls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', marginRight: '8px' }}>
                      Source {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </section>

      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
          Buy Legal in {stateCode}
        </h2>
        {legalProducts.length === 0 ? (
          <div style={{ padding: '16px', background: '#f8f9fa', border: '1px solid #e5e7eb' }}>
            No legal products configured.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {legalProducts.map((product: any) => (
              <div key={product.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', background: '#fff' }}>
                <div style={{ fontWeight: 700 }}>{product.name}</div>
                <div style={{ color: '#444', margin: '8px 0' }}>{product.description}</div>
                <div style={{ fontWeight: 700, marginBottom: '8px' }}>
                  {typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : product.price}
                </div>
                <a
                  href={`${product.affiliate_link}${String(product.affiliate_link).includes('?') ? '&' : '?'}subid=liberty_terminal`}
                  target="_blank"
                  rel="noopener sponsored"
                  style={{
                    display: 'inline-block',
                    padding: '10px 12px',
                    background: '#cc0000',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                  }}
                >
                  Buy Now
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export async function generateMetadata({ params }: { params: { state: string; category: string } }): Promise<Metadata> {
  const stateCode = params.state.toUpperCase();
  const category = params.category.replace(/_/g, ' ');
  return {
    title: `${stateCode} ${category} Laws | SmokersRights`,
    description: `Current ${category} policy snapshot for ${stateCode}. Updated law cards, sources, and legal products for ${stateCode}.`,
    openGraph: {
      title: `${stateCode} ${category} Laws | SmokersRights`,
      description: `Current ${category} policy snapshot for ${stateCode}.`,
      url: `https://smokersrights.com/legal/${stateCode}/${params.category}`,
      type: 'article',
    },
  };
}

