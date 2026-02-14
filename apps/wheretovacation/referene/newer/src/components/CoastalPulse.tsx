'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  Heart, 
  Share2, 
  Bookmark, 
  Filter,
  TrendingUp,
  Clock,
  MapPin,
  Camera,
  Send,
  MoreHorizontal,
  Pin,
  AlertTriangle,
  Star,
  Award,
  Users,
  Hash,
  Globe,
  Anchor,
  UmbrellaBeach,
  Utensils,
  Fish,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CoastalPulse, { CoastalPulsePost, CoastalPulseReply, Channel } from '@/lib/coastalPulse';

interface CoastalPulseProps {
  site: 'gcc' | 'wtv';
  userId: string;
  userTrustLevel: string;
  userBadges: string[];
  showCrossSiteContent?: boolean;
}

export default function CoastalPulseComponent({ 
  site, 
  userId, 
  userTrustLevel, 
  userBadges,
  showCrossSiteContent = true 
}: CoastalPulseProps) {
  const [coastalPulse, setCoastalPulse] = useState<CoastalPulse | null>(null);
  const [posts, setPosts] = useState<CoastalPulsePost[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('general');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  
  // Form state
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    postType: 'discussion',
    channel: 'general',
    tags: [] as string[]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const postsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeCoastalPulse();
  }, [site, userId]);

  useEffect(() => {
    // Scroll to bottom when new posts arrive
    if (postsEndRef.current) {
      postsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [posts]);

  const initializeCoastalPulse = async () => {
    setIsLoading(true);
    try {
      const pulse = new CoastalPulse({
        site,
        userId,
        channels: [],
        showCrossSiteContent,
        trustLevel: userTrustLevel,
        badges: userBadges
      });

      // Listen for events
      pulse.on('post_created', (post) => {
        setPosts(prev => [post, ...prev]);
      });

      pulse.on('reply_created', (reply) => {
        // Update reply count for post
        setPosts(prev => prev.map(post => 
          post.id === reply.postId 
            ? { ...post, replies: post.replies + 1, lastActivity: new Date() }
            : post
        ));
      });

      pulse.on('like_updated', (data) => {
        setPosts(prev => prev.map(post => 
          post.id === data.itemId 
            ? { ...post, likes: data.likes, isLiked: data.isLiked }
            : post
        ));
      });

      setCoastalPulse(pulse);

      // Load initial data
      const availableChannels = pulse.getAvailableChannels();
      setChannels(availableChannels);

      const initialPosts = await pulse.getPosts({ 
        channel: selectedChannel, 
        sortBy,
        limit: 20 
      });
      setPosts(initialPosts);

    } catch (error) {
      console.error('Error initializing Coastal Pulse:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.content.trim()) return;

    setIsCreatingPost(true);
    try {
      await coastalPulse?.createPost({
        title: newPost.title,
        content: newPost.content,
        postType: newPost.postType,
        channel: newPost.channel,
        tags: newPost.tags
      });

      // Reset form
      setNewPost({
        title: '',
        content: '',
        postType: 'discussion',
        channel: newPost.channel,
        tags: []
      });

    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsCreatingPost(false);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      await coastalPulse?.toggleLike(postId, 'post');
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleCreateReply = async (postId: string) => {
    if (!replyContent.trim()) return;

    try {
      await coastalPulse?.createReply(postId, replyContent);
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error creating reply:', error);
    }
  };

  const handleChannelChange = async (channel: string) => {
    setSelectedChannel(channel);
    setNewPost(prev => ({ ...prev, channel }));
    
    const filteredPosts = await coastalPulse?.getPosts({ 
      channel, 
      sortBy,
      limit: 20 
    });
    setPosts(filteredPosts || []);
  };

  const handleSortChange = async (newSort: 'recent' | 'popular' | 'trending') => {
    setSortBy(newSort);
    
    const sortedPosts = await coastalPulse?.getPosts({ 
      channel: selectedChannel, 
      sortBy: newSort,
      limit: 20 
    });
    setPosts(sortedPosts || []);
  };

  const getChannelIcon = (channelId: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'general': <MessageCircle className="w-4 h-4" />,
      'ask_local': <Users className="w-4 h-4" />,
      'safety': <ShieldCheck className="w-4 h-4" />,
      'deals': <Tag className="w-4 h-4" />,
      'gcc_catches': <Fish className="w-4 h-4" />,
      'gcc_techniques': <Anchor className="w-4 h-4" />,
      'wtv_local': <UmbrellaBeach className="w-4 h-4" />,
      'wtv_food': <Utensils className="w-4 h-4" />
    };
    return iconMap[channelId] || <MessageCircle className="w-4 h-4" />;
  };

  const getPostTypeIcon = (postType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'discussion': <MessageCircle className="w-4 h-4" />,
      'catch_report': <Fish className="w-4 h-4" />,
      'local_tip': <Star className="w-4 h-4" />,
      'safety_alert': <AlertTriangle className="w-4 h-4" />,
      'deal': <Tag className="w-4 h-4" />,
      'photo_share': <Camera className="w-4 h-4" />
    };
    return iconMap[postType] || <MessageCircle className="w-4 h-4" />;
  };

  const getTrustLevelBadge = (level: string) => {
    switch (level) {
      case 'elite':
        return <Badge className="bg-purple-100 text-purple-800"><Award className="w-3 h-3 mr-1" />Elite</Badge>;
      case 'veteran':
        return <Badge className="bg-yellow-100 text-yellow-800"><Star className="w-3 h-3 mr-1" />Veteran</Badge>;
      case 'verified':
        return <Badge variant="outline"><ShieldCheck className="w-3 h-3 mr-1" />Verified</Badge>;
      default:
        return null;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Globe className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-medium text-gray-900">Connecting to Coastal Pulse...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Coastal Pulse</h1>
                <p className="text-sm text-gray-600">
                  {site === 'gcc' ? 'Gulf Coast Charters' : 'WhereToVacation'} Community
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">
                    <Clock className="w-4 h-4 mr-2" />
                    Recent
                  </SelectItem>
                  <SelectItem value="popular">
                    <Heart className="w-4 h-4 mr-2" />
                    Popular
                  </SelectItem>
                  <SelectItem value="trending">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Trending
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Create Post */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Share with the Community</h3>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Select value={newPost.channel} onValueChange={(value) => setNewPost(prev => ({ ...prev, channel: value }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          <div className="flex items-center space-x-2">
                            {getChannelIcon(channel.id)}
                            <span>{channel.displayName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={newPost.postType} onValueChange={(value) => setNewPost(prev => ({ ...prev, postType: value }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discussion">Discussion</SelectItem>
                      <SelectItem value="photo_share">Photo Share</SelectItem>
                      <SelectItem value="local_tip">Local Tip</SelectItem>
                      {site === 'gcc' && <SelectItem value="catch_report">Catch Report</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {newPost.postType !== 'discussion' && (
                  <Input
                    placeholder="Add a title..."
                    value={newPost.title}
                    onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  />
                )}

                <Textarea
                  placeholder="What's on your mind?"
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                />

                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="w-4 h-4 mr-2" />
                      Photo
                    </Button>
                    <Button variant="outline" size="sm">
                      <MapPin className="w-4 h-4 mr-2" />
                      Location
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={handleCreatePost}
                    disabled={!newPost.content.trim() || isCreatingPost}
                  >
                    {isCreatingPost ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Posts */}
            <div className="space-y-4">
              {posts.length === 0 ? (
                <Card className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                  <p className="text-gray-600">Be the first to share something with the community!</p>
                </Card>
              ) : (
                posts.map((post) => (
                  <Card key={post.id} className="p-6">
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.userAvatar} alt={post.userName} />
                          <AvatarFallback>{post.userName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">{post.userName}</span>
                            {getTrustLevelBadge(post.userTrustLevel)}
                            {post.isPinned && <Pin className="w-4 h-4 text-red-500" />}
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <span>{formatTimeAgo(post.createdAt)}</span>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              {getChannelIcon(post.channel)}
                              <span>{channels.find(c => c.id === post.channel)?.displayName}</span>
                            </div>
                            {post.primarySite !== site && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600">from {post.primarySite.toUpperCase()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Post Content */}
                    <div className="mb-4">
                      {post.title && (
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                      )}
                      <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                      
                      {post.attachments.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {post.attachments.map((attachment) => (
                            <img 
                              key={attachment.id}
                              src={attachment.url}
                              alt="Attachment"
                              className="rounded-lg w-full h-48 object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Post Tags */}
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Post Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center space-x-4">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleLikePost(post.id)}
                          className={post.isLiked ? 'text-red-600' : ''}
                        >
                          <Heart className={`w-4 h-4 mr-2 ${post.isLiked ? 'fill-current' : ''}`} />
                          {post.likes}
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          {post.replies}
                        </Button>
                        
                        <Button variant="ghost" size="sm">
                          <Share2 className="w-4 h-4" />
                        </Button>
                        
                        <Button variant="ghost" size="sm">
                          <Bookmark className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        {getPostTypeIcon(post.postType)}
                        <span>{post.postType.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {/* Reply Section */}
                    {replyingTo === post.id && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex space-x-2">
                          <Textarea
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={3}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex justify-end mt-2 space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setReplyingTo(null)}>
                            Cancel
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleCreateReply(post.id)}
                            disabled={!replyContent.trim()}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Reply
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>

            <div ref={postsEndRef} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Channels */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Channels</h3>
              <div className="space-y-2">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelChange(channel.id)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                      selectedChannel === channel.id 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {getChannelIcon(channel.id)}
                    <div className="flex-1">
                      <div className="font-medium">{channel.displayName}</div>
                      <div className="text-sm text-gray-500">{channel.description}</div>
                    </div>
                    {channel.sites.length > 1 && (
                      <Globe className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* Cross-Site Info */}
            {showCrossSiteContent && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-600" />
                  Cross-Site Community
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Connected to GCC & WTV</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Shared trust levels</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    <span>Cross-site badges</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Trust Level Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Your Trust Level</h3>
              <div className="space-y-3">
                {getTrustLevelBadge(userTrustLevel)}
                <p className="text-sm text-gray-600">
                  Your reputation follows you across both GCC and WTV sites.
                </p>
                {userBadges.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">Your Badges:</p>
                    <div className="flex flex-wrap gap-1">
                      {userBadges.map((badge) => (
                        <Badge key={badge} variant="outline" className="text-xs">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
      />
    </div>
  );
}
