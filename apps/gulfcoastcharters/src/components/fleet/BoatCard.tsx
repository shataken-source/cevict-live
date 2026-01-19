import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ship, Calendar, Users, Fuel, CheckCircle, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BoatCardProps {
  boat: any;
  onSelect: (boat: any) => void;
}

export function BoatCard({ boat, onSelect }: BoatCardProps) {
  const [verificationBadges, setVerificationBadges] = useState<string[]>([]);

  useEffect(() => {
    loadVerificationStatus();
  }, [boat.id]);

  const loadVerificationStatus = async () => {
    const { data } = await supabase.functions.invoke('boat-documentation-manager', {
      body: { action: 'list', boatId: boat.id }
    });
    
    if (data?.documents) {
      const verified = data.documents.filter((d: any) => 
        d.verification_status === 'verified' && 
        (!d.expiration_date || new Date(d.expiration_date) > new Date())
      );
      setVerificationBadges(verified.map((d: any) => d.document_type));
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSelect(boat)}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{boat.name}</CardTitle>
          <Badge variant={boat.status === 'active' ? 'default' : 'secondary'}>
            {boat.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{boat.manufacturer} {boat.boat_type}</p>
        {verificationBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {verificationBadges.slice(0, 3).map(badge => (
              <Badge key={badge} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                {badge.split(' ')[0]}
              </Badge>
            ))}
            {verificationBadges.length > 3 && (
              <Badge variant="outline" className="text-xs">+{verificationBadges.length - 3}</Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Ship className="h-4 w-4" />
            <span>{boat.length_feet}ft • {boat.year}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            <span>Capacity: {boat.passenger_capacity}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Fuel className="h-4 w-4" />
            <span>{boat.engine_hours} engine hours</span>
          </div>
        </div>
        <Button className="w-full mt-4" onClick={(e) => { e.stopPropagation(); onSelect(boat); }}>
          Manage Boat
        </Button>
      </CardContent>
    </Card>
  );
}

