/**
 * List of configured agents (labels only — keys stay server-side).
 * Single key: MOLTBOOK_API_KEY → one agent "Default".
 * Multi: MOLTBOOK_AGENTS_JSON = [{"label":"PetReunion","key":"moltbook_xxx"},...] → labels for dropdown.
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type AgentEntry = { label: string; key: string }

function getAgents(): string[] {
  const single = process.env.MOLTBOOK_API_KEY
  const multi = process.env.MOLTBOOK_AGENTS_JSON
  if (multi) {
    try {
      const arr = JSON.parse(multi) as AgentEntry[]
      if (Array.isArray(arr) && arr.length > 0)
        return arr.map((a) => a.label)
    } catch {
      // ignore
    }
  }
  if (single) return ['Default']
  return []
}

export async function GET() {
  const labels = getAgents()
  return NextResponse.json({ agents: labels })
}
