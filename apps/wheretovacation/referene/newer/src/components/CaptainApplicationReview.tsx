import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Download, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function CaptainApplicationReview() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    // Mock data - replace with actual API call
    setApplications([
      {
        id: '1',
        fullName: 'John Smith',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        location: 'Tampa, FL',
        uscgLicense: 'USCG-789012',
        yearsExperience: 12,
        specialties: 'Deep Sea, Inshore',
        status: 'pending',
        submittedAt: '2024-01-15',
        documents: {
          uscgLicense: 'doc1.pdf',
          insurance: 'doc2.pdf'
        }
      }
    ]);
  };

  const handleReview = async (applicationId: string, approved: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('captain-auth', {
        body: {
          action: 'review_application',
          applicationId,
          approved,
          notes: reviewNotes
        }
      });

      if (error) throw error;

      toast({
        title: approved ? 'Application Approved' : 'Application Rejected',
        description: `The application has been ${approved ? 'approved' : 'rejected'}.`
      });

      setSelectedApp(null);
      loadApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (docPath: string) => {
    const { data, error } = await supabase.storage
      .from('captain-verification-docs')
      .download(docPath);
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to download document',
        variant: 'destructive'
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = docPath.split('/').pop() || 'document';
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Captain Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-4">
              {applications.filter(app => app.status === 'pending').map(app => (
                <Card key={app.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{app.fullName}</h3>
                        <p className="text-sm text-gray-600">{app.location}</p>
                        <p className="text-sm mt-2">USCG: {app.uscgLicense}</p>
                        <p className="text-sm">Experience: {app.yearsExperience} years</p>
                        <Badge className="mt-2">{app.status}</Badge>
                      </div>
                      <Button onClick={() => setSelectedApp(app)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="approved">
              <p className="text-center text-gray-500 py-8">No approved applications</p>
            </TabsContent>

            <TabsContent value="rejected">
              <p className="text-center text-gray-500 py-8">No rejected applications</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
                  <p className="font-semibold">{selectedApp.fullName}</p>
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
                <div>
                  <p className="text-sm text-gray-600">USCG License</p>
                  <p className="font-semibold">{selectedApp.uscgLicense}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Years Experience</p>
                  <p className="font-semibold">{selectedApp.yearsExperience}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-2">Documents</p>
                <div className="space-y-2">
                  {Object.entries(selectedApp.documents || {}).map(([type, path]) => (
                    <Button
                      key={type}
                      variant="outline"
                      onClick={() => downloadDocument(path as string)}
                      className="w-full justify-start"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {type}
                      <Download className="w-4 h-4 ml-auto" />
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Review Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleReview(selectedApp.id, true)}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleReview(selectedApp.id, false)}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
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
