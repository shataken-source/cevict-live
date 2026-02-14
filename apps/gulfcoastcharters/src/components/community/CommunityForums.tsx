/**
 * Community Forums - uses /api/community/forums, threads, posts
 */

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Category = { category_id: string; name: string; description: string | null };
type Thread = { thread_id: string; title: string; content: string; replies_count: number; created_at: string };
type Post = { post_id: string; content: string; created_at: string };

export default function CommunityForums() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community/forums')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setThreads([]);
      return;
    }
    fetch(`/api/community/forums/threads?categoryId=${selectedCategory}`)
      .then((r) => r.json())
      .then((d) => setThreads(d.threads || []));
  }, [selectedCategory]);

  useEffect(() => {
    if (!selectedThread) {
      setPosts([]);
      return;
    }
    fetch(`/api/community/forums/posts?threadId=${selectedThread}`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []));
  }, [selectedThread]);

  const createThread = async () => {
    if (!selectedCategory || !newThreadTitle.trim() || !newThreadContent.trim()) return;
    await fetch('/api/community/forums/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: selectedCategory, title: newThreadTitle, content: newThreadContent }),
    });
    setNewThreadTitle('');
    setNewThreadContent('');
    if (selectedCategory) {
      fetch(`/api/community/forums/threads?categoryId=${selectedCategory}`)
        .then((r) => r.json())
        .then((d) => setThreads(d.threads || []));
    }
  };

  const createPost = async () => {
    if (!selectedThread || !newPostContent.trim()) return;
    await fetch('/api/community/forums/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: selectedThread, content: newPostContent }),
    });
    setNewPostContent('');
    fetch(`/api/community/forums/posts?threadId=${selectedThread}`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []));
  };

  if (loading) return <p className="text-gray-500">Loading forums...</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-4">
          <h4 className="font-semibold mb-2">Categories</h4>
          <ul className="space-y-1">
            {categories.map((c) => (
              <li key={c.category_id}>
                <button
                  type="button"
                  className={`text-left w-full px-2 py-1 rounded ${selectedCategory === c.category_id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  onClick={() => { setSelectedCategory(c.category_id); setSelectedThread(null); }}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <h4 className="font-semibold mb-2">Threads</h4>
          {selectedCategory && (
            <>
              <div className="mb-3 space-y-2">
                <Input placeholder="Title" value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)} />
                <Textarea placeholder="Content" value={newThreadContent} onChange={(e) => setNewThreadContent(e.target.value)} rows={2} />
                <Button size="sm" onClick={createThread}>New Thread</Button>
              </div>
              <ul className="space-y-1">
                {threads.map((t) => (
                  <li key={t.thread_id}>
                    <button
                      type="button"
                      className={`text-left w-full px-2 py-1 rounded truncate ${selectedThread === t.thread_id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                      onClick={() => setSelectedThread(t.thread_id)}
                    >
                      {t.title} ({t.replies_count})
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <h4 className="font-semibold mb-2">Replies</h4>
          {selectedThread && (
            <>
              <div className="mb-3">
                <Textarea placeholder="Reply..." value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} rows={2} />
                <Button size="sm" className="mt-1" onClick={createPost}>Reply</Button>
              </div>
              <ul className="space-y-2 text-sm">
                {posts.map((p) => (
                  <li key={p.post_id} className="border-l-2 border-gray-200 pl-2">
                    <p className="text-gray-700">{p.content}</p>
                    <span className="text-gray-400 text-xs">{new Date(p.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
