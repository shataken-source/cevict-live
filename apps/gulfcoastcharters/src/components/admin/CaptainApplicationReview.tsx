import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, FileText, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  uscg_license: string;
  years_experience: number;
  specialties: string;
  bio: string;
  insurance_provider: string;
  insurance_coverage: string;
  status: string;
  submitted_at: string;
  documents: any;
}

export default function CaptainApplicationReview() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadApplications();
  }, [filter]);

  const loadApplications = async () => {
    const { data } = await supabase.functions.invoke('captain-application-review', {
      body: { action: 'list', status: filter }
    });
    if (data) setApplications(data);
  };

  const handleReview = async (status: string) => {
    if (!selectedApp) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.functions.invoke('captain-application-review', {
        body: {
          action: 'review',
          applicationId: selectedApp.id,
          status,
          adminNotes,
          adminId: user?.id
        }
      });

      toast.success(`Application ${status}!`);
      setSelectedApp(null);
      setAdminNotes('');
      loadApplications();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'secondary',
      under_review: 'default',
      approved: 'default',
      rejected: 'destructive'
    };
    return <Badge variant={variants[status]}>{status.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {['pending', 'under_review', 'approved', 'rejected'].map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'}
            onClick={() => setFilter(s)}>
            {s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {applications.map(app => (
          <Card key={app.id} className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedApp(app)}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{app.full_name}</h3>
                  <p className="text-sm text-gray-600">{app.location}</p>
                  <p className="text-sm mt-2">USCG: {app.uscg_license}</p>
                  <p className="text-sm">Experience: {app.years_experience} years</p>
                </div>
                <div className="text-right">
                  {getStatusBadge(app.status)}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(app.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="font-semibold">{selectedApp.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{selectedApp.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedApp.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-semibold">{selectedApp.location}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Bio</p>
                <p className="mt-1">{selectedApp.bio}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Admin Notes</label>
                <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this application..." rows={4} />
              </div>

              <div className="flex gap-3">
                <Button onClick={() => handleReview('approved')} disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button onClick={() => handleReview('rejected')} disabled={loading}
                  variant="destructive" className="flex-1">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}