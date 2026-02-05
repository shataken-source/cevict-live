import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Crown, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function MembershipAdmin() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // Mock data - replace with actual Supabase query
    const mockUsers = [
      { id: '1', email: 'user@example.com', type: 'user', hasMembership: false, permissions: {} },
      { id: '2', email: 'captain@example.com', type: 'captain', hasMembership: true, permissions: { videoUpload: true } }
    ];
    setUsers(mockUsers);
  };

  const togglePermission = async (userId: string, permissionKey: string, value: boolean) => {
    try {
      await supabase.functions.invoke('membership-manager', {
        body: {
          action: 'setPermission',
          userId,
          permissionKey,
          permissionValue: value
        }
      });
      
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, permissions: { ...u.permissions, [permissionKey]: value } }
          : u
      ));
      
      toast.success('Permission updated');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Membership Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-3">
            {filteredUsers.map(user => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {user.type === 'captain' ? (
                        <Shield className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Crown className="w-5 h-5 text-purple-600" />
                      )}
                      <div>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-sm text-muted-foreground capitalize">{user.type}</div>
                      </div>
                    </div>
                    <Badge variant={user.hasMembership ? 'default' : 'secondary'}>
                      {user.hasMembership ? 'Premium' : 'Free'}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Video Upload Access</Label>
                      <Switch
                        checked={user.permissions?.videoUpload || false}
                        onCheckedChange={(checked) => 
                          togglePermission(user.id, 'videoUpload', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Featured Listings</Label>
                      <Switch
                        checked={user.permissions?.featuredListings || false}
                        onCheckedChange={(checked) => 
                          togglePermission(user.id, 'featuredListings', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Priority Support</Label>
                      <Switch
                        checked={user.permissions?.prioritySupport || false}
                        onCheckedChange={(checked) => 
                          togglePermission(user.id, 'prioritySupport', checked)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}