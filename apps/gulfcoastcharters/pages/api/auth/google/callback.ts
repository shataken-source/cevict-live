/**
 * Google OAuth Callback Handler
 * Handles the OAuth redirect from Google after user authorization
 * GET /api/auth/google/callback?code=xxx
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error } = req.query;

  if (error) {
    // User denied access or error occurred
    return res.redirect(`/dashboard?google_auth_error=${encodeURIComponent(error as string)}`);
  }

  if (!code) {
    return res.redirect('/dashboard?google_auth_error=no_code');
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Build redirect URI from request
  const protocol = req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https');
  const host = req.headers.host || 'localhost:3000';
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    console.error('Google OAuth credentials not configured');
    return res.redirect('/dashboard?google_auth_error=not_configured');
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.redirect(`/dashboard?google_auth_error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token } = tokenData;

    if (!access_token) {
      return res.redirect('/dashboard?google_auth_error=no_access_token');
    }

    // Store tokens in a way the frontend can access them
    // In production, you should store these securely (encrypted in database)
    // For now, we'll pass them via URL hash (not ideal, but works for MVP)
    // Better approach: Store in database with user_id association
    
    // Redirect to dashboard with success
    // The frontend will need to handle storing the token
    return res.redirect(`/dashboard?google_auth_success=1&access_token=${access_token}&refresh_token=${refresh_token || ''}`);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`/dashboard?google_auth_error=${encodeURIComponent(error.message || 'unknown_error')}`);
  }
}
