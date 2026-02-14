import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/useStoreCompat';

interface License {
  id: string;
  state: string;
  license_number: string;
  license_type: string;
  expiration_date: string;
  holder_name: string;
}

export default function LicenseStorage() {
  const { user, isAuthenticated } = useUser();
  const { toast } = useToast();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newLicense, setNewLicense] = useState({ 
    state: '', 
    license_number: '', 
    license_type: '', 
    expiration_date: '',
    holder_name: ''
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadLicenses();
    }
  }, [isAuthenticated]);

  const loadLicenses = async () => {
    try {
      // In production, this would query the stored_licenses table
      // For now, load from localStorage as fallback
      const stored = localStorage.getItem(`licenses_${user?.id}`);
      if (stored) {
        setLicenses(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading licenses:', error);
    }
  };

  const addLicense = async () => {
    if (!newLicense.state || !newLicense.license_number) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const license: License = {
        id: crypto.randomUUID(),
        state: newLicense.state,
        license_number: newLicense.license_number,
        license_type: newLicense.license_type,
        expiration_date: newLicense.expiration_date,
        holder_name: newLicense.holder_name || user?.email || 'Guest'
      };

      const updatedLicenses = [...licenses, license];
      setLicenses(updatedLicenses);
      
      // Store in localStorage as fallback
      localStorage.setItem(`licenses_${user?.id}`, JSON.stringify(updatedLicenses));

      toast({ title: 'License added successfully!' });
      setNewLicense({ state: '', license_number: '', license_type: '', expiration_date: '', holder_name: '' });
      setShowForm(false);
    } catch (error: any) {
      toast({ title: 'Error adding license', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteLicense = async (id: string) => {
    try {
      const updatedLicenses = licenses.filter(l => l.id !== id);
      setLicenses(updatedLicenses);
      localStorage.setItem(`licenses_${user?.id}`, JSON.stringify(updatedLicenses));
      toast({ title: 'License removed' });
    } catch (error: any) {
      toast({ title: 'Error removing license', variant: 'destructive' });
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600">Please login to manage your fishing licenses</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          My Fishing Licenses
        </h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add License
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 mb-4 bg-blue-50">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>State *</Label>
              <Input value={newLicense.state} onChange={(e) => setNewLicense({...newLicense, state: e.target.value})} placeholder="e.g., Texas" />
            </div>
            <div>
              <Label>License Number *</Label>
              <Input value={newLicense.license_number} onChange={(e) => setNewLicense({...newLicense, license_number: e.target.value})} placeholder="TX-12345" />
            </div>
            <div>
              <Label>License Type</Label>
              <Input value={newLicense.license_type} onChange={(e) => setNewLicense({...newLicense, license_type: e.target.value})} placeholder="Resident Annual" />
            </div>
            <div>
              <Label>Expiration Date</Label>
              <Input type="date" value={newLicense.expiration_date} onChange={(e) => setNewLicense({...newLicense, expiration_date: e.target.value})} />
            </div>
            <div>
              <Label>Holder Name</Label>
              <Input value={newLicense.holder_name} onChange={(e) => setNewLicense({...newLicense, holder_name: e.target.value})} placeholder="Your name" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={addLicense} disabled={loading}>{loading ? 'Saving...' : 'Save License'}</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {licenses.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No licenses stored yet. Add your first license above!</p>
        ) : (
          licenses.map(license => (
            <Card key={license.id} className="p-4 flex justify-between items-center">
              <div>
                <div className="font-bold">{license.state} Fishing License</div>
                <div className="text-sm text-gray-600">#{license.license_number}</div>
                <div className="text-sm">{license.license_type}</div>
                <Badge variant="outline" className="mt-1">
                  Expires: {license.expiration_date || 'Not set'}
                </Badge>
              </div>
              <Button variant="destructive" size="sm" onClick={() => deleteLicense(license.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))
        )}
      </div>
    </Card>
  );
}
