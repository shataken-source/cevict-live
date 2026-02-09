import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

/**
 * POST /api/twitter/post
 * Body: { "text": "Your tweet text here" }
 * Env: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET
 * App permissions must be Read and Write. See TWITTER_POSTING.md and old-cevict-monorepo/TWITTER-KEYS-SETUP.md
 */
export async function POST(request: Request) {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return NextResponse.json(
      {
        error: 'Twitter API not configured',
        hint: 'Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET in env. See TWITTER_POSTING.md.',
      },
      { status: 503 }
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json(
      { error: 'Body must include "text" (non-empty string)' },
      { status: 400 }
    );
  }

  if (text.length > 280) {
    return NextResponse.json(
      { error: 'Tweet text must be 280 characters or less' },
      { status: 400 }
    );
  }

  try {
    const client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken,
      accessSecret,
    });
    const rwClient = client.readWrite;
    const tweet = await rwClient.v2.tweet({ text });
    return NextResponse.json({
      ok: true,
      id: tweet.data?.id,
      text: tweet.data?.text ?? text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Twitter post error:', err);
    return NextResponse.json(
      { error: 'Failed to post tweet', detail: message },
      { status: 500 }
    );
  }
}
