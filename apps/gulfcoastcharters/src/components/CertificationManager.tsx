import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertTriangle, CheckCircle, Clock, FileText, Shield, RefreshCw, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Certification {
  id: string;
  cert_type: string;
  cert_name: string;
  cert_number: string;
  mmr_number?: string;
  provider?: string;
  coverage_amount?: number;
  expiration_date: string;
  status: string;
  daysUntilExpiration: number;
  uscg_verified?: boolean;
  insurance_verified?: boolean;
}

export function CertificationManager({ captainId }: { captainId: string }) {
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(false);
  const [certs, setCerts] = useState<Certification[]>([
    {
      id: '1',
      cert_type: 'uscg_license',
      cert_name: 'USCG Master License',
      cert_number: 'ML-1234567',
      mmr_number: 'MMR-987654',
      expiration_date: '2025-12-15',
      status: 'active',
      daysUntilExpiration: 28,
      uscg_verified: true
    },
    {
      id: '2',
      cert_type: 'insurance',
      cert_name: 'Marine Liability Insurance',
      cert_number: 'BOAT-US-789012',
      provider: 'BoatUS',
      coverage_amount: 1000000,
      expiration_date: '2026-03-20',
      status: 'active',
      daysUntilExpiration: 123,
      insurance_verified: true
    }
  ]);

  const verifyInsurance = async (cert: Certification) => {
    setVerifying(true);
    try {
      // TODO: Create API endpoint for insurance verification
      // For now, just show a message
      console.log('Insurance verification requested for:', cert);
      toast({
        title: 'Verification in Progress',
        description: 'Insurance verification feature coming soon. This will verify your policy with the provider.',
      });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to verify insurance', variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (days: number) => {
    if (days < 0) return <Badge variant="destructive">Expired</Badge>;
    if (days <= 30) return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Expiring Soon</Badge>;
    if (days <= 60) return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Renewal Due</Badge>;
    return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Certification Management</h2>
        <Button>Add Certification</Button>
      </div>

      <div className="grid gap-4">
        {certs.map((cert) => (
          <Card key={cert.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-lg">{cert.cert_name}</h3>
                  {getStatusBadge(cert.daysUntilExpiration)}
                  {cert.uscg_verified && <Badge className="bg-blue-600"><Shield className="w-3 h-3 mr-1" />USCG Verified</Badge>}
                  {cert.insurance_verified && <Badge className="bg-green-600"><Shield className="w-3 h-3 mr-1" />Verified</Badge>}
                </div>
                <p className="text-sm text-gray-600 mb-1">Number: {cert.cert_number}</p>
                {cert.provider && <p className="text-sm text-gray-600 mb-1">Provider: {cert.provider}</p>}
                {cert.coverage_amount && (
                  <p className="text-sm text-gray-600 mb-1 flex items-center">
                    <DollarSign className="w-3 h-3 mr-1" />
                    Coverage: ${cert.coverage_amount.toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-gray-600">Expires: {cert.expiration_date}</p>
                <p className="text-sm font-medium mt-2">
                  {cert.daysUntilExpiration > 0 ? `${cert.daysUntilExpiration} days remaining` : 'EXPIRED'}
                </p>
              </div>
              <div className="flex gap-2">
                {cert.cert_type === 'insurance' && (
                  <Button variant="outline" size="sm" onClick={() => verifyInsurance(cert)} disabled={verifying}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
                    Verify
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
