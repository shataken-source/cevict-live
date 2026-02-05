import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Eye, WifiOff, CloudUpload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Document {
  id: string;
  type: string;
  name: string;
  url: string;
  status: 'pending' | 'verified' | 'expired';
  expiry_date: string | null;
  uploaded_at: string;
  ocr_data?: any;
}


const DOC_TYPES = [
  { value: 'uscg_license', label: 'USCG License', required: true },
  { value: 'insurance', label: 'Insurance Policy', required: true },
  { value: 'vessel_registration', label: 'Vessel Registration', required: true },
  { value: 'safety_cert', label: 'Safety Certificate', required: false },
  { value: 'first_aid', label: 'First Aid Cert', required: false },
  { value: 'cpr', label: 'CPR Certification', required: false }
];

export function EnhancedDocumentUpload({ captainId }: { captainId: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingUploads();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  useEffect(() => {
    loadDocuments();
    loadPendingUploads();
  }, [captainId]);

  const loadPendingUploads = () => {
    const pending = localStorage.getItem('pendingDocUploads');
    if (pending) {
      setPendingUploads(JSON.parse(pending));
    }
  };

  const syncPendingUploads = async () => {
    const pending = localStorage.getItem('pendingDocUploads');
    if (!pending) return;
    
    const uploads = JSON.parse(pending);
    toast.info(`Syncing ${uploads.length} offline upload(s)...`);
    
    for (const upload of uploads) {
      try {
        await uploadFileFromData(upload.fileData, upload.docType, upload.fileName);
      } catch (err) {
        console.error('Sync failed:', err);
      }
    }
    
    localStorage.removeItem('pendingDocUploads');
    setPendingUploads([]);
    toast.success('All offline uploads synced!');
  };

  const uploadFileFromData = async (fileData: string, docType: string, fileName: string) => {
    const blob = await fetch(fileData).then(r => r.blob());
    const file = new File([blob], fileName);
    await uploadFile(file, docType);
  };

  const loadDocuments = async () => {
    if (!isOnline) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('captain_documents')
      .select('*')
      .eq('captain_id', user.id)
      .order('uploaded_at', { ascending: false });

    setDocuments(data || []);
  };


  const processOCR = async (fileUrl: string, docType: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ocr-document-processor', {
        body: { imageUrl: fileUrl, documentType: docType }
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('OCR Error:', err);
      return null;
    }
  };


  const uploadFile = async (file: File, docType: string) => {
    if (!isOnline) {
      // Save for offline sync
      const reader = new FileReader();
      reader.onload = () => {
        const pending = localStorage.getItem('pendingDocUploads');
        const uploads = pending ? JSON.parse(pending) : [];
        uploads.push({
          fileData: reader.result,
          docType,
          fileName: file.name,
          timestamp: Date.now()
        });
        localStorage.setItem('pendingDocUploads', JSON.stringify(uploads));
        setPendingUploads(uploads);
        toast.info('Offline mode: Document saved and will upload when you reconnect', {
          duration: 5000,
          icon: <WifiOff className="w-5 h-5" />
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${captainId}/${docType}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('captain-documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('captain-documents').getPublicUrl(fileName);
      const ocrData = await processOCR(publicUrl, docType);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('captain_documents').insert({
        captain_id: user.id, type: docType, name: file.name, url: publicUrl,
        status: ocrData?.expirationDate ? 'verified' : 'pending',
        expiry_date: ocrData?.expirationDate || null, ocr_data: ocrData,
        uploaded_at: new Date().toISOString()
      });
      toast.success(`Uploaded! ${ocrData?.expirationDate ? `Expires: ${ocrData.expirationDate}` : ''}`);
      loadDocuments();
    } catch (error) {
      toast.error('Upload failed');
    }
    setUploading(false);
  };


  const handleDrop = useCallback(async (e: React.DragEvent, docType: string) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) await uploadFile(file, docType);
  }, []);

  const getStatusBadge = (doc: Document) => {
    if (!doc.expiry_date) return <Badge variant="secondary">Pending</Badge>;
    const days = Math.floor((new Date(doc.expiry_date).getTime() - Date.now()) / (1000*60*60*24));
    if (days < 0) return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Expired</Badge>;
    if (days <= 30) return <Badge className="bg-orange-500"><AlertCircle className="w-3 h-3 mr-1" />{days}d</Badge>;
    return <Badge><CheckCircle className="w-3 h-3 mr-1" />Valid</Badge>;
  };

  const expiringDocs = documents.filter(d => d.expiry_date && Math.floor((new Date(d.expiry_date).getTime() - Date.now()) / (1000*60*60*24)) <= 30);


  return (
    <div className="space-y-6">
      {!isOnline && (
        <Alert className="bg-yellow-50 border-yellow-500">
          <WifiOff className="w-5 h-5 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You are offline. Documents uploaded now will be saved locally and automatically synced when you reconnect to the internet.
          </AlertDescription>
        </Alert>
      )}

      {pendingUploads.length > 0 && (
        <Alert className="bg-blue-50 border-blue-500">
          <CloudUpload className="w-5 h-5 text-blue-600" />
          <AlertDescription className="text-blue-800">
            {pendingUploads.length} document(s) waiting to sync. {isOnline ? 'Syncing now...' : 'Will sync when online.'}
          </AlertDescription>
        </Alert>
      )}

      {expiringDocs.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 p-4">
          <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />Renewal Reminders ({expiringDocs.length})
          </h3>
          <div className="space-y-2">
            {expiringDocs.map(doc => (
              <div key={doc.id} className="text-sm text-orange-700">
                {doc.name} - {Math.floor((new Date(doc.expiry_date!).getTime() - Date.now()) / (1000*60*60*24))} days remaining
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOC_TYPES.map(docType => {
          const doc = documents.find(d => d.type === docType.value);
          return (
            <Card key={docType.value} className={`p-4 ${dragOver === docType.value ? 'border-blue-500 bg-blue-50' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(docType.value); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, docType.value)}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-sm">{docType.label}</h3>
                  {docType.required && <Badge variant="outline" className="text-xs mt-1">Required</Badge>}
                </div>
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              {doc ? (
                <div className="space-y-2">
                  {getStatusBadge(doc)}
                  <div className="text-xs text-gray-600 truncate">{doc.name}</div>
                  {doc.expiry_date && <div className="text-xs">Expires: {new Date(doc.expiry_date).toLocaleDateString()}</div>}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPreviewDoc(doc)}><Eye className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(doc.url)}><Download className="w-3 h-3" /></Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed rounded p-4 text-center hover:border-blue-500">
                    <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                    <p className="text-xs text-gray-600">Drop file or click</p>
                  </div>
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], docType.value)} accept="image/*,.pdf" disabled={uploading} />
                </label>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{previewDoc?.name}</DialogTitle></DialogHeader>
          {previewDoc?.url.endsWith('.pdf') ? (
            <iframe src={previewDoc.url} className="w-full h-96" />
          ) : (
            <img src={previewDoc?.url} alt={previewDoc?.name} className="w-full" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
