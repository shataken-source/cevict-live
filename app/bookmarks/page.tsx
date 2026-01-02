'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useUnifiedAuth } from '@/shared/auth/UnifiedAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bookmark, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  FolderPlus,
  ExternalLink,
  MapPin,
  FileText,
  Scale,
  Trash2,
  Edit,
  Share2,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import BookmarkService from '@/lib/bookmarks';

export default function BookmarksPage() {
  const { user } = useUnifiedAuth();
  const supabase = createClient();
  const bookmarkService = new BookmarkService();
  
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('bookmarks');

  useEffect(() => {
    if (user) {
      loadBookmarks();
      loadFolders();
    }
  }, [user, selectedType, selectedFolder]);

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const itemType = selectedType === 'all' ? undefined : selectedType as any;
      const folderId = selectedFolder === 'all' ? undefined : selectedFolder;
      
      const data = await bookmarkService.getUserBookmarks(
        user?.id || '',
        itemType,
        folderId
      );
      
      setBookmarks(data);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const data = await bookmarkService.getUserFolders(user?.id || '');
      setFolders(data);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const removeBookmark = async (bookmarkId: string) => {
    try {
      await bookmarkService.removeBookmark(user?.id || '', bookmarkId);
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  const exportBookmarks = async () => {
    try {
      const data = await bookmarkService.exportBookmarks(user?.id || '');
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smokersrights-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting bookmarks:', error);
    }
  };

  const getBookmarkIcon = (itemType: string) => {
    switch (itemType) {
      case 'law':
        return <FileText className="w-4 h-4" />;
      case 'place':
        return <MapPin className="w-4 h-4" />;
      case 'comparison':
        return <Scale className="w-4 h-4" />;
      default:
        return <Bookmark className="w-4 h-4" />;
    }
  };

  const getBookmarkUrl = (bookmark: any) => {
    switch (bookmark.item_type) {
      case 'law':
        return `/laws/${bookmark.metadata.state_code}/${bookmark.item_id}`;
      case 'place':
        return `/places/${bookmark.item_id}`;
      case 'comparison':
        return `/compare?${bookmark.metadata.query_string}`;
      default:
        return '#';
    }
  };

  const filteredBookmarks = bookmarks.filter(bookmark =>
    bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bookmark.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Bookmark className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Sign In Required</h2>
            <p className="text-slate-600 mb-4">Please sign in to view your bookmarks</p>
            <Button asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Bookmark className="w-6 h-6" />
                My Bookmarks
              </h1>
              <p className="text-slate-600">Your saved laws, places, and comparisons</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={exportBookmarks}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button asChild>
                <Link href="/laws">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Add Bookmark
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Search bookmarks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="law">Laws</SelectItem>
                  <SelectItem value="place">Places</SelectItem>
                  <SelectItem value="comparison">Comparisons</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Folders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Folders</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bookmarks">
              Bookmarks ({filteredBookmarks.length})
            </TabsTrigger>
            <TabsTrigger value="folders">
              Folders ({folders.length})
            </TabsTrigger>
            <TabsTrigger value="recent">
              Recent Activity
            </TabsTrigger>
          </TabsList>

          {/* Bookmarks Tab */}
          <TabsContent value="bookmarks" className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-slate-600">Loading bookmarks...</p>
              </div>
            ) : filteredBookmarks.length > 0 ? (
              <div className="grid gap-4">
                {filteredBookmarks.map((bookmark) => (
                  <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getBookmarkIcon(bookmark.item_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="capitalize">
                                {bookmark.item_type}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {new Date(bookmark.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <h3 className="font-medium text-slate-900 mb-1">{bookmark.title}</h3>
                            <p className="text-sm text-slate-600 mb-2">{bookmark.description}</p>
                            
                            {bookmark.metadata && (
                              <div className="text-xs text-slate-500">
                                {bookmark.metadata.state_code && (
                                  <span>📍 {bookmark.metadata.state_code}</span>
                                )}
                                {bookmark.metadata.category && (
                                  <span className="ml-2">📋 {bookmark.metadata.category}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={getBookmarkUrl(bookmark)}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          
                          <Button size="sm" variant="outline" asChild>
                            <Link href={getBookmarkUrl(bookmark)} target="_blank">
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => removeBookmark(bookmark.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bookmark className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No bookmarks yet</h3>
                  <p className="text-slate-600 mb-4">Start saving laws, places, and comparisons for quick access</p>
                  <Button asChild>
                    <Link href="/laws">Browse Laws</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Folders Tab */}
          <TabsContent value="folders" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Bookmark Folders</h3>
              <Button variant="outline">
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            </div>

            {folders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <Card key={folder.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: folder.color || '#3b82f6' }}
                          />
                          <h4 className="font-medium">{folder.name}</h4>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {folder.is_public ? 'Public' : 'Private'}
                        </Badge>
                      </div>
                      
                      {folder.description && (
                        <p className="text-sm text-slate-600 mb-3">{folder.description}</p>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">
                          {new Date(folder.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Share2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FolderPlus className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No folders yet</h3>
                  <p className="text-slate-600">Organize your bookmarks into folders for easy access</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recent Activity Tab */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-slate-600">You've been actively bookmarking useful content</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-slate-600">Your bookmarks help you stay informed about smoking laws</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-slate-600">Consider organizing bookmarks into folders for better access</span>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Bookmark className="w-4 h-4 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Pro Tip</h4>
                  </div>
                  <p className="text-sm text-blue-800">
                    Use bookmarks to save laws for states you visit frequently, or places you want to remember for future trips.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
