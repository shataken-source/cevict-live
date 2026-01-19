import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ExpiringDocument {
  id: string;
  vesselName: string;
  documentType: string;
  expirationDate: Date;
  daysUntilExpiration: number;
}

interface ExpirationTimelineProps {
  documents: ExpiringDocument[];
}

export function ExpirationTimeline({ documents }: ExpirationTimelineProps) {
  const sortedDocs = [...documents].sort((a, b) => 
    a.daysUntilExpiration - b.daysUntilExpiration
  );

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'bg-red-500';
    if (days <= 7) return 'bg-red-400';
    if (days <= 30) return 'bg-yellow-400';
    return 'bg-blue-400';
  };

  const getUrgencyBadge = (days: number) => {
    if (days < 0) return <Badge variant="destructive">Expired</Badge>;
    if (days <= 7) return <Badge variant="destructive">Critical</Badge>;
    if (days <= 30) return <Badge className="bg-yellow-500">Warning</Badge>;
    return <Badge variant="secondary">Upcoming</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h3 className="text-xl font-semibold">Expiration Timeline</h3>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {sortedDocs.map((doc) => (
          <div key={doc.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className={`w-2 h-2 rounded-full mt-2 ${getUrgencyColor(doc.daysUntilExpiration)}`} />
            
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{doc.vesselName}</p>
                  <p className="text-sm text-muted-foreground">{doc.documentType}</p>
                </div>
                {getUrgencyBadge(doc.daysUntilExpiration)}
              </div>
              
              <div className="flex items-center gap-2 mt-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>Expires: {format(doc.expirationDate, 'MMM dd, yyyy')}</span>
                <span className="text-muted-foreground">
                  ({doc.daysUntilExpiration < 0 
                    ? `${Math.abs(doc.daysUntilExpiration)} days overdue`
                    : `${doc.daysUntilExpiration} days remaining`})
                </span>
              </div>
            </div>
          </div>
        ))}

        {sortedDocs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No upcoming expirations</p>
          </div>
        )}
      </div>
    </Card>
  );
}
