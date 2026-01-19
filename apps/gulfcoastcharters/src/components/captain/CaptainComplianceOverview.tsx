import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Upload, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { differenceInDays, format } from 'date-fns';

interface CaptainComplianceOverviewProps {
  captainId: string;
  onUploadClick?: (docType: string) => void;
}

export function CaptainComplianceOverview({ captainId, onUploadClick }: CaptainComplianceOverviewProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const requiredDocs = [
    'USCG License',
    'Insurance',
    'Vessel Registration',
    'Safety Certification',
    'First Aid',
    'CPR Certification'
  ];

  useEffect(() => {
    loadDocuments();
  }, [captainId]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('captain_documents')
        .select('*')
        .eq('captain_id', captainId);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatus = (docType: string) => {
    const doc = documents.find(d => d.document_type === docType);
    if (!doc) return { status: 'missing', color: 'gray', days: null };

    if (!doc.expiration_date) return { status: 'valid', color: 'green', days: null };

    const days = differenceInDays(new Date(doc.expiration_date), new Date());
    
    if (days < 0) return { status: 'expired', color: 'red', days };
    if (days <= 7) return { status: 'critical', color: 'red', days };
    if (days <= 30) return { status: 'expiring', color: 'yellow', days };
    return { status: 'valid', color: 'green', days };
  };

  const calculateCompliance = () => {
    let valid = 0;
    let expiring = 0;
    let expired = 0;
    let missing = 0;

    requiredDocs.forEach(docType => {
      const status = getDocumentStatus(docType);
      if (status.status === 'valid') valid++;
      else if (status.status === 'expiring') expiring++;
      else if (status.status === 'expired' || status.status === 'critical') expired++;
      else missing++;
    });

    const score = Math.round(((valid + expiring) / requiredDocs.length) * 100);
    return { valid, expiring, expired, missing, score };
  };

  const metrics = calculateCompliance();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'expiring': return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'expired':
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string, days: number | null) => {
    switch (status) {
      case 'valid': return <Badge className="bg-green-600">Valid</Badge>;
      case 'expiring': return <Badge className="bg-yellow-600">Expires in {days} days</Badge>;
      case 'critical': return <Badge variant="destructive">Expires in {days} days!</Badge>;
      case 'expired': return <Badge variant="destructive">Expired {Math.abs(days!)} days ago</Badge>;
      default: return <Badge variant="outline">Not Uploaded</Badge>;
    }
  };

  if (loading) return <div>Loading compliance data...</div>;

  return (
    <div className="space-y-6">
      {/* Compliance Score */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold">Compliance Score</h3>
            <p className="text-muted-foreground">Overall document health status</p>
          </div>
          <div className="text-5xl font-bold text-blue-600">{metrics.score}%</div>
        </div>
        <Progress value={metrics.score} className="h-3" />
        <div className="flex gap-4 mt-4 text-sm">
          <span className="text-green-600 font-semibold">{metrics.valid} Valid</span>
          <span className="text-yellow-600 font-semibold">{metrics.expiring} Expiring</span>
          <span className="text-red-600 font-semibold">{metrics.expired} Expired</span>
          <span className="text-gray-600 font-semibold">{metrics.missing} Missing</span>
        </div>
      </Card>

      {/* Document Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {requiredDocs.map(docType => {
          const { status, color, days } = getDocumentStatus(docType);
          const doc = documents.find(d => d.document_type === docType);
          
          return (
            <Card key={docType} className={`p-4 border-l-4 ${
              color === 'green' ? 'border-l-green-600' :
              color === 'yellow' ? 'border-l-yellow-600' :
              color === 'red' ? 'border-l-red-600' : 'border-l-gray-300'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <h4 className="font-semibold text-sm">{docType}</h4>
                </div>
                {getStatusBadge(status, days)}
              </div>
              
              {doc?.expiration_date && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Calendar className="h-3 w-3" />
                  <span>Expires: {format(new Date(doc.expiration_date), 'MMM dd, yyyy')}</span>
                </div>
              )}

              <Button 
                size="sm" 
                variant={status === 'missing' ? 'default' : 'outline'}
                className="w-full"
                onClick={() => onUploadClick?.(docType)}
              >
                <Upload className="h-3 w-3 mr-2" />
                {status === 'missing' ? 'Upload' : 'Update'}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
