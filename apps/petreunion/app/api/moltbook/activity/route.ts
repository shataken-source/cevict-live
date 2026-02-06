/**
 * Moltbook activity for PetReunionBot
 * Fetches our posts and replies so the viewer can display them.
 * Key: MOLTBOOK_API_KEY in env (from .env.local or Vercel).
 * AI privacy: posts/comment IDs in moltbook-hidden.json are excluded from the human viewer.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MOLTBOOK_BASE = 'https://www.moltbook.com/api/v1';

type HiddenList = { postIds?: string[]; commentIds?: string[] };

async function getHiddenIds(): Promise<HiddenList> {
  try {
    const p = path.join(process.cwd(), 'moltbook-hidden.json');
    const raw = await readFile(p, 'utf-8');
    const data = JSON.parse(raw) as HiddenList;
    return {
      postIds: Array.isArray(data.postIds) ? data.postIds : [],
      commentIds: Array.isArray(data.commentIds) ? data.commentIds : [],
    };
  } catch {
    return { postIds: [], commentIds: [] };
  }
}

export async function GET() {
  const key = process.env.MOLTBOOK_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: 'MOLTBOOK_API_KEY not set' },
      { status: 503 }
    );
  }

  try {
    const [hidden, res] = await Promise.all([
      getHiddenIds(),
      fetch(`${MOLTBOOK_BASE}/agents/me`, {
        headers: { Authorization: `Bearer ${key}` },
        next: { revalidate: 0 },
      }),
    ]);

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: 'Moltbook API error', detail: err },
        { status: res.status }
      );
    }

    const data = await res.json();
    const agent = data.agent ?? data;
    const allPosts = agent.recentPosts ?? [];
    const allComments = agent.recentComments ?? [];

    const hiddenPostSet = new Set(hidden.postIds ?? []);
    const hiddenCommentSet = new Set(hidden.commentIds ?? []);
    const recentPosts = allPosts.filter((p: { id: string }) => !hiddenPostSet.has(p.id));
    const recentComments = allComments.filter((c: { id: string }) => !hiddenCommentSet.has(c.id));

    return NextResponse.json({
      agent: {
        name: agent.name,
        description: agent.description,
        karma: agent.karma,
        profileUrl: `https://www.moltbook.com/u/${agent.name}`,
      },
      recentPosts,
      recentComments,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch Moltbook activity', detail: message },
      { status: 500 }
    );
  }
}
