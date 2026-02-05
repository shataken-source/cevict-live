/**
 * Moltbook activity for one agent. ?agent=Label (or Default).
 * Keys from MOLTBOOK_API_KEY (Default) or MOLTBOOK_AGENTS_JSON.
 * AI privacy: moltbook-hidden.json can be per-agent (AgentName: { postIds, commentIds }) or flat.
 */

import { readFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MOLTBOOK_BASE = 'https://www.moltbook.com/api/v1'

type AgentEntry = { label: string; key: string }
type HiddenList = { postIds?: string[]; commentIds?: string[] }
type HiddenFile = HiddenList | Record<string, HiddenList>

function getKey(agentLabel: string | null): string | null {
  const multi = process.env.MOLTBOOK_AGENTS_JSON
  if (multi) {
    try {
      const arr = JSON.parse(multi) as AgentEntry[]
      if (Array.isArray(arr)) {
        const entry = agentLabel
          ? arr.find((a) => a.label === agentLabel)
          : arr[0]
        if (entry?.key) return entry.key
      }
    } catch {
      // ignore
    }
  }
  if (!agentLabel || agentLabel === 'Default')
    return process.env.MOLTBOOK_API_KEY ?? null
  return null
}

async function getHiddenForAgent(agentName: string): Promise<HiddenList> {
  try {
    const p = path.join(process.cwd(), 'moltbook-hidden.json')
    const raw = await readFile(p, 'utf-8')
    const data = JSON.parse(raw) as HiddenFile
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if ('postIds' in data && Array.isArray(data.postIds))
        return {
          postIds: data.postIds,
          commentIds: Array.isArray(data.commentIds) ? data.commentIds : [],
        }
      const per = (data as Record<string, HiddenList>)[agentName]
      if (per)
        return {
          postIds: Array.isArray(per.postIds) ? per.postIds : [],
          commentIds: Array.isArray(per.commentIds) ? per.commentIds : [],
        }
    }
  } catch {
    // no file or invalid
  }
  return { postIds: [], commentIds: [] }
}

export async function GET(request: NextRequest) {
  const agentParam = request.nextUrl.searchParams.get('agent') || 'Default'
  const key = getKey(agentParam)
  if (!key) {
    return NextResponse.json(
      { error: 'No API key. Set MOLTBOOK_API_KEY or MOLTBOOK_AGENTS_JSON.' },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(`${MOLTBOOK_BASE}/agents/me`, {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json(
        { error: 'Moltbook API error', detail: err },
        { status: res.status }
      )
    }

    const data = await res.json()
    const agent = data.agent ?? data
    const agentName = agent.name as string
    const hidden = await getHiddenForAgent(agentName)
    const allPosts = agent.recentPosts ?? []
    const allComments = agent.recentComments ?? []

    const hiddenPostSet = new Set(hidden.postIds ?? [])
    const hiddenCommentSet = new Set(hidden.commentIds ?? [])
    const recentPosts = allPosts.filter((p: { id: string }) => !hiddenPostSet.has(p.id))
    const recentComments = allComments.filter((c: { id: string }) => !hiddenCommentSet.has(c.id))

    return NextResponse.json({
      agent: {
        name: agent.name,
        description: agent.description,
        karma: agent.karma,
        profileUrl: `https://www.moltbook.com/u/${agent.name}`,
      },
      recentPosts,
      recentComments,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch Moltbook activity', detail: message },
      { status: 500 }
    )
  }
}
