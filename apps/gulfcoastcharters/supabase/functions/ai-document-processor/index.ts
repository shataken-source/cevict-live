/**
 * AI Document Processor
 * Extract, verify, or summarize document text. Used by AIDocumentUpload.tsx.
 * Uses API Gateway (GATEWAY_API_KEY) with a chat model when configured.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const document = String(body.document ?? body.text ?? '').slice(0, 50000);
    const documentType = String(body.documentType ?? body.document_type ?? 'document').toLowerCase();
    const action = (body.action ?? 'extract').toLowerCase() as 'extract' | 'verify' | 'summarize';

    if (!document.trim()) {
      return new Response(
        JSON.stringify({ success: false, result: 'No document text provided.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gatewayApiKey = Deno.env.get('GATEWAY_API_KEY');
    if (!gatewayApiKey) {
      const fallback =
        action === 'extract'
          ? `[Extract] Document type: ${documentType}. Configure GATEWAY_API_KEY for AI extraction.`
          : action === 'verify'
            ? `[Verify] Document type: ${documentType}. Configure GATEWAY_API_KEY for AI verification.`
            : `[Summarize] Document type: ${documentType}. Configure GATEWAY_API_KEY for AI summary.`;
      return new Response(
        JSON.stringify({ success: true, result: fallback }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const instructions = {
      extract: `Extract structured data (key facts, amounts, dates, parties) from this ${documentType}. Return a clear list or short structured summary.`,
      verify: `Verify this ${documentType} for authenticity and completeness. List what is present, any missing elements, and a brief validity assessment.`,
      summarize: `Summarize this ${documentType} in a few concise sentences. Highlight the main points only.`,
    };
    const systemPrompt = `You are a document processing assistant. ${instructions[action] ?? instructions.extract} Respond with the result only, no preamble.`;

    const res = await fetch('https://api.gateway.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gatewayApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: document },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ success: false, result: `AI request failed: ${errText.slice(0, 200)}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    const content =
      data.choices?.[0]?.message?.content?.trim() ||
      data.content?.[0]?.text?.trim() ||
      'No result returned from AI.';

    return new Response(
      JSON.stringify({ success: true, result: content }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ success: false, result: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
