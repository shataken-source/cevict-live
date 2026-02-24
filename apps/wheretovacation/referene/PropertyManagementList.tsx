import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Property } from '@/types';
import { Edit, Eye, Calendar, DollarSign } from 'lucide-react';

interface PropertyManagementListProps {
  properties: Property[];
  onEdit: (propertyId: string) => void;
  onViewAnalytics: (propertyId: string) => void;
  onManageCalendar: (propertyId: string) => void;
  onManagePricing: (propertyId: string) => void;
}

export function PropertyManagementList({ 
  properties, 
  onEdit, 
  onViewAnalytics, 
  onManageCalendar,
  onManagePricing 
}: PropertyManagementListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Properties ({properties.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {properties.map((property) => (
            <div key={property.id} className="border rounded-lg p-4">
              <div className="flex gap-4">
                <img 
                  src={property.images[0]} 
                  alt={property.title}
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{property.title}</h4>
                      <p className="text-sm text-muted-foreground">{property.city}, {property.state}</p>
                    </div>
                    <Badge variant={property.is_active ? 'default' : 'secondary'}>
                      {property.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm mb-3">${property.price_per_night}/night</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(property.id)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onManageCalendar(property.id)}>
                      <Calendar className="h-4 w-4 mr-1" /> Calendar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onManagePricing(property.id)}>
                      <DollarSign className="h-4 w-4 mr-1" /> Pricing
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onViewAnalytics(property.id)}>
                      <Eye className="h-4 w-4 mr-1" /> Analytics
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
