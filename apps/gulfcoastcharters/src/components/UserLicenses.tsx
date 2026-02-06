/**
 * User Licenses Component
 * 
 * Displays user's purchased fishing licenses
 * - List of all licenses
 * - Expiration status
 * - Download/print options
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Loader2, FileText, Calendar, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface UserLicensesProps {
  userId: string;
}

interface License {
  id: string;
  license_number: string;
  state_code: string;
  license_type: string;
  duration: string;
  guest_name: string;
  issue_date: string;
  expiration_date: string;
  status: string;
  price: number;
}

export default function UserLicenses({ userId }: UserLicensesProps) {
  const [loading, setLoading] = useState(true);
  const [licenses, setLicenses] = useState<License[]>([]);

  useEffect(() => {
    loadLicenses();
  }, [userId]);

  const loadLicenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('fishing-license-manager', {
        body: {
          action: 'get_user_licenses',
          userId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setLicenses(data.licenses || []);
    } catch (error: any) {
      console.error('Error loading licenses:', error);
      toast.error('Failed to load licenses');
    } finally {
      setLoading(false);
    }
  };

  const isExpired = (expirationDate: string) => {
    return new Date(expirationDate) < new Date();
  };

  const getStatusBadge = (status: string, expirationDate: string) => {
    if (isExpired(expirationDate)) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (status === 'active') {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (licenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Fishing Licenses</CardTitle>
          <CardDescription>You haven't purchased any licenses yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Fishing Licenses</CardTitle>
        <CardDescription>
          View and manage your fishing licenses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {licenses.map((license) => (
          <div
            key={license.id}
            className="p-4 border rounded-lg space-y-2"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{license.license_number}</h3>
                  {getStatusBadge(license.status, license.expiration_date)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {license.state_code} - {license.license_type}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Expires: {new Date(license.expiration_date).toLocaleDateString()}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {license.guest_name} • ${license.price}
                </p>
              </div>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                View
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
