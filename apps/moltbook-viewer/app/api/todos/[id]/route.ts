/**
 * PATCH: toggle done. DELETE: remove todo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadTodos, saveTodos } from '@/app/lib/todos-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const todos = await loadTodos()
    const idx = todos.findIndex((t) => t.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    todos[idx].done = !todos[idx].done
    await saveTodos(todos)
    return NextResponse.json({ todo: todos[idx], todos })
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    const todos = await loadTodos()
    const next = todos.filter((t) => t.id !== id)
    if (next.length === todos.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await saveTodos(next)
    return NextResponse.json({ todos: next })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
