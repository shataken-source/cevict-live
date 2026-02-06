/**
 * Blog Post Detail Page
 * 
 * Route: /blog/[id]
 * Displays individual blog post content
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { Card, CardContent } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Badge } from '../../src/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../src/components/ui/avatar';
import { 
  ArrowLeft, ArrowRight, Calendar, User, Clock, Share2,
  Tag, BookOpen 
} from 'lucide-react';
import { toast } from 'sonner';

type BlogPost = {
  id: string;
  title: string;
  content: string;
  author: string;
  author_avatar?: string;
  published_at: string;
  category: string;
  tags: string[];
  image_url?: string;
  views?: number;
  read_time?: number;
};

export default function BlogPostPage() {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function loadPost() {
      try {
        setLoading(true);
        
        // Load blog post from database
        const { data: postData, error: postError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .eq('published', true)
          .single();

        if (postError && postError.code !== 'PGRST116') {
          console.error('Blog post error:', postError);
          setPost(null);
        } else if (postData) {
          setPost({
            id: postData.id,
            title: postData.title,
            content: postData.content,
            author: postData.author || 'Gulf Coast Charters',
            author_avatar: postData.author_avatar,
            published_at: postData.published_at,
            category: postData.category || 'General',
            tags: postData.tags || [],
            image_url: postData.image_url,
            views: postData.views || 0,
            read_time: postData.read_time || 5,
          });
        } else {
          setPost(null);
        }

      } catch (error: any) {
        console.error('Error loading blog post:', error);
        setPost(null);
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [id]);

  const handleShare = () => {
    if (navigator.share && post) {
      navigator.share({
        title: post.title,
        text: post.title,
        url: window.location.href,
      }).catch(() => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout session={null}>
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
            <p className="text-gray-600 mb-6">The article you're looking for doesn't exist.</p>
            <Link href="/blog">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout session={null}>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Back Button */}
        <Link href="/blog">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Button>
        </Link>

        {/* Article Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">{post.category}</Badge>
            {post.views && post.views > 500 && (
              <Badge variant="secondary">Popular</Badge>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.author_avatar} />
                <AvatarFallback>{getInitials(post.author)}</AvatarFallback>
              </Avatar>
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(post.published_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{post.read_time} min read</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>

        {/* Featured Image */}
        {post.image_url && (
          <div className="mb-6 h-96 bg-gray-200 rounded-lg overflow-hidden">
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Article Content */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: post.content
                  .split('\n')
                  .map(line => {
                    if (line.startsWith('# ')) {
                      return `<h1>${line.substring(2)}</h1>`;
                    } else if (line.startsWith('## ')) {
                      return `<h2>${line.substring(3)}</h2>`;
                    } else if (line.startsWith('### ')) {
                      return `<h3>${line.substring(4)}</h3>`;
                    } else if (line.startsWith('- ')) {
                      return `<li>${line.substring(2)}</li>`;
                    } else if (line.trim() === '') {
                      return '<br />';
                    } else {
                      return `<p>${line}</p>`;
                    }
                  })
                  .join('')
              }}
            />
          </CardContent>
        </Card>

        {/* Tags */}
        {post.tags.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-5 h-5 text-gray-500" />
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-gray-100">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Related Posts */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Related Articles</h3>
            <div className="space-y-2">
              <p className="text-gray-600 text-sm">
                Related articles will appear here based on category and tags.
              </p>
              <Link href="/blog">
                <Button variant="outline" className="w-full">
                  Browse All Articles
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

// Add supabase import
import { supabase } from '../../src/lib/supabase';
