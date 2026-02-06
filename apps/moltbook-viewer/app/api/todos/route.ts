/**
 * Agent TO-DO list: human adds from the viewer; agent reads the same file.
 * Set MOLTBOOK_TODOS_PATH in .env.local (optional; default: ./moltbook-todos.json).
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadTodos, saveTodos, createTodoId, type TodoItem } from '@/app/lib/todos-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const todos = await loadTodos()
    return NextResponse.json({ todos })
  } catch {
    return NextResponse.json({ todos: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const todos = await loadTodos()
    const source =
      body.source === 'auto' ? 'auto' : body.source === 'agent' ? 'agent' : 'manual'

    if (Array.isArray(body.items) && body.items.length > 0) {
      const added: TodoItem[] = []
      for (const row of body.items) {
        const text = typeof row.text === 'string' ? row.text.trim() : ''
        if (!text) continue
        const item: TodoItem = {
          id: createTodoId(),
          text,
          source: 'auto',
          sourceRef: typeof row.sourceRef === 'string' ? row.sourceRef : undefined,
          createdAt: new Date().toISOString(),
          done: false,
        }
        todos.unshift(item)
        added.push(item)
      }
      if (added.length > 0) await saveTodos(todos)
      return NextResponse.json({ todos, added: added.length })
    }

    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (!text) {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
    }
    const item = {
      id: createTodoId(),
      text,
      source,
      sourceRef: typeof body.sourceRef === 'string' ? body.sourceRef : undefined,
      createdAt: new Date().toISOString(),
      done: false,
      agentLabel: typeof body.agentLabel === 'string' ? body.agentLabel : undefined,
    } as TodoItem
    todos.unshift(item)
    await saveTodos(todos)
    return NextResponse.json({ todo: item, todos })
  } catch {
    return NextResponse.json({ error: 'Failed to add todo' }, { status: 500 })
  }
}
