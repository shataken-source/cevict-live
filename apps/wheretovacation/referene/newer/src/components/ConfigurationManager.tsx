import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Settings, Edit2, Eye, EyeOff, Save, X, Trash2 } from 'lucide-react';

interface ConfigVariable {
  id: string;
  key: string;
  value: string;
  description: string;
  is_secret: boolean;
  created_at: string;
  updated_at: string;
}

export default function ConfigurationManager() {
  const [configs, setConfigs] = useState<ConfigVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    key: '', value: '', description: '', is_secret: false
  });

  useEffect(() => { loadConfigs(); }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('configuration_variables').select('*').order('key');
      if (error) throw error;
      setConfigs(data || []);
    } catch (error) {
      toast.error('Failed to load configuration variables');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.key || !formData.value) {
      toast.error('Key and value are required');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('configuration_variables')
          .update({ ...formData, updated_at: new Date().toISOString() }).eq('id', editingId);
        if (error) throw error;
        toast.success('Configuration updated');
      } else {
        const { error } = await supabase.from('configuration_variables').insert([formData]);
        if (error) throw error;
        toast.success('Configuration added');
      }
      setFormData({ key: '', value: '', description: '', is_secret: false });
      setEditingId(null);
      loadConfigs();
    } catch (error: any) {
      toast.error(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {editingId ? 'Edit' : 'Add'} Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Key *</Label><Input value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} placeholder="API_KEY_NAME" /></div>
          <div><Label>Value *</Label><Textarea value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} rows={3} /></div>
          <div><Label>Description</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="secret" checked={formData.is_secret} onChange={(e) => setFormData({ ...formData, is_secret: e.target.checked })} className="w-4 h-4" />
            <Label htmlFor="secret">Secret</Label>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading}><Save className="w-4 h-4 mr-2" />{editingId ? 'Update' : 'Add'}</Button>
            {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setFormData({ key: '', value: '', description: '', is_secret: false }); }}><X className="w-4 h-4 mr-2" />Cancel</Button>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Variables</CardTitle></CardHeader>
        <CardContent>
          {configs.length === 0 ? <p className="text-gray-500">No variables</p> : (
            <div className="space-y-3">
              {configs.map((c) => (
                <div key={c.id} className="border rounded p-4">
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{c.key}</h4>
                      {c.description && <p className="text-sm text-gray-600">{c.description}</p>}
                      <div className="mt-2 flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">{c.is_secret && !showValues[c.id] ? '••••••••' : c.value}</code>
                        {c.is_secret && <Button size="sm" variant="ghost" onClick={() => setShowValues(p => ({ ...p, [c.id]: !p[c.id] }))}>{showValues[c.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setFormData({ key: c.key, value: c.value, description: c.description, is_secret: c.is_secret }); setEditingId(c.id); }}><Edit2 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={async () => { if (confirm('Delete?')) { await supabase.from('configuration_variables').delete().eq('id', c.id); toast.success('Deleted'); loadConfigs(); } }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}