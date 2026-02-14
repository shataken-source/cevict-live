import { Calendar, MapPin, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { weeklyBlogs } from '@/data/weeklyBlogs';
import BlogPostCard from './BlogPostCard';

export default function TravelBlog() {
  return (
    <div className="py-16 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-purple-600" />
              Weekly Destination Guides
            </h2>
            <p className="text-gray-600">46 weeks of travel inspiration from around the world - Jan to Nov 2025</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {weeklyBlogs.map(post => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
}
