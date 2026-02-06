import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Shield, Upload, CheckCircle, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function InsuranceVerification({ captainId }: { captainId: string | null }) {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    policyNumber: '',
    provider: '',
    coverageAmount: '',
    coverageType: 'liability',
    issueDate: '',
    expiryDate: '',
    documentUrl: ''
  });

  useEffect(() => {
    if (captainId) {
      loadPolicies();
    }
  }, [captainId]);

  const loadPolicies = async () => {
    try {
      // TODO: Create API endpoint for insurance policies
      // For now, return empty array (no policies loaded from database)
      // You can add mock data here if needed for testing
      setPolicies([]);
    } catch (err) {
      console.error('Error loading policies:', err);
      setPolicies([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: Create API endpoint for submitting insurance policies
      // For now, just add to local state
      const newPolicy = {
        id: Date.now().toString(),
        policy_number: formData.policyNumber,
        provider: formData.provider,
        coverage_amount: parseFloat(formData.coverageAmount) || 0,
        issue_date: formData.issueDate,
        expiry_date: formData.expiryDate,
        status: 'pending' as const,
      };
      setPolicies([...policies, newPolicy]);
      toast.success('Insurance policy submitted for verification');
      setFormData({ policyNumber: '', provider: '', coverageAmount: '', coverageType: 'liability', issueDate: '', expiryDate: '', documentUrl: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Insurance Verification
          </CardTitle>
          <CardDescription>Upload and manage your insurance policies</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Policy Number</Label>
                <Input value={formData.policyNumber} onChange={(e) => setFormData({...formData, policyNumber: e.target.value})} required />
              </div>
              <div>
                <Label>Provider</Label>
                <Input value={formData.provider} onChange={(e) => setFormData({...formData, provider: e.target.value})} required />
              </div>
              <div>
                <Label>Coverage Amount</Label>
                <Input type="number" value={formData.coverageAmount} onChange={(e) => setFormData({...formData, coverageAmount: e.target.value})} required />
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={formData.issueDate} onChange={(e) => setFormData({...formData, issueDate: e.target.value})} required />
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} required />
              </div>
            </div>
            <Button type="submit" disabled={loading}><Upload className="w-4 h-4 mr-2" />Submit Policy</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {policies.map((policy) => (
          <Card key={policy.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{policy.provider}</h3>
                  <p className="text-sm text-muted-foreground">Policy: {policy.policy_number}</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />${policy.coverage_amount.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Expires: {new Date(policy.expiry_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <Badge variant={policy.status === 'active' ? 'default' : policy.status === 'pending' ? 'secondary' : 'destructive'}>
                  {policy.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {policy.status === 'expired' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {policy.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}