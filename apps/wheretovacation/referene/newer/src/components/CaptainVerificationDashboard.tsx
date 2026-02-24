import { useState, useEffect } from 'react';
import { Shield, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Verification {
  id: string;
  verification_type: string;
  status: string;
  verified_at: string | null;
  expiry_date: string | null;
}

export default function CaptainVerificationDashboard() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('captain_verifications')
      .select('*')
      .eq('captain_id', user.id);

    if (data) setVerifications(data);
  };

  const initiateBackgroundCheck = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.functions.invoke('background-check-service', {
        body: {
          action: 'initiate',
          captainId: user?.id,
          applicationId: null
        }
      });

      toast.success('Background check initiated!');
      loadVerifications();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const completionPercentage = verifications.length > 0
    ? (verifications.filter(v => v.status === 'verified').length / 4) * 100
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Verification Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={completionPercentage} className="mb-2" />
          <p className="text-sm text-gray-600">
            {Math.round(completionPercentage)}% Complete
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {[
          { type: 'uscg_license', title: 'USCG License', icon: Shield },
          { type: 'background_check', title: 'Background Check', icon: FileText },
          { type: 'insurance', title: 'Insurance', icon: Shield },
          { type: 'references', title: 'References', icon: CheckCircle }
        ].map(item => {
          const verification = verifications.find(v => v.verification_type === item.type);
          const Icon = item.icon;

          return (
            <Card key={item.type}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Icon className="w-6 h-6 text-blue-600" />
                    <h3 className="font-semibold">{item.title}</h3>
                  </div>
                  {verification && getStatusIcon(verification.status)}
                </div>

                {verification ? (
                  <div className="space-y-2">
                    <Badge variant={verification.status === 'verified' ? 'default' : 'secondary'}>
                      {verification.status}
                    </Badge>
                    {verification.verified_at && (
                      <p className="text-xs text-gray-600">
                        Verified: {new Date(verification.verified_at).toLocaleDateString()}
                      </p>
                    )}
                    {verification.expiry_date && (
                      <p className="text-xs text-gray-600">
                        Expires: {new Date(verification.expiry_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <Badge variant="secondary">Not Started</Badge>
                    {item.type === 'background_check' && (
                      <Button size="sm" className="mt-3 w-full" 
                        onClick={initiateBackgroundCheck} disabled={loading}>
                        Start Background Check
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}