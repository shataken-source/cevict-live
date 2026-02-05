import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Phone, Mail, User, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function EmergencyContactManager({ userId }: { userId: string }) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    isPrimary: false
  });

  useEffect(() => {
    loadContacts();
  }, [userId]);

  const loadContacts = async () => {
    try {
      const { data } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId);
      if (data) setContacts(data);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.functions.invoke('emergency-contact-system', {
        body: { action: 'add-contact', userId, contactData: formData }
      });
      if (error) throw error;
      toast.success('Emergency contact added');
      loadContacts();
      setOpen(false);
      setFormData({ name: '', relationship: '', phone: '', email: '', isPrimary: false });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (contactId: string) => {
    try {
      await supabase.from('emergency_contacts').delete().eq('id', contactId);
      toast.success('Contact removed');
      loadContacts();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Emergency Contacts
            </CardTitle>
            <CardDescription>Manage your emergency contact information</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Emergency Contact</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Input value={formData.relationship} onChange={(e) => setFormData({...formData, relationship: e.target.value})} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                </div>
                <Button type="submit" className="w-full">Add Contact</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex justify-between items-center p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span className="font-semibold">{contact.name}</span>
                  {contact.is_primary && <Badge variant="default">Primary</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(contact.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
          {contacts.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No emergency contacts added yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}