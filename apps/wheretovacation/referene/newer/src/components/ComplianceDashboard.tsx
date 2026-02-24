import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw, Filter } from 'lucide-react';
import { ComplianceMetrics } from '@/components/compliance/ComplianceMetrics';
import { ExpirationTimeline } from '@/components/compliance/ExpirationTimeline';
import { VesselComplianceTable } from '@/components/compliance/VesselComplianceTable';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays } from 'date-fns';

export function ComplianceDashboard() {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [vessels, setVessels] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      const { data: boatsData, error: boatsError } = await supabase
        .from('boats')
        .select('*');

      if (boatsError) throw boatsError;

      const { data: docsData, error: docsError } = await supabase
        .from('boat_documents')
        .select('*');

      if (docsError) throw docsError;

      setVessels(boatsData || []);
      setDocuments(docsData || []);
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

  const calculateMetrics = () => {
    const totalVessels = vessels.length;
    let compliantVessels = 0;
    let expiringDocs = 0;
    let expiredDocs = 0;

    const vesselCompliance = vessels.map(vessel => {
      const vesselDocs = documents.filter(d => d.boat_id === vessel.id);
      const total = vesselDocs.length;
      let compliant = 0;
      let expiring = 0;
      let expired = 0;

      vesselDocs.forEach(doc => {
        if (!doc.expiration_date) return;
        const days = differenceInDays(new Date(doc.expiration_date), new Date());
        
        if (days < 0) {
          expired++;
          expiredDocs++;
        } else if (days <= 30) {
          expiring++;
          expiringDocs++;
        } else {
          compliant++;
        }
      });

      const percentage = total > 0 ? Math.round(((compliant + expiring) / total) * 100) : 100;
      if (percentage >= 90) compliantVessels++;

      return {
        id: vessel.id,
        name: vessel.name,
        registrationNumber: vessel.registration_number || 'N/A',
        totalDocuments: total,
        compliantDocuments: compliant,
        expiringDocuments: expiring,
        expiredDocuments: expired,
        compliancePercentage: percentage
      };
    });

    const overallCompliance = totalVessels > 0 
      ? Math.round((compliantVessels / totalVessels) * 100) 
      : 100;

    return {
      totalVessels,
      compliantVessels,
      expiringDocs,
      expiredDocs,
      overallCompliance,
      vesselCompliance
    };
  };

  const getExpiringDocuments = () => {
    return documents
      .filter(doc => doc.expiration_date)
      .map(doc => {
        const vessel = vessels.find(v => v.id === doc.boat_id);
        const days = differenceInDays(new Date(doc.expiration_date), new Date());
        
        return {
          id: doc.id,
          vesselName: vessel?.name || 'Unknown',
          documentType: doc.document_type,
          expirationDate: new Date(doc.expiration_date),
          daysUntilExpiration: days
        };
      })
      .filter(doc => doc.daysUntilExpiration <= 90)
      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const metrics = calculateMetrics();
      
      const { data, error } = await supabase.functions.invoke('compliance-report-pdf', {
        body: {
          metrics,
          vessels: metrics.vesselCompliance,
          expiringDocuments: getExpiringDocuments(),
          generatedDate: new Date().toISOString()
        }
      });

      if (error) throw error;

      const blob = new Blob([Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))], {
        type: 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();

      toast({
        title: 'Success',
        description: 'Compliance report exported successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const metrics = calculateMetrics();
  const expiringDocuments = getExpiringDocuments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Dashboard</h1>
          <p className="text-muted-foreground mt-1">Fleet-wide document status and regulatory tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadComplianceData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportToPDF} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      <ComplianceMetrics {...metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpirationTimeline documents={expiringDocuments} />
        
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Regulatory Requirements</h3>
          <div className="space-y-3">
            {['USCG Documentation', 'Insurance Certificate', 'Safety Equipment Inspection', 'Fire Extinguisher Certification'].map((req, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded">
                <span>{req}</span>
                <span className="text-sm text-muted-foreground">Required</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <VesselComplianceTable 
        vessels={metrics.vesselCompliance}
        onViewDetails={(id) => window.location.href = `/fleet/${id}`}
      />
    </div>
  );
}
