import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

interface ComplianceMetricsProps {
  totalVessels: number;
  compliantVessels: number;
  expiringDocs: number;
  expiredDocs: number;
  overallCompliance: number;
}

export function ComplianceMetrics({
  totalVessels,
  compliantVessels,
  expiringDocs,
  expiredDocs,
  overallCompliance
}: ComplianceMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Vessels</p>
            <p className="text-3xl font-bold mt-2">{totalVessels}</p>
          </div>
          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Compliant</p>
            <p className="text-3xl font-bold mt-2 text-green-600">{compliantVessels}</p>
          </div>
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Expiring Soon</p>
            <p className="text-3xl font-bold mt-2 text-yellow-600">{expiringDocs}</p>
          </div>
          <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Expired</p>
            <p className="text-3xl font-bold mt-2 text-red-600">{expiredDocs}</p>
          </div>
          <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Overall Compliance</p>
            <p className="text-3xl font-bold mt-2">{overallCompliance}%</p>
          </div>
          <Badge variant={overallCompliance >= 90 ? 'default' : overallCompliance >= 70 ? 'secondary' : 'destructive'} className="text-lg px-3 py-1">
            {overallCompliance >= 90 ? 'Excellent' : overallCompliance >= 70 ? 'Good' : 'Needs Attention'}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
