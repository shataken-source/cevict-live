import { useState } from 'react';
import { Plus, FolderOpen, Edit2, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Album {
  id: string;
  name: string;
  date: string;
  photoCount: number;
  coverPhoto: string;
}

export default function TripAlbumManager() {
  const [albums, setAlbums] = useState<Album[]>([
    { id: '1', name: 'Summer Tarpon Trip', date: '2024-07-15', photoCount: 24, coverPhoto: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383727273_974369fa.webp' },
    { id: '2', name: 'Grouper Fishing', date: '2024-06-20', photoCount: 18, coverPhoto: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383726234_f6eed351.webp' },
  ]);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDate, setNewAlbumDate] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const createAlbum = () => {
    if (newAlbumName && newAlbumDate) {
      setAlbums([...albums, {
        id: Date.now().toString(),
        name: newAlbumName,
        date: newAlbumDate,
        photoCount: 0,
        coverPhoto: 'https://d64gsuwffb70l.cloudfront.net/6918960e54362d714f32b6fc_1763383728282_b7f6d195.webp'
      }]);
      setNewAlbumName('');
      setNewAlbumDate('');
      setIsOpen(false);
    }
  };

  const deleteAlbum = (id: string) => {
    setAlbums(albums.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Trip Albums</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Create Album</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Album</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Album Name</Label>
                <Input value={newAlbumName} onChange={(e) => setNewAlbumName(e.target.value)} placeholder="e.g., Summer Fishing Trip" />
              </div>
              <div>
                <Label>Trip Date</Label>
                <Input type="date" value={newAlbumDate} onChange={(e) => setNewAlbumDate(e.target.value)} />
              </div>
              <Button onClick={createAlbum} className="w-full">Create Album</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {albums.map(album => (
          <Card key={album.id} className="overflow-hidden group">
            <div className="relative h-48">
              <img src={album.coverPhoto} alt={album.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary"><Edit2 className="w-4 h-4" /></Button>
                <Button size="sm" variant="destructive" onClick={() => deleteAlbum(album.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2">{album.name}</h3>
              <div className="flex items-center text-sm text-gray-600 gap-4">
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{album.date}</span>
                <span className="flex items-center gap-1"><FolderOpen className="w-4 h-4" />{album.photoCount} photos</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
