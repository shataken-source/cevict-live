import { Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BlogPost } from '@/data/weeklyBlogs';

export default function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition group">
      <img src={post.image} alt={post.destination} className="w-full h-48 object-cover group-hover:scale-110 transition duration-500" />
      <div className="p-6">
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{post.country}</span>
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-2 group-hover:text-purple-600 transition">{post.destination}</h3>
        <p className="text-gray-600 mb-4">{post.excerpt}</p>
        
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-2">Top 5 Things to Try:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {post.topThings.map((thing, i) => <li key={i}>• {thing}</li>)}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h4 className="font-semibold text-xs mb-1">Restaurants:</h4>
            <p className="text-xs text-gray-600">{post.restaurants.slice(0, 3).join(', ')}</p>
          </div>
          <div>
            <h4 className="font-semibold text-xs mb-1">Hotels:</h4>
            <p className="text-xs text-gray-600">{post.hotels.slice(0, 3).join(', ')}</p>
          </div>
        </div>

        <Button variant="outline" className="w-full">Read Full Guide</Button>
      </div>
    </div>
  );
}
