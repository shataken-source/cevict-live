import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Upload, FileText, Trash2, Mail, Download, AlertCircle } from 'lucide-react';

const DOCUMENT_TYPES = [
  'USCG License', 'Insurance Policy', 'Boat Registration', 'Safety Certificate',
  'First Aid Certification', 'CPR Certification', 'Medical Certificate',
  'Drug Test Results', 'Background Check', 'Business License', 'Tax Documents', 'Other'
];

export default function ComprehensiveDocumentManager() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [reminders, setReminders] = useState<any[]>([]);

  useEffect(() => {
    loadDocuments();
    checkReminders();
  }, []);

  const loadDocuments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.storage
      .from('boat-documents')
      .list(`${user.id}/`, { limit: 100 });

    if (!error && data) {
      const docs = data.map(file => ({
        name: file.name,
        url: supabase.storage.from('boat-documents').getPublicUrl(`${user.id}/${file.name}`).data.publicUrl,
        created: file.created_at
      }));
      setDocuments(docs);
    }
  };

  const checkReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check each document for expiration
    const reminderList: any[] = [];
    documents.forEach(doc => {
      if (doc.expirationDate) {
        const daysUntil = Math.floor((new Date(doc.expirationDate).getTime() - Date.now()) / (1000*60*60*24));
        if (daysUntil <= 30) {
          reminderList.push({ ...doc, daysUntil });
        }
      }
    });
    setReminders(reminderList);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !selectedType) {
      toast.error('Please select document type');
      return;
    }

    setUploading(true);
    const file = e.target.files[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileName = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('boat-documents')
      .upload(`${user.id}/${fileName}`, file);

    if (uploadError) {
      toast.error('Upload failed');
      setUploading(false);
      return;
    }

    const fileUrl = supabase.storage.from('boat-documents').getPublicUrl(`${user.id}/${fileName}`).data.publicUrl;

    // Run OCR
    const { data: ocrData } = await supabase.functions.invoke('ocr-document-processor', {
      body: { imageUrl: fileUrl, documentType: selectedType }
    });

    toast.success('Document uploaded and processed!');
    if (ocrData?.extractedFields) {
      toast.success(`Extracted: ${JSON.stringify(ocrData.extractedFields)}`);
    }

    setUploading(false);
    loadDocuments();
  };

  const deleteDocument = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.storage.from('boat-documents').remove([`${user.id}/${name}`]);
    toast.success('Document deleted');
    loadDocuments();
  };

  const emailDocument = async (doc: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.functions.invoke('mailjet-email-service', {
      body: {
        to: user.email,
        subject: `Document: ${doc.name}`,
        html: `<p>Your document is attached.</p><a href="${doc.url}">Download ${doc.name}</a>`
      }
    });
    toast.success('Document emailed!');
  };

  return (
    <div className="space-y-6">
      {reminders.length > 0 && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-5 h-5" />
              Document Renewal Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.map((r, i) => (
              <div key={i} className="p-2 bg-orange-50 rounded mb-2">
                {r.name} expires in {r.daysUntil} days
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload New Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Document Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Expiration Date (optional)</Label>
            <Input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
          </div>
          <div>
            <Label>Upload File</Label>
            <Input type="file" onChange={handleUpload} disabled={uploading} accept="image/*,.pdf" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span>{doc.name}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.open(doc.url)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => emailDocument(doc)}>
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteDocument(doc.name)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
