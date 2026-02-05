import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Calendar, MapPin, Heart, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function TripPhotoAlbum() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const { toast } = useToast();

  const createAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Album Created!',
      description: 'Your trip album has been created successfully.'
    });
    setShowCreate(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Trip Photo Albums
          </CardTitle>
          <Button onClick={() => setShowCreate(true)}>Create Album</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showCreate && (
          <form onSubmit={createAlbum} className="mb-6 p-4 border rounded-lg space-y-4">
            <Input placeholder="Album Title" required />
            <Textarea placeholder="Trip Description" />
            <div className="grid grid-cols-2 gap-4">
              <Input type="date" />
              <Input placeholder="Location" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create</Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        )}
        
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow cursor-pointer">
              <div className="relative">
                <img src="/placeholder.svg" alt="Trip" className="w-full h-48 object-cover rounded-t-lg" />
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <Badge className="bg-white/90 text-gray-700">
                    <Eye className="h-3 w-3 mr-1" />
                    {Math.floor(Math.random() * 500)}
                  </Badge>
                  <Badge className="bg-white/90 text-red-600">
                    <Heart className="h-3 w-3 mr-1" />
                    {Math.floor(Math.random() * 50)}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-3">
                <h4 className="font-semibold">Summer Fishing Trip</h4>
                <p className="text-xs text-gray-600 mt-1">Gulf Coast • 12 photos</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({ children, className }: any) {
  return <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${className}`}>{children}</span>;
}