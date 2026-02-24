import { useState } from 'react';
import { Building2, Users, CreditCard, FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CorporateAccountManager() {
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Corporate account request submitted
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Corporate & Group Bookings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="benefits">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="benefits" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                  <p className="font-semibold">Volume Discounts</p>
                  <p className="text-sm text-gray-600">Save 15-30% on bulk bookings</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <CreditCard className="w-5 h-5 text-green-600 mt-1" />
                <div>
                  <p className="font-semibold">Net 30 Payment Terms</p>
                  <p className="text-sm text-gray-600">Invoice billing available</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600 mt-1" />
                <div>
                  <p className="font-semibold">Priority Booking</p>
                  <p className="text-sm text-gray-600">Reserved slots for your team</p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Company Name</Label>
                <Input 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                />
              </div>
              <div>
                <Label>Contact Email</Label>
                <Input 
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@company.com"
                />
              </div>
              <Button type="submit" className="w-full">Request Corporate Account</Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
