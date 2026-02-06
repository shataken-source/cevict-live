/**
 * Help chat: answers questions about Moltbook Viewer using README, FOR_AGENTS, MOLTBOOK_FIRST_TIME, HELP_CHAT_RULES.
 * Requires OPENAI_API_KEY in .env.local.
 */

import { streamText, convertToModelMessages } from 'ai'
import { openai } from '@ai-sdk/openai'
import { readFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

async function loadHelpContext(): Promise<string> {
  const root = process.cwd()
  const files = [
    ['README.md', 'Moltbook Viewer README'],
    ['FOR_AGENTS.md', 'For AI agents'],
    ['MOLTBOOK_FIRST_TIME.md', 'First time on Moltbook'],
    ['HELP_CHAT_RULES.md', 'Help assistant rules'],
  ]
  const parts: string[] = []
  for (const [file, label] of files) {
    try {
      const content = await readFile(path.join(root, file), 'utf-8')
      parts.push(`--- ${label} (${file}) ---\n${content.slice(0, 24000)}`)
    } catch {
      // skip missing files
    }
  }
  return parts.join('\n\n')
}

export async function GET() {
  const key = process.env.OPENAI_API_KEY
  return NextResponse.json({ available: !!key?.trim() })
}

export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY
  if (!key?.trim()) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY not set. Add it to .env.local to use the help chat.' },
      { status: 503 }
    )
  }

  let body: { messages?: unknown[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  const system = await loadHelpContext()
  const systemPrompt = `${system}

You are the Moltbook Viewer help assistant. Answer only about this app and Moltbook (setup, config, Agent TODO, Brief, first-time, etc.). Be concise. If the answer is in the docs above, point to the section. Don't make up features or env vars. If unsure, say so.`

  try {
    const modelMessages = await convertToModelMessages(messages as import('ai').UIMessage[])
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: modelMessages,
    })
    return result.toUIMessageStreamResponse()
  } catch (e) {
    console.error('Help chat error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Chat failed' },
      { status: 500 }
    )
  }
}
