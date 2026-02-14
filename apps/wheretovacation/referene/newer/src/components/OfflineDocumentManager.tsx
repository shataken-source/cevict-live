import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

interface CachedDocument {
  id: string;
  name: string;
  type: string;
  cachedAt: string;
  size: number;
  blob?: Blob;
}

export function OfflineDocumentManager({ captainId }: { captainId: string }) {
  const [documents, setDocuments] = useState<CachedDocument[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadCachedDocuments();
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, []);

  const loadCachedDocuments = async () => {
    const cached = localStorage.getItem(`captain_docs_${captainId}`);
    if (cached) setDocuments(JSON.parse(cached));
  };

  const viewDocument = async (doc: CachedDocument) => {
    const cached = await caches.open('captain-documents');
    const response = await cached.match(`/docs/${doc.id}`);
    if (response) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      toast.error('Document not available offline');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Offline Documents</h3>
        <Badge variant={isOnline ? 'default' : 'secondary'}>
          {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>
      <div className="space-y-3">
        {documents.map(doc => (
          <div key={doc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <div>
                <p className="font-medium">{doc.name}</p>
                <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <Button size="sm" onClick={() => viewDocument(doc)}>View</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
