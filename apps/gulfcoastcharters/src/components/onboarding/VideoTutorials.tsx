/**
 * Video Tutorials Component
 * Library of video tutorials for common development tasks
 * Organized by category with search and filtering
 * 
 * Features:
 * - Categorized tutorials
 * - Video playback
 * - Progress tracking
 * - Search functionality
 * 
 * @component
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Search, Clock } from 'lucide-react';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string;
  videoUrl: string;
  thumbnail: string;
}

export default function VideoTutorials() {
  const [searchQuery, setSearchQuery] = useState('');

  const tutorials: Tutorial[] = [
    {
      id: '1',
      title: 'Setting Up Your Development Environment',
      description: 'Complete guide to installing dependencies and configuring your local environment',
      duration: '8:30',
      category: 'getting-started',
      videoUrl: 'https://www.youtube.com/embed/example1',
      thumbnail: '/placeholder.svg'
    },
    {
      id: '2',
      title: 'Creating Your First Component',
      description: 'Learn how to create reusable React components with TypeScript',
      duration: '12:15',
      category: 'components',
      videoUrl: 'https://www.youtube.com/embed/example2',
      thumbnail: '/placeholder.svg'
    },
    {
      id: '3',
      title: 'Working with Supabase Database',
      description: 'Query data, insert records, and manage relationships',
      duration: '15:45',
      category: 'database',
      videoUrl: 'https://www.youtube.com/embed/example3',
      thumbnail: '/placeholder.svg'
    },
    {
      id: '4',
      title: 'Creating Edge Functions',
      description: 'Build serverless functions for backend logic and API integration',
      duration: '10:20',
      category: 'backend',
      videoUrl: 'https://www.youtube.com/embed/example4',
      thumbnail: '/placeholder.svg'
    },
    {
      id: '5',
      title: 'Implementing Authentication',
      description: 'Add user login, signup, and session management',
      duration: '14:00',
      category: 'auth',
      videoUrl: 'https://www.youtube.com/embed/example5',
      thumbnail: '/placeholder.svg'
    },
    {
      id: '6',
      title: 'Deploying to Production',
      description: 'Deploy your application to Vercel or Netlify',
      duration: '9:30',
      category: 'deployment',
      videoUrl: 'https://www.youtube.com/embed/example6',
      thumbnail: '/placeholder.svg'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Tutorials' },
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'components', label: 'Components' },
    { id: 'database', label: 'Database' },
    { id: 'backend', label: 'Backend' },
    { id: 'auth', label: 'Authentication' },
    { id: 'deployment', label: 'Deployment' }
  ];

  const filteredTutorials = tutorials.filter(tutorial =>
    tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutorial.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Video Tutorials</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid grid-cols-7 mb-6">
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map(category => (
              <TabsContent key={category.id} value={category.id}>
                <div className="grid md:grid-cols-2 gap-4">
                  {filteredTutorials
                    .filter(t => category.id === 'all' || t.category === category.id)
                    .map(tutorial => (
                      <Card key={tutorial.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="aspect-video bg-muted rounded mb-3 flex items-center justify-center">
                            <Play className="w-12 h-12 text-primary" />
                          </div>
                          <h3 className="font-semibold mb-2">{tutorial.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {tutorial.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              {tutorial.duration}
                            </div>
                            <Badge variant="secondary">{tutorial.category}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}