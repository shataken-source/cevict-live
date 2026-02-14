import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Key, Database, Mail, Cloud } from 'lucide-react';

const configGroups = [
  { icon: Database, name: 'Supabase', keys: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'] },
  { icon: Cloud, name: 'Firebase', keys: ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID'] },
  { icon: Mail, name: 'Email', keys: ['SENDGRID_API_KEY', 'SMTP_HOST'] }
];

export default function ConfigManager() {
  const [configs, setConfigs] = useState<Record<string, string>>({});

  const handleSave = () => {
    toast.success('Configuration saved successfully');
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Key className="w-5 h-5" />
        API Configuration
      </h3>
      
      <div className="space-y-6">
        {configGroups.map(group => (
          <div key={group.name} className="border-b pb-4">
            <div className="flex items-center gap-2 mb-3">
              <group.icon className="w-4 h-4 text-gray-600" />
              <h4 className="font-semibold">{group.name}</h4>
            </div>
            {group.keys.map(key => (
              <div key={key} className="mb-3">
                <Label className="text-xs">{key}</Label>
                <Input 
                  type="password" 
                  value={configs[key] || ''} 
                  onChange={(e) => setConfigs({...configs, [key]: e.target.value})}
                  placeholder="••••••••••••"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <Button onClick={handleSave} className="w-full mt-4">Save Configuration</Button>
    </Card>
  );
}
