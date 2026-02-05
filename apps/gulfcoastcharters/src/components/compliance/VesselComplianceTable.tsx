import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Eye, FileText } from 'lucide-react';

interface VesselCompliance {
  id: string;
  name: string;
  registrationNumber: string;
  totalDocuments: number;
  compliantDocuments: number;
  expiringDocuments: number;
  expiredDocuments: number;
  compliancePercentage: number;
}

interface VesselComplianceTableProps {
  vessels: VesselCompliance[];
  onViewDetails: (vesselId: string) => void;
}

export function VesselComplianceTable({ vessels, onViewDetails }: VesselComplianceTableProps) {
  const getComplianceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-xl font-semibold">Vessel Compliance Status</h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vessel Name</TableHead>
              <TableHead>Registration</TableHead>
              <TableHead className="text-center">Total Docs</TableHead>
              <TableHead className="text-center">Compliant</TableHead>
              <TableHead className="text-center">Expiring</TableHead>
              <TableHead className="text-center">Expired</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vessels.map((vessel) => (
              <TableRow key={vessel.id}>
                <TableCell className="font-medium">{vessel.name}</TableCell>
                <TableCell className="text-muted-foreground">{vessel.registrationNumber}</TableCell>
                <TableCell className="text-center">{vessel.totalDocuments}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {vessel.compliantDocuments}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {vessel.expiringDocuments > 0 ? (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      {vessel.expiringDocuments}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {vessel.expiredDocuments > 0 ? (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {vessel.expiredDocuments}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Progress value={vessel.compliancePercentage} className="w-24" />
                    <span className={`font-semibold ${getComplianceColor(vessel.compliancePercentage)}`}>
                      {vessel.compliancePercentage}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(vessel.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
