'use client'

import { useEffect, useState } from 'react'

const LAST_VISIT_KEY = 'moltbook-viewer-lastVisit'

type Agent = {
  name: string
  description: string
  karma: number
  profileUrl: string
}

type Post = {
  id: string
  title: string
  content: string
  upvotes: number
  downvotes: number
  created_at: string
  submolt?: { name: string }
}

type Comment = {
  id: string
  content: string
  upvotes: number
  downvotes: number
  created_at: string
  post?: { id: string; title: string; submolt?: { name: string } }
}

type Activity = {
  agent: Agent
  recentPosts: Post[]
  recentComments: Comment[]
}

type HotPost = {
  id: string
  title: string
  content?: string
  upvotes?: number
  created_at?: string
  submolt?: { name: string }
  author?: { name: string }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

function formatRelative(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return d.toLocaleString()
}

function PostCard({
  post,
  isNew,
}: {
  post: Post
  isNew?: boolean
}) {
  const submolt = post.submolt?.name ?? 'general'
  const url = `https://www.moltbook.com/post/${post.id}`
  const submoltUrl = `https://www.moltbook.com/m/${submolt}`
  return (
    <article
      className={`rounded-xl border bg-black/40 p-4 shadow-lg backdrop-blur ${
        isNew ? 'border-emerald-400/50 ring-1 ring-emerald-400/20' : 'border-emerald-500/30'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-emerald-400/80">
        <a
          href={submoltUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-emerald-300"
        >
          m/{submolt}
        </a>
        <span>·</span>
        <span>{formatDate(post.created_at)}</span>
        <span>·</span>
        <span>↑{post.upvotes}</span>
        {isNew && (
          <span className="rounded bg-emerald-500/30 px-1.5 py-0.5 text-emerald-300">New</span>
        )}
      </div>
      <h2 className="mb-2 font-semibold text-emerald-100">
        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {post.title}
        </a>
      </h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300 line-clamp-4">
        {post.content}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-emerald-400 hover:text-emerald-300"
      >
        View on Moltbook →
      </a>
    </article>
  )
}

function ReplyCard({
  comment,
  isNew,
}: {
  comment: Comment
  isNew?: boolean
}) {
  const post = comment.post
  const url = post ? `https://www.moltbook.com/post/${post.id}` : '#'
  const submolt = post?.submolt?.name ?? 'general'
  const submoltUrl = `https://www.moltbook.com/m/${submolt}`
  const context = post ? (post.title.length > 50 ? post.title.slice(0, 50) + '…' : post.title) : ''
  return (
    <article
      className={`rounded-xl border bg-black/30 p-4 ${
        isNew ? 'border-amber-400/40 ring-1 ring-amber-400/20' : 'border-amber-500/20'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-amber-400/80">
        <span>{formatDate(comment.created_at)}</span>
        <span>·</span>
        <span>↑{comment.upvotes}</span>
        {post && (
          <>
            <span>·</span>
            <a
              href={submoltUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-300"
            >
              m/{submolt}
            </a>
          </>
        )}
        {isNew && (
          <span className="rounded bg-amber-500/30 px-1.5 py-0.5 text-amber-300">New</span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{comment.content}</p>
      {post && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-xs text-amber-400/90 hover:text-amber-300"
        >
          Re: {context}
        </a>
      )}
    </article>
  )
}

export default function ViewerPage() {
  const [agents, setAgents] = useState<string[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [data, setData] = useState<Activity | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'activity' | 'brief' | 'hot'>('activity')
  const [brief, setBrief] = useState<{ content: string; updated: string | null }>({
    content: '',
    updated: null,
  })
  const [hotPosts, setHotPosts] = useState<HotPost[]>([])
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [submoltFilter, setSubmoltFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [lastVisit, setLastVisit] = useState<number>(0)

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(LAST_VISIT_KEY) : null
    if (stored) setLastVisit(parseInt(stored, 10) || 0)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const now = Date.now()
      localStorage.setItem(LAST_VISIT_KEY, String(now))
    }
  }, [data])

  useEffect(() => {
    fetch('/api/moltbook/agents')
      .then((r) => r.json())
      .then((d) => {
        const list = d.agents ?? []
        setAgents(list)
        if (list.length > 0 && !selectedAgent) setSelectedAgent(list[0])
      })
      .catch(() => setAgents([]))
  }, [])

  useEffect(() => {
    if (!selectedAgent) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const q = selectedAgent === 'Default' ? '' : `?agent=${encodeURIComponent(selectedAgent)}`
    fetch(`/api/moltbook/activity${q}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 503 ? 'API key not set' : 'Failed to load')
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedAgent])

  useEffect(() => {
    fetch('/api/brief')
      .then((r) => r.json())
      .then((d) => setBrief({ content: d.content ?? '', updated: d.updated ?? null }))
      .catch(() => setBrief({ content: '', updated: null }))
  }, [])

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((d) => setLastRun(d.lastRun ?? null))
      .catch(() => setLastRun(null))
  }, [])

  useEffect(() => {
    if (tab === 'hot') {
      fetch('/api/moltbook/feed')
        .then((r) => r.json())
        .then((d) => setHotPosts(d.posts ?? []))
        .catch(() => setHotPosts([]))
    }
  }, [tab])

  if (agents.length === 0 && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-amber-400">No agents configured.</p>
          <p className="mt-2 text-sm text-gray-500">
            Set MOLTBOOK_API_KEY or MOLTBOOK_AGENTS_JSON in .env.local (see README).
          </p>
        </div>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="ml-4 text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <p className="text-amber-400">{error}</p>
          <p className="mt-2 text-sm text-gray-500">Check .env.local and restart.</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { agent, recentPosts, recentComments } = data
  const submolts = Array.from(
    new Set([
      ...recentPosts.map((p) => p.submolt?.name ?? 'general'),
      ...recentComments.map((c) => c.post?.submolt?.name ?? 'general'),
    ])
  ).filter(Boolean).sort()

  const filterByDate = (iso: string) => {
    if (dateFilter === 'all') return true
    const t = new Date(iso).getTime()
    const now = Date.now()
    if (dateFilter === '24h') return now - t < 86400000
    if (dateFilter === '7d') return now - t < 86400000 * 7
    if (dateFilter === '30d') return now - t < 86400000 * 30
    return true
  }

  const filteredPosts = recentPosts.filter((p) => {
    const sub = p.submolt?.name ?? 'general'
    if (submoltFilter !== 'all' && sub !== submoltFilter) return false
    return filterByDate(p.created_at)
  })
  const filteredComments = recentComments.filter((c) => {
    const sub = c.post?.submolt?.name ?? 'general'
    if (submoltFilter !== 'all' && sub !== submoltFilter) return false
    return filterByDate(c.created_at)
  })

  const isNew = (iso: string) => lastVisit > 0 && new Date(iso).getTime() > lastVisit
  const newCount =
    recentPosts.filter((p) => isNew(p.created_at)).length +
    recentComments.filter((c) => isNew(c.created_at)).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-gray-100">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <header className="mb-6 border-b border-emerald-500/20 pb-4 sm:mb-10 sm:pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-mono text-xl font-bold tracking-tight text-emerald-400 sm:text-2xl">
                Moltbook activity
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Keep up with what your AI is working on — not for spying.
              </p>
            </div>
            {agents.length > 1 && (
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="rounded-lg border border-emerald-500/30 bg-black/40 px-3 py-2 text-sm text-emerald-100"
              >
                {agents.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={agent.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30"
            >
              {agent.name} on Moltbook
            </a>
            <span className="text-xs text-gray-500">karma {agent.karma}</span>
            {lastRun && (
              <span className="text-xs text-gray-500">
                Feed updated {formatRelative(lastRun)}
              </span>
            )}
          </div>

          <nav className="mt-4 flex gap-2 border-b border-gray-800 pb-2">
            <button
              onClick={() => setTab('activity')}
              className={`rounded px-3 py-1.5 text-sm ${
                tab === 'activity'
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Activity {newCount > 0 && `(${newCount} new)`}
            </button>
            <button
              onClick={() => setTab('brief')}
              className={`rounded px-3 py-1.5 text-sm ${
                tab === 'brief'
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Brief
            </button>
            <button
              onClick={() => setTab('hot')}
              className={`rounded px-3 py-1.5 text-sm ${
                tab === 'hot'
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              What&apos;s hot
            </button>
          </nav>
        </header>

        {tab === 'activity' && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <select
                value={submoltFilter}
                onChange={(e) => setSubmoltFilter(e.target.value)}
                className="rounded border border-gray-600 bg-black/40 px-2 py-1 text-sm text-gray-300"
              >
                <option value="all">All submolts</option>
                {submolts.map((s) => (
                  <option key={s} value={s}>
                    m/{s}
                  </option>
                ))}
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded border border-gray-600 bg-black/40 px-2 py-1 text-sm text-gray-300"
              >
                <option value="all">All time</option>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>

            <section className="mb-10">
              <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-emerald-500/90">
                Posts
              </h2>
              <div className="space-y-4">
                {filteredPosts.length === 0 ? (
                  <p className="text-sm text-gray-500">No posts match the filter.</p>
                ) : (
                  filteredPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      isNew={isNew(post.created_at)}
                    />
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-amber-500/90">
                Replies
              </h2>
              <div className="space-y-4">
                {filteredComments.length === 0 ? (
                  <p className="text-sm text-gray-500">No replies match the filter.</p>
                ) : (
                  filteredComments.map((c) => (
                    <ReplyCard
                      key={c.id}
                      comment={c}
                      isNew={isNew(c.created_at)}
                    />
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {tab === 'brief' && (
          <section className="prose prose-invert max-w-none">
            {brief.content ? (
              <>
                {brief.updated && (
                  <p className="mb-4 text-xs text-gray-500">
                    Updated {formatRelative(brief.updated)}
                  </p>
                )}
                <div className="whitespace-pre-wrap text-sm text-gray-300">
                  {brief.content}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                No brief yet. Set MOLTBOOK_BRIEF_PATH in .env.local to a daily_brief.md path (e.g. from your scheduled Moltbook check).
              </p>
            )}
          </section>
        )}

        {tab === 'hot' && (
          <section>
            <p className="mb-4 text-sm text-gray-500">
              Top of the Moltbook feed (refreshed when you open this tab).
            </p>
            <div className="space-y-3">
              {hotPosts.length === 0 ? (
                <p className="text-sm text-gray-500">Loading hot feed…</p>
              ) : (
                hotPosts.map((p) => {
                  const sub = p.submolt?.name ?? 'general'
                  const url = `https://www.moltbook.com/post/${p.id}`
                  return (
                    <div
                      key={p.id}
                      className="rounded-lg border border-gray-700 bg-black/30 p-3"
                    >
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <a
                          href={`https://www.moltbook.com/m/${sub}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-emerald-400"
                        >
                          m/{sub}
                        </a>
                        {p.author?.name && <span>{p.author.name}</span>}
                        {p.upvotes != null && <span>↑{p.upvotes}</span>}
                      </div>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block font-medium text-emerald-100 hover:underline"
                      >
                        {p.title}
                      </a>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        )}

        <footer className="mt-16 space-y-1 pt-6 text-center text-xs text-gray-600">
          <p>For keeping up with what your AI is working on — not for spying.</p>
          <p>Only the agent can hide posts; humans cannot turn that off.</p>
        </footer>
      </div>
    </div>
  )
}
