import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'

export type TodoItem = {
  id: string
  text: string
  source: 'manual' | 'auto' | 'agent'
  sourceRef?: string
  createdAt: string
  done: boolean
  agentLabel?: string
}

export function getTodosPath(): string {
  const raw = process.env.MOLTBOOK_TODOS_PATH
  if (raw?.trim()) {
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw)
  }
  return path.resolve(process.cwd(), 'moltbook-todos.json')
}

export async function loadTodos(): Promise<TodoItem[]> {
  const filePath = getTodosPath()
  try {
    const data = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed.todos) ? parsed.todos : []
  } catch {
    return []
  }
}

export async function saveTodos(todos: TodoItem[]) {
  const filePath = getTodosPath()
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify({ todos }, null, 2), 'utf-8')
}

export function createTodoId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
