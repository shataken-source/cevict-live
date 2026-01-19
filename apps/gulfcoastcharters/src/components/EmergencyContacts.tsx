import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Anchor, AlertTriangle, Shield, Waves } from 'lucide-react';

interface Contact {
  name: string;
  number: string;
  icon: any;
  description: string;
}

export function EmergencyContacts() {
  const contacts: Contact[] = [
    { name: 'US Coast Guard', number: '911', icon: Anchor, description: 'Marine emergencies & distress' },
    { name: 'Coast Guard Info', number: '1-877-875-4377', icon: Shield, description: 'Non-emergency marine info' },
    { name: 'Marine Weather', number: '1-888-701-8992', icon: Waves, description: 'NOAA weather forecasts' },
    { name: 'Local Fire Dept', number: '911', icon: AlertTriangle, description: 'Fire & rescue emergencies' },
    { name: 'Local Police', number: '911', icon: Shield, description: 'Law enforcement' },
    { name: 'Sea Tow', number: '1-800-473-2869', icon: Anchor, description: 'Marine towing & assistance' },
  ];

  const makeCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <Phone className="w-6 h-6 text-red-600" />
        <h3 className="text-lg font-bold">Emergency Contacts</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Quick access to essential maritime emergency services. Available offline.
      </p>
      <div className="space-y-3">
        {contacts.map((contact, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <contact.icon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">{contact.name}</p>
                <p className="text-xs text-gray-500">{contact.description}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => makeCall(contact.number)} className="bg-gradient-to-r from-blue-600 to-cyan-600">
              <Phone className="w-4 h-4 mr-1" />{contact.number}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
