import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mail, Calendar, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExpiringDoc {
  id: string;
  document_type: string;
  expiry_date: string;
  last_reminder_sent_at: string | null;
  reminder_count: number;
  // Supabase nested relation `captain:captain_id (email, full_name)` can be an object or array;
  // keep this loose to avoid over-constraining the type.
  captain: any;
}

const ExpirationWarnings: React.FC = () => {
  const [expiringDocs, setExpiringDocs] = useState<ExpiringDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadExpiringDocs(); }, []);

  const loadExpiringDocs = async () => {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data, error } = await supabase.from('captain_documents').select('id, document_type, expiry_date, last_reminder_sent_at, reminder_count, captain:captain_id (email, full_name)').lte('expiry_date', thirtyDaysFromNow.toISOString()).gte('expiry_date', new Date().toISOString()).order('expiry_date', { ascending: true });
      if (error) throw error;
      setExpiringDocs(data || []);
    } catch (error) {
      console.error('Error loading expiring documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendManualReminder = async (docId: string) => {
    try {
      const { error } = await supabase.functions.invoke('document-expiration-reminder', { body: { document_id: docId } });
      if (error) throw error;
      toast({ title: 'Reminder Sent', description: 'Email reminder has been sent to the captain.' });
      loadExpiringDocs();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send reminder email.', variant: 'destructive' });
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => Math.floor((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const getUrgencyBadge = (days: number) => {
    if (days <= 7) return <Badge variant="destructive">Urgent - {days}d</Badge>;
    if (days <= 14) return <Badge className="bg-orange-500">Warning - {days}d</Badge>;
    return <Badge variant="secondary">{days} days</Badge>;
  };

  if (loading) return <div>Loading...</div>;

  return (<Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5" />Document Expiration Warnings</CardTitle></CardHeader><CardContent><div className="space-y-4">{expiringDocs.length === 0 ? (<p className="text-gray-500">No documents expiring in the next 30 days.</p>) : (expiringDocs.map((doc) => {const days = getDaysUntilExpiry(doc.expiry_date);return (<div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg"><div className="flex-1"><div className="flex items-center gap-3 mb-2"><FileText className="w-4 h-4 text-gray-400" /><span className="font-medium">{doc.document_type}</span>{getUrgencyBadge(days)}</div><div className="text-sm text-gray-600 space-y-1"><p>Captain: {doc.captain?.full_name} ({doc.captain?.email})</p><p className="flex items-center gap-2"><Calendar className="w-3 h-3" />Expires: {new Date(doc.expiry_date).toLocaleDateString()}</p>{doc.last_reminder_sent_at && (<p className="flex items-center gap-2"><Mail className="w-3 h-3" />Last reminder: {new Date(doc.last_reminder_sent_at).toLocaleDateString()} ({doc.reminder_count} sent)</p>)}</div></div><Button size="sm" variant="outline" onClick={() => sendManualReminder(doc.id)}><Mail className="w-4 h-4 mr-2" />Send Reminder</Button></div>);}))}</div></CardContent></Card>);
};

export default ExpirationWarnings;
