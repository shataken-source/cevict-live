import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Fish, MapPin, Calendar, DollarSign, FileText } from 'lucide-react';

const states = [
  {
    name: 'Texas',
    code: 'TX',
    url: 'https://tpwd.texas.gov/fishboat/fish/licenses/',
    phone: '1-800-895-4248',
    licenses: [
      { type: 'Resident Saltwater', duration: 'Annual', price: 35 },
      { type: 'Non-Resident Saltwater', duration: 'Annual', price: 63 },
      { type: 'One-Day All Water', duration: '1 Day', price: 11 },
    ]
  },
  {
    name: 'Louisiana',
    code: 'LA',
    url: 'https://www.wlf.louisiana.gov/licenses',
    phone: '1-888-765-2602',
    licenses: [
      { type: 'Resident Basic Fishing', duration: 'Annual', price: 20 },
      { type: 'Non-Resident Basic', duration: 'Annual', price: 60 },
      { type: 'Trip License', duration: '3 Days', price: 15 },
    ]
  },
  {
    name: 'Mississippi',
    code: 'MS',
    url: 'https://www.mdwfp.com/fishing-boating/licenses/',
    phone: '1-800-5-GO-HUNT',
    licenses: [
      { type: 'Resident All Water', duration: 'Annual', price: 23 },
      { type: 'Non-Resident All Water', duration: 'Annual', price: 58 },
      { type: 'One-Day All Water', duration: '1 Day', price: 8 },
    ]
  },
  {
    name: 'Alabama',
    code: 'AL',
    url: 'https://www.outdooralabama.com/licenses',
    phone: '1-888-848-6887',
    licenses: [
      { type: 'Resident Saltwater', duration: 'Annual', price: 26.40 },
      { type: 'Non-Resident Saltwater', duration: 'Annual', price: 56.40 },
      { type: 'Trip License', duration: '7 Days', price: 30.90 },
    ]
  },
  {
    name: 'Florida',
    code: 'FL',
    url: 'https://gooutdoorsflorida.com/',
    phone: '1-888-347-4356',
    licenses: [
      { type: 'Resident Saltwater', duration: 'Annual', price: 17 },
      { type: 'Non-Resident Saltwater', duration: 'Annual', price: 47 },
      { type: 'Non-Resident 3-Day', duration: '3 Days', price: 17 },
    ]
  },
];

export default function FishingLicensePortal() {
  const [selectedState, setSelectedState] = useState(states[0]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Get Your Fishing License</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Purchase your fishing license online before your trip. Select your state to view options and pricing.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {states.map((state) => (
          <Button
            key={state.code}
            variant={selectedState.code === state.code ? 'default' : 'outline'}
            onClick={() => setSelectedState(state)}
            className="min-w-[100px]"
          >
            <MapPin className="w-4 h-4 mr-2" />
            {state.name}
          </Button>
        ))}
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fish className="w-6 h-6" />
            {selectedState.name} Fishing Licenses
          </CardTitle>
          <CardDescription>
            Purchase directly from {selectedState.name} Department of Wildlife
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            {selectedState.licenses.map((license, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                <div className="space-y-1">
                  <h4 className="font-semibold">{license.type}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {license.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${license.price}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary">{license.duration}</Badge>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t space-y-4">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => window.open(selectedState.url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Purchase License Online - {selectedState.name}
            </Button>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Phone: {selectedState.phone}</span>
              </p>
              <p className="text-xs">
                Note: Many charter captains include licenses in their trip price. Check with your captain before purchasing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
