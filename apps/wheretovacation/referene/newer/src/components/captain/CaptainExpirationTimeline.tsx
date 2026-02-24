import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface Document {
  id: string;
  document_type: string;
  expiration_date: string | null;
  name: string;
}

interface CaptainExpirationTimelineProps {
  documents: Document[];
}

export function CaptainExpirationTimeline({ documents }: CaptainExpirationTimelineProps) {
  const expiringDocs = documents
    .filter(doc => doc.expiration_date)
    .map(doc => ({
      ...doc,
      daysUntilExpiration: differenceInDays(new Date(doc.expiration_date!), new Date())
    }))
    .filter(doc => doc.daysUntilExpiration <= 90)
    .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

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
        <h3 className="text-xl font-semibold">Renewal Timeline</h3>
        <Badge variant="outline">{expiringDocs.length} items</Badge>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {expiringDocs.map((doc) => (
          <div key={doc.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getUrgencyColor(doc.daysUntilExpiration)}`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="font-semibold">{doc.document_type}</p>
                  <p className="text-sm text-muted-foreground truncate">{doc.name}</p>
                </div>
                {getUrgencyBadge(doc.daysUntilExpiration)}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Expires: {format(new Date(doc.expiration_date!), 'MMM dd, yyyy')}</span>
                <span>
                  ({doc.daysUntilExpiration < 0 
                    ? `${Math.abs(doc.daysUntilExpiration)} days overdue`
                    : `${doc.daysUntilExpiration} days remaining`})
                </span>
              </div>
            </div>
          </div>
        ))}

        {expiringDocs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No upcoming expirations in the next 90 days</p>
          </div>
        )}
      </div>
    </Card>
  );
}
