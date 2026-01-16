'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Share2 } from 'lucide-react';

type Platform = 'facebook' | 'x' | 'instagram' | 'nextdoor';

export default function SocialPostButton({ petId }: { petId: string }) {
  const [open, setOpen] = useState(false);
  const [platforms, setPlatforms] = useState<Record<Platform, boolean>>({
    facebook: true,
    x: true,
    instagram: true,
    nextdoor: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const selected = useMemo(
    () => (Object.keys(platforms) as Platform[]).filter((p) => platforms[p]),
    [platforms]
  );

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/petreunion/generate-social-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId, platforms: selected }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || res.statusText);
      }
      setResult(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate post');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
          aria-label="Post to social media"
        >
          <Share2 size={16} />
          Post
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Post to social media</DialogTitle>
          <DialogDescription>
            Generates a share-ready post from the database. We do <strong>not</strong> include phone/email—only the listing link.
            Typos are cleaned up automatically (best-effort).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(platforms) as Platform[]).map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={platforms[p]}
                  onChange={(e) => setPlatforms((prev) => ({ ...prev, [p]: e.target.checked }))}
                />
                {p === 'x' ? 'X (Twitter)' : p[0].toUpperCase() + p.slice(1)}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={loading || selected.length === 0}
              className="rounded-md bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate post'}
            </button>
            {result?.text ? (
              <button
                type="button"
                onClick={() => copy(result.text)}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Copy all
              </button>
            ) : null}
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          {result?.perPlatform ? (
            <div className="space-y-4">
              {(Object.keys(result.perPlatform) as Platform[]).map((p) => {
                const item = result.perPlatform[p];
                return (
                  <div key={p} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="font-semibold text-sm">{p === 'x' ? 'X (Twitter)' : p}</div>
                      <div className="flex gap-2">
                        <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={() => copy(item.text)}>
                          Copy
                        </button>
                        {item.shareUrl ? (
                          <button
                            type="button"
                            className="rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm"
                            onClick={() => window.open(item.shareUrl, '_blank', 'noopener,noreferrer')}
                          >
                            Open share
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap text-xs bg-slate-50 p-2 rounded-md overflow-auto">{item.text}</pre>
                    {item.instructions ? <div className="mt-2 text-xs text-slate-600">{item.instructions}</div> : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => setOpen(false)}>
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

