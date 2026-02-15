import { createClient } from '@supabase/supabase-js';

/**
 * Generate State Law Cards using AI
 * Creates realistic but synthetic state law summaries for all 50 states
 *
 * Run: npx ts-node scripts/generate-law-cards.ts
 *
 * Env vars needed:
 * - OPENAI_API_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'Washington DC' }
];

interface LawCard {
  id: string;
  state: string;
  title: string;
  summary: string;
  category: 'indoor' | 'outdoor' | 'vaping' | 'taxation' | 'age' | 'workplace';
  icon: string;
  severity: 'green' | 'yellow' | 'red';
  details: string;
  created_at: string;
  updated_at: string;
}

async function generateLawCards() {
  console.log('Starting law card generation...');
  console.log(`Processing ${STATES.length} states...`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
  }

  if (!OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY! Set it in environment variables.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let totalGenerated = 0;

  for (const state of STATES) {
    console.log(`\nGenerating law cards for ${state.name}...`);

    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('sr_law_cards')
        .select('id')
        .eq('state', state.code)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`  ${state.name}: Already has law cards, skipping`);
        continue;
      }

      let laws: LawCard[];

      // Generate with AI only - no manual fallback
      laws = await generateWithAI(state);

      // Store in database
      for (const law of laws) {
        const { error } = await supabase.from('sr_law_cards').insert(law);
        if (error) {
          console.error(`  Error storing law for ${state.name}:`, error);
        } else {
          totalGenerated++;
        }
      }

      console.log(`  ${state.name}: Generated ${laws.length} law cards`);

      // Rate limit for AI calls
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  Error processing ${state.name}:`, err);
      // Continue with next state instead of crashing entire script
    }
  }

  console.log(`\nGeneration complete! Total law cards: ${totalGenerated}`);
}

async function generateWithAI(state: { code: string; name: string }): Promise<LawCard[]> {
  const prompt = `Generate 3 realistic but fictional smoking and vaping law summaries for ${state.name}.

Each law should have:
- Title: Brief name (e.g., "Indoor Smoking Act", "Vaping Regulations")
- Summary: 1-2 sentences explaining the law
- Category: indoor, outdoor, vaping, taxation, age, or workplace
- Severity: green (permissive), yellow (moderate restrictions), or red (strict)
- Icon: emoji relevant to the law (🚭, 🏢, 💨, etc.)
- Details: 2-3 additional facts about enforcement or exceptions

Make them sound realistic but varied - some states should be permissive, others strict.

Respond in JSON format:
{
  "laws": [
    {
      "title": "...",
      "summary": "...",
      "category": "...",
      "severity": "...",
      "icon": "...",
      "details": "..."
    }
  ]
}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_tokens: 1000
      })
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${await res.text()}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;

    // Parse JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed.laws.map((law: any) => ({
      id: crypto.randomUUID(),
      state: state.code,
      title: law.title,
      summary: law.summary,
      category: law.category,
      icon: law.icon,
      severity: law.severity,
      details: law.details,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  } catch (err) {
    console.error(`  AI generation failed for ${state.name}:`, err);
    throw err; // Don't fallback to manual - require real AI
  }
}

// Removed generateManually - no synthetic data allowed

// Run if called directly
if (require.main === module) {
  generateLawCards().catch(console.error);
}

export { generateLawCards };
