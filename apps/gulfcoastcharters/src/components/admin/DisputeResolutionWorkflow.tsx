import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { FileText, MessageSquare, CheckCircle, XCircle } from 'lucide-react';

interface Dispute {
  id: string;
  affiliate_id: string;
  affiliate_name: string;
  dispute_type: string;
  description: string;
  evidence: any[];
  status: 'open' | 'investigating' | 'resolved' | 'rejected';
  created_at: string;
  resolution_notes?: string;
}

export default function DisputeResolutionWorkflow() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleResolve = async (disputeId: string, resolution: 'resolved' | 'rejected') => {
    const { error } = await supabase
      .from('affiliate_disputes')
      .update({ 
        status: resolution, 
        resolution_notes: resolutionNotes,
        resolved_at: new Date().toISOString()
      })
      .eq('id', disputeId);

    if (!error) {
      alert(`Dispute ${resolution} successfully`);
      setResolutionNotes('');
      loadDisputes();
    }
  };

  const loadDisputes = async () => {
    const { data } = await supabase
      .from('affiliate_disputes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setDisputes(data);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open Disputes</TabsTrigger>
          <TabsTrigger value="investigating">Investigating</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4">
          {disputes.filter(d => d.status === 'open').map((dispute) => (
            <Card key={dispute.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{dispute.dispute_type}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dispute.affiliate_name} • {new Date(dispute.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge>{dispute.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{dispute.description}</p>
                
                <div className="flex gap-2 items-center">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{dispute.evidence?.length || 0} evidence files</span>
                </div>

                <Textarea
                  placeholder="Add resolution notes..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="min-h-[100px]"
                />

                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleResolve(dispute.id, 'resolved')}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Resolve
                  </Button>
                  <Button 
                    onClick={() => handleResolve(dispute.id, 'rejected')}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Dispute
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="investigating">
          <p className="text-muted-foreground">No disputes under investigation</p>
        </TabsContent>

        <TabsContent value="resolved">
          <p className="text-muted-foreground">View resolved disputes</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
