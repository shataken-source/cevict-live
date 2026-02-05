import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function AIDocumentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const processDocument = async (action: 'extract' | 'verify' | 'summarize') => {
    if (!file || !docType) {
      toast.error('Please select a file and document type');
      return;
    }

    setProcessing(true);
    try {
      const text = await file.text();
      
      const { data, error } = await supabase.functions.invoke('ai-document-processor', {
        body: { document: text, documentType: docType, action }
      });

      if (error) throw error;
      setResult(data);
      toast.success(`Document ${action}ed successfully!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process document');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          AI Document Processor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="receipt">Receipt</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="license">License</SelectItem>
              <SelectItem value="certification">Certification</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Upload Document</Label>
          <input type="file" onChange={handleFileChange} accept=".txt,.pdf,.doc,.docx" className="block w-full" />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => processDocument('extract')} disabled={processing || !file}>
            Extract Data
          </Button>
          <Button onClick={() => processDocument('verify')} disabled={processing || !file} variant="outline">
            Verify
          </Button>
          <Button onClick={() => processDocument('summarize')} disabled={processing || !file} variant="outline">
            Summarize
          </Button>
        </div>

        {result && (
          <Card className="bg-slate-50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                {result.success ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                <div className="flex-1">
                  <p className="font-medium mb-2">Result:</p>
                  <pre className="text-sm whitespace-pre-wrap">{result.result}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
