import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Plus, Trash2, Edit } from 'lucide-react';

export default function DefaultAdsManager() {
  const [ads, setAds] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    cta_text: 'Learn More',
    placement: 'hero'
  });

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    const { data } = await supabase.from('default_ads').select('*').order('created_at', { ascending: false });
    if (data) setAds(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editing) {
      await supabase.from('default_ads').update(form).eq('id', editing.id);
      toast.success('Ad updated successfully');
    } else {
      await supabase.from('default_ads').insert([{ ...form, active: true }]);
      toast.success('Ad created successfully');
    }
    
    setForm({ title: '', description: '', image_url: '', link_url: '', cta_text: 'Learn More', placement: 'hero' });
    setEditing(null);
    loadAds();
  };

  const deleteAd = async (id: string) => {
    if (confirm('Delete this ad?')) {
      await supabase.from('default_ads').delete().eq('id', id);
      toast.success('Ad deleted');
      loadAds();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Ads Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <Label>Placement</Label>
              <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hero">Hero Banner</SelectItem>
                  <SelectItem value="sidebar">Sidebar</SelectItem>
                  <SelectItem value="in-grid">In-Grid</SelectItem>
                  <SelectItem value="footer">Footer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            </div>
            <div>
              <Label>Link URL</Label>
              <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label>CTA Text</Label>
            <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
          </div>
          <Button type="submit"><Plus className="w-4 h-4 mr-2" />{editing ? 'Update' : 'Create'} Ad</Button>
        </form>

        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="flex items-center justify-between p-4 bg-white border rounded-lg">
              <div>
                <h4 className="font-semibold">{ad.title}</h4>
                <p className="text-sm text-gray-600">{ad.placement} • {ad.active ? 'Active' : 'Inactive'}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing(ad); setForm(ad); }}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteAd(ad.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
