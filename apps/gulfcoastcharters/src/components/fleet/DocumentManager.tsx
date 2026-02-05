import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileText, Upload, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentManagerProps {
  boatId: string;
  captainId: string;
}

const DOCUMENT_TYPES = [
  'Vessel Registration',
  'Insurance Certificate',
  'Safety Inspection',
  'Coast Guard Documentation',
  'Commercial License',
  'Environmental Compliance'
];

export function DocumentManager({ boatId, captainId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, [boatId]);

  const loadDocuments = async () => {
    const { data, error } = await supabase.functions.invoke('boat-documentation-manager', {
      body: { action: 'list', boatId }
    });
    if (!error && data?.documents) setDocuments(data.documents);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;

    setUploading(true);
    try {
      const filePath = `${captainId}/${boatId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('boat-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('boat-documents').getPublicUrl(filePath);

      await supabase.functions.invoke('boat-documentation-manager', {
        body: {
          action: 'upload',
          boatId,
          captainId,
          documentType: selectedType,
          fileUrl: urlData.publicUrl,
          fileName: file.name,
          expirationDate: expirationDate || null
        }
      });

      toast({ title: 'Document uploaded successfully' });
      loadDocuments();
      setSelectedType('');
      setExpirationDate('');
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (doc: any) => {
    if (doc.verification_status === 'verified') {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
    }
    if (doc.expiration_date && new Date(doc.expiration_date) < new Date()) {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>;
    }
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Boat Documentation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Document Type</Label>
              <select
                className="w-full border rounded-md p-2"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">Select type...</option>
                {DOCUMENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Expiration Date (Optional)</Label>
              <Input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="doc-upload" className="cursor-pointer">
              <div className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 hover:bg-gray-50">
                <Upload className="w-5 h-5" />
                <span>{uploading ? 'Uploading...' : 'Choose File to Upload'}</span>
              </div>
              <Input
                id="doc-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={!selectedType || uploading}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">Uploaded Documents</h4>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-500">No documents uploaded yet</p>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{doc.document_type}</p>
                  <p className="text-sm text-gray-500">
                    {doc.file_name} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                  {doc.expiration_date && (
                    <p className="text-xs text-gray-400">
                      Expires: {new Date(doc.expiration_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(doc)}
                  <Button size="sm" variant="outline" onClick={() => window.open(doc.file_url)}>
                    View
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}