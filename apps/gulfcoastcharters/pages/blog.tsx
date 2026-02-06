/**
 * Blog/News Page
 * 
 * Route: /blog
 * Displays blog posts and news articles
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Badge } from '../src/components/ui/badge';
import { Input } from '../src/components/ui/input';
import { 
  BookOpen, Search, Calendar, User, Tag,
  ArrowRight, TrendingUp, Clock, ArrowLeft
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
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

export default function BlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true);
        
        // Load blog posts from database
        const { data: postsData, error: postsError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('published', true)
          .order('published_at', { ascending: false })
          .limit(50);

        if (postsError && postsError.code !== 'PGRST116') {
          console.error('Blog posts error:', postsError);
          setPosts(createMockPosts());
        } else if (postsData) {
          setPosts(postsData.map((p: any) => ({
            id: p.id,
            title: p.title,
            excerpt: p.excerpt || p.content?.substring(0, 150) + '...',
            content: p.content,
            author: p.author || 'Gulf Coast Charters',
            author_avatar: p.author_avatar,
            published_at: p.published_at,
            category: p.category || 'General',
            tags: p.tags || [],
            image_url: p.image_url,
            views: p.views || 0,
            read_time: p.read_time || 5,
          })));
        } else {
          setPosts(createMockPosts());
        }

      } catch (error: any) {
        console.error('Error loading blog posts:', error);
        setPosts(createMockPosts());
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, []);

  const createMockPosts = (): BlogPost[] => {
    return [
      {
        id: '1',
        title: 'Best Fishing Spots on the Gulf Coast',
        excerpt: 'Discover the top fishing locations along the Gulf Coast and what makes each spot unique for different types of fishing.',
        content: 'Full article content...',
        author: 'Captain Mike',
        published_at: new Date(Date.now() - 86400000).toISOString(),
        category: 'Fishing Tips',
        tags: ['fishing', 'gulf coast', 'spots'],
        views: 1250,
        read_time: 5,
      },
      {
        id: '2',
        title: 'What to Bring on Your First Charter',
        excerpt: 'A comprehensive guide to packing for your first fishing charter, including essential items and what to leave at home.',
        content: 'Full article content...',
        author: 'Sarah Johnson',
        published_at: new Date(Date.now() - 172800000).toISOString(),
        category: 'Getting Started',
        tags: ['packing', 'first-time', 'tips'],
        views: 980,
        read_time: 4,
      },
      {
        id: '3',
        title: 'Understanding Gulf Coast Weather Patterns',
        excerpt: 'Learn how weather affects fishing conditions and how to read weather forecasts for the best charter experience.',
        content: 'Full article content...',
        author: 'Weather Expert',
        published_at: new Date(Date.now() - 259200000).toISOString(),
        category: 'Weather',
        tags: ['weather', 'safety', 'forecasting'],
        views: 756,
        read_time: 6,
      },
    ];
  };

  const categories = ['all', ...Array.from(new Set(posts.map(p => p.category)))];

  const filteredPosts = posts.filter(post => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query)) ||
        post.category.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && post.category !== selectedCategory) {
      return false;
    }

    return true;
  });

  const featuredPost = filteredPosts[0];
  const regularPosts = filteredPosts.slice(1);

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-6xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout session={null}>
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <BookOpen className="w-10 h-10" />
            Blog & News
          </h1>
          <p className="text-gray-600">Stay updated with fishing tips, news, and stories from the Gulf Coast</p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <Card className="mb-8 overflow-hidden">
            <div className="md:flex">
              {featuredPost.image_url && (
                <div className="md:w-1/2 h-64 md:h-auto bg-gray-200">
                  <img
                    src={featuredPost.image_url}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardContent className="md:w-1/2 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="default">Featured</Badge>
                    <Badge variant="outline">{featuredPost.category}</Badge>
                  </div>
                  <h2 className="text-2xl font-bold mb-3">{featuredPost.title}</h2>
                  <p className="text-gray-600 mb-4">{featuredPost.excerpt}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{featuredPost.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(featuredPost.published_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{featuredPost.read_time} min read</span>
                    </div>
                  </div>
                </div>
                <Link href={`/blog/${featuredPost.id}`}>
                  <Button>
                    Read More
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </div>
          </Card>
        )}

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No articles found</h3>
              <p className="text-gray-600">
                Try adjusting your search or category filter
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  {post.image_url && (
                    <div className="h-48 bg-gray-200 overflow-hidden">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">
                        {post.category}
                      </Badge>
                      {post.views && post.views > 500 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{post.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span>{new Date(post.published_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{post.read_time} min</span>
                      </div>
                      {post.views && (
                        <span>{post.views} views</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
