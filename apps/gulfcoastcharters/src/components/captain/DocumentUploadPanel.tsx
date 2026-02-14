import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Document {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'verified' | 'expired';
  expiryDate: string;
  uploadedAt: string;
}

export function DocumentUploadPanel({ captainId }: { captainId: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [captainId]);

  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/captain/documents', { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents.map((d: any) => ({
          id: d.id,
          type: d.type,
          name: d.name,
          status: d.status,
          expiryDate: d.expiry_date,
          uploadedAt: d.uploaded_at,
        })));
        return;
      }
      const fn = await supabase.functions.invoke('captain-documents', {
        body: { action: 'getDocuments', captainId },
      });
      const docs = fn.data?.documents || [];
      setDocuments(docs.map((d: any) => ({
        id: d.id,
        type: d.type ?? d.documentType,
        name: d.name,
        status: d.status,
        expiryDate: d.expiryDate ?? d.expiry_date,
        uploadedAt: d.uploadedAt ?? d.uploaded_at,
      })));
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${captainId}/${docType}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('captain-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('captain-documents').getPublicUrl(fileName);
      const apiRes = await fetch('/api/captain/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type: docType, name: file.name, url: publicUrl }),
      });
      if (apiRes.ok) {
        toast.success('Document uploaded successfully!');
        loadDocuments();
        setUploading(false);
        return;
      }
      await supabase.functions.invoke('captain-documents', {
        body: { action: 'addDocument', captainId, documentType: docType, fileName },
      });

      toast.success('Document uploaded successfully!');
      loadDocuments();
    } catch (error) {
      toast.error('Failed to upload document');
    }
    setUploading(false);
  };

  const docTypes = [
    { type: 'license', label: 'Captain License' },
    { type: 'insurance', label: 'Insurance Certificate' },
    { type: 'vessel_registration', label: 'Vessel Registration' },
    { type: 'safety_certificate', label: 'Safety Certificate' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Documents & Certifications</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {docTypes.map((docType) => {
          const doc = documents.find(d => d.type === docType.type);
          return (
            <Card key={docType.type} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold">{docType.label}</h3>
                  {doc && (
                    <Badge variant={doc.status === 'verified' ? 'default' : doc.status === 'expired' ? 'destructive' : 'secondary'} className="mt-2">
                      {doc.status === 'verified' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {doc.status === 'expired' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {doc.status}
                    </Badge>
                  )}
                </div>
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <Input type="file" onChange={(e) => handleUpload(e, docType.type)} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
