import { useState, useCallback } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Props {
  token: string;
  documentType: string;
  onSuccess: () => void;
}

export default function DocumentRenewalUpload({ token, documentType, onSuccess }: Props) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const { toast } = useToast();

  const processDocument = async (file: File) => {
    setProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('ocr-document-processor', {
          body: { imageBase64: base64, documentType }
        });

        if (error) throw error;

        setExtractedData(data.data);
        toast({
          title: "Document Processed",
          description: `Expiration: ${data.data.expirationDate || 'Not found'}`
        });
      };
    } catch (error: any) {
      toast({
        title: "Processing Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processDocument(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processDocument(file);
  };

  return (
    <Card className="p-6">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {processing ? (
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
        ) : (
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        )}
        
        <h3 className="text-lg font-semibold mb-2">
          Upload Renewed {documentType}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Drag and drop or click to select
        </p>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button type="button" disabled={processing}>
            Select File
          </Button>
        </label>
      </div>

      {extractedData && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900">Document Verified</h4>
              <p className="text-sm text-green-700 mt-1">
                Expiration: {extractedData.expirationDate || 'Manual review needed'}
              </p>
              {extractedData.documentNumber && (
                <p className="text-sm text-green-700">
                  Document #: {extractedData.documentNumber}
                </p>
              )}
            </div>
          </div>
          <Button onClick={onSuccess} className="mt-4 w-full">
            Confirm Upload
          </Button>
        </div>
      )}
    </Card>
  );
}