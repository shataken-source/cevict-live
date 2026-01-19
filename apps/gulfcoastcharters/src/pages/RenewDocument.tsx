import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import DocumentRenewalUpload from '@/components/captain/DocumentRenewalUpload';
import { supabase } from '@/lib/supabase';

export default function RenewDocument() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      setError('Invalid renewal link');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('document-renewal-reminders', {
        body: { action: 'verify_token', token }
      });

      if (error || !data.valid) {
        setError('This renewal link has expired or is invalid');
      } else {
        setTokenData(data.tokenData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => navigate('/captain-dashboard'), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h2 className="text-2xl font-bold mb-2">Document Updated!</h2>
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Renew Your Document</h1>
        <p className="text-gray-600 mb-8">
          Upload your renewed {tokenData?.document_type} document
        </p>
        
        <DocumentRenewalUpload
          token={token!}
          documentType={tokenData?.document_type || 'document'}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}