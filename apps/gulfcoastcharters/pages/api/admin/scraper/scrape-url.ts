import type { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../_lib/rbac';
import { getSupabaseAdmin } from '../../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ok = await requireRole(req, res, ['admin']);
  if (!ok) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const admin = getSupabaseAdmin();

  try {
    console.log('[Manual URL Scraper] Invoking Edge Function for URL:', url.trim());
    
    // Call the Edge Function with a special mode for single URL scraping
    const { data, error } = await admin.functions.invoke('enhanced-smart-scraper', {
      body: {
        mode: 'manual_url',
        url: url.trim(),
      },
    });

    console.log('[Manual URL Scraper] Edge Function response:', { data, error });

    if (error) {
      let errorBody = null;
      try {
        if (error.context && error.context instanceof Response) {
          errorBody = await error.context.text();
          try {
            errorBody = JSON.parse(errorBody);
          } catch {
            // Keep as text if not JSON
          }
        }
      } catch (e) {
        // Ignore errors reading body
      }

      console.error('[Manual URL Scraper] Error:', {
        message: error.message,
        status: error.context?.status,
        errorBody: errorBody,
      });
      
      return res.status(502).json({ 
        error: error.message || 'Scraping failed',
        details: errorBody || error.context || error,
      });
    }

    // The Edge Function returns { success: true, boat, validation }
    // So data should already have the boat and validation
    console.log('[Manual URL Scraper] Success - boat data:', data?.boat ? 'present' : 'missing');
    
    return res.status(200).json(data || { success: true, boat: null, error: 'No data returned' });
  } catch (e: any) {
    console.error('[Manual URL Scraper] Exception:', e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
