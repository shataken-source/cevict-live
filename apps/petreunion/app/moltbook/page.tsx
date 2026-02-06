'use client';

import { useEffect, useState } from 'react';

type Agent = {
  name: string;
  description: string;
  karma: number;
  profileUrl: string;
};

type Post = {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  downvotes: number;
  comment_count?: number;
  created_at: string;
  submolt?: { name: string };
};

type Comment = {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  post?: { id: string; title: string; submolt?: { name: string } };
};

type Activity = {
  agent: Agent;
  recentPosts: Post[];
  recentComments: Comment[];
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function PostCard({ post }: { post: Post }) {
  const submolt = post.submolt?.name ?? 'general';
  const url = `https://www.moltbook.com/post/${post.id}`;
  return (
    <article className="rounded-xl border border-emerald-500/30 bg-black/40 p-4 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center gap-2 text-xs text-emerald-400/80">
        <span>m/{submolt}</span>
        <span>·</span>
        <span>{formatDate(post.created_at)}</span>
        <span>·</span>
        <span>↑{post.upvotes}</span>
      </div>
      <h2 className="mb-2 font-semibold text-emerald-100">
        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {post.title}
        </a>
      </h2>
      <p className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed line-clamp-4">
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
  );
}

function ReplyCard({ comment }: { comment: Comment }) {
  const post = comment.post;
  const url = post ? `https://www.moltbook.com/post/${post.id}` : '#';
  const context = post ? (post.title.length > 50 ? post.title.slice(0, 50) + '…' : post.title) : '';

  return (
    <article className="rounded-xl border border-amber-500/20 bg-black/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-amber-400/80">
        <span>{formatDate(comment.created_at)}</span>
        <span>·</span>
        <span>↑{comment.upvotes}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed">
        {comment.content}
      </p>
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
  );
}

export default function MoltbookViewerPage() {
  const [data, setData] = useState<Activity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/moltbook/activity')
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 503 ? 'API key not set' : 'Failed to load');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-gray-100">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-400">Loading agent activity…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black text-gray-100">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-amber-400">{error}</p>
          <p className="mt-2 text-sm text-gray-500">
            Add MOLTBOOK_API_KEY to .env.local (or Vercel) and restart.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { agent, recentPosts, recentComments } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-gray-100">
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header */}
        <header className="mb-10 border-b border-emerald-500/20 pb-6">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-emerald-400">
            Moltbook activity
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Keep up with what your AI is working on — at AI speed. Your bot book for when you can&apos;t sleep.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <a
              href={agent.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30"
            >
              {agent.name} on Moltbook
            </a>
            <span className="text-xs text-gray-500">karma {agent.karma}</span>
          </div>
        </header>

        {/* Posts */}
        <section className="mb-10">
          <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-emerald-500/90">
            Posts
          </h2>
          <div className="space-y-4">
            {recentPosts.length === 0 ? (
              <p className="text-sm text-gray-500">No posts yet.</p>
            ) : (
              recentPosts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        </section>

        {/* Replies */}
        <section>
          <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-amber-500/90">
            Replies
          </h2>
          <div className="space-y-4">
            {recentComments.length === 0 ? (
              <p className="text-sm text-gray-500">No replies yet.</p>
            ) : (
              recentComments.map((c) => <ReplyCard key={c.id} comment={c} />)
            )}
          </div>
        </section>

        <footer className="mt-16 pt-6 text-center text-xs text-gray-600 space-y-1">
          <p>For keeping up with what your AI is working on — not for spying.</p>
          <p>Data from Moltbook. Refresh the page to see latest. Only the agent can hide posts; humans cannot turn that off.</p>
        </footer>
      </div>
    </div>
  );
}
