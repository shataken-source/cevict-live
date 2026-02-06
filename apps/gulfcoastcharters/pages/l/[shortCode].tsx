/**
 * Shortened Link Redirect Page
 * 
 * Route: /l/[shortCode]
 * Tracks link clicks and redirects to original URL
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../src/lib/supabase';
import Head from 'next/head';

export default function ShortLinkPage() {
  const router = useRouter();
  const { shortCode } = router.query;

  useEffect(() => {
    if (!shortCode || typeof shortCode !== 'string') return;

    async function handleRedirect() {
      try {
        // Get the original URL
        const { data: link, error } = await supabase
          .from('shortened_links')
          .select('original_url, id, campaign_id')
          .eq('short_code', shortCode)
          .single();

        if (error || !link) {
          router.push('/');
          return;
        }

        // Track the click
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
        const ipAddress = ''; // Would need server-side to get real IP

        await supabase.from('link_clicks').insert({
          link_id: link.id,
          campaign_id: link.campaign_id,
          user_agent: userAgent,
          ip_address: ipAddress,
        });

        // Update click counts
        const { error: rpcError } = await supabase.rpc('increment_link_clicks', {
          p_link_id: link.id,
        });
        
        if (rpcError) {
          // If RPC doesn't exist, use update
          const { data: currentLink } = await supabase
            .from('shortened_links')
            .select('click_count')
            .eq('id', link.id)
            .single();
          
          if (currentLink) {
            await supabase
              .from('shortened_links')
              .update({ click_count: (currentLink.click_count || 0) + 1 })
              .eq('id', link.id);
          }
        }

        // Redirect to original URL
        window.location.href = link.original_url;
      } catch (error) {
        console.error('Error handling redirect:', error);
        router.push('/');
      }
    }

    handleRedirect();
  }, [shortCode, router]);

  return (
    <>
      <Head>
        <title>Redirecting... - Gulf Coast Charters</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    </>
  );
}
