/**
 * Activity Feed (The Stream) - uses /api/community/feed
 * Supports photo uploads and all charter types (fishing, dolphin, kayak, party, etc.)
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Flame, ThumbsUp, ImagePlus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type FeedPost = {
  feed_id: string;
  user_id: string;
  content_type: string;
  title: string | null;
  content: string | null;
  media_urls: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

const POST_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'trip_report', label: 'Trip Report' },
  { value: 'trip_moment', label: 'Trip Moment' },
  { value: 'catch_post', label: 'Catch Post' },
  { value: 'dolphin_watch', label: 'Dolphin Watch' },
  { value: 'sunset_cruise', label: 'Sunset Cruise' },
  { value: 'party_trip', label: 'Party Trip' },
  { value: 'kayak_trip', label: 'Kayak / Paddle' },
  { value: 'honeymoon_charter', label: 'Honeymoon / Romantic' },
  { value: 'pro_tip', label: 'Pro Tip' },
  { value: 'question', label: 'Question' },
  { value: 'gear_recommendation', label: 'Gear Recommendation' },
];

export default function ActivityFeed() {
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('trip_report');
  const [posting, setPosting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaTier, setMediaTier] = useState<'free' | 'pro' | 'captain'>('free');
  const [maxPhotosPerPost, setMaxPhotosPerPost] = useState(5);

  const loadMediaTier = async () => {
    try {
      const res = await fetch('/api/user/media-tier');
      const data = await res.json();
      setMediaTier(data.tier || 'free');
      setMaxPhotosPerPost(data.limits?.photos?.max_per_post ?? 5);
    } catch {
      setMaxPhotosPerPost(5);
    }
  };

  useEffect(() => {
    loadMediaTier();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/community/feed?limit=30');
      const data = await res.json();
      if (data.feed) setFeed(data.feed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleEngage = async (feedId: string, type: string) => {
    try {
      await fetch('/api/community/feed/engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedId, engagementType: type }),
      });
      loadFeed();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const allowed = files.filter(f => f.type.startsWith('image/'));
    const max = maxPhotosPerPost;
    const total = selectedFiles.length + allowed.length;
    const toAdd = total > max ? allowed.slice(0, max - selectedFiles.length) : allowed;
    if (toAdd.length === 0) return;
    setSelectedFiles(prev => [...prev, ...toAdd].slice(0, max));
    const newUrls = toAdd.map(f => URL.createObjectURL(f));
    setPreviewUrls(prev => [...prev, ...newUrls].slice(0, max));
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePost = async () => {
    if (!postContent.trim() && selectedFiles.length === 0) return;
    setPosting(true);
    try {
      let mediaUrls: string[] = [];
      if (selectedFiles.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const uid = user?.id ?? 'anon';
        const prefix = `feed/${uid}/${Date.now()}`;
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `${prefix}-${i}.${ext}`;
          const { error } = await supabase.storage.from('trip-photos').upload(path, file, { contentType: file.type });
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from('trip-photos').getPublicUrl(path);
          mediaUrls.push(publicUrl);
        }
      }
      await fetch('/api/community/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: postType,
          content: postContent.trim() || null,
          mediaUrls: mediaUrls.length ? mediaUrls : undefined,
        }),
      });
      setPostContent('');
      setSelectedFiles([]);
      setPreviewUrls(prev => {
        prev.forEach(u => URL.revokeObjectURL(u));
        return [];
      });
      loadFeed();
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Post to the Stream</h3>
        </CardHeader>
        <CardContent className="space-y-2">
          <select
            aria-label="Post type"
            value={postType}
            onChange={(e) => setPostType(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {POST_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Textarea
            placeholder="Share with the community..."
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            rows={3}
            className="w-full"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              aria-label="Add photos to post"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <ImagePlus className="w-4 h-4 mr-1" /> Add photos ({selectedFiles.length}/{maxPhotosPerPost})
            </Button>
            {previewUrls.map((url, i) => (
              <div key={i} className="relative inline-block">
                <img src={url} alt="" className="w-14 h-14 object-cover rounded border" />
                <button type="button" className="absolute -top-1 -right-1 rounded-full bg-destructive text-destructive-foreground p-0.5" onClick={() => removePhoto(i)} aria-label="Remove">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <Button
            onClick={handlePost}
            disabled={posting || (!postContent.trim() && selectedFiles.length === 0)}
          >
            {posting ? 'Posting...' : 'Post'}
          </Button>
        </CardContent>
      </Card>

      <h3 className="text-lg font-semibold">The Stream</h3>
      {loading ? (
        <p className="text-gray-500">Loading feed...</p>
      ) : feed.length === 0 ? (
        <p className="text-gray-500">No posts yet. Be the first to post!</p>
      ) : (
        <div className="space-y-4">
          {feed.map((post) => (
            <Card key={post.feed_id}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span className="font-medium text-gray-700">{post.content_type.replace('_', ' ')}</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                {post.title && <h4 className="font-semibold mb-1">{post.title}</h4>}
                <p className="text-gray-700 whitespace-pre-wrap">{post.content || ''}</p>
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {post.media_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block" title="View full size">
                        <img src={url} alt="Post attachment" className="w-24 h-24 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                )}
                <div className="flex gap-4 mt-3">
                  <Button variant="ghost" size="sm" onClick={() => handleEngage(post.feed_id, 'like')}>
                    <Heart className="w-4 h-4 mr-1" /> {post.likes_count}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="w-4 h-4 mr-1" /> {post.comments_count}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEngage(post.feed_id, 'hot')}>
                    <Flame className="w-4 h-4 mr-1" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEngage(post.feed_id, 'helpful')}>
                    <ThumbsUp className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
