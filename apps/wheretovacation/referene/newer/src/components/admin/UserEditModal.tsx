import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface User {
  id: string;
  email: string;
  user_metadata?: any;
}

interface UserEditModalProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSave: (email: string, role: string, permissions: string[]) => void;
}

const AVAILABLE_PERMISSIONS = [
  'manage_bookings',
  'manage_captains',
  'manage_charters',
  'view_analytics',
  'manage_users',
  'manage_payments',
  'send_notifications'
];

export function UserEditModal({ user, open, onClose, onSave }: UserEditModalProps) {
  const [role, setRole] = useState(user?.user_metadata?.role || 'user');
  const [permissions, setPermissions] = useState<string[]>(
    user?.user_metadata?.permissions || []
  );

  const handlePermissionToggle = (permission: string) => {
    setPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSave = () => {
    if (user) {
      onSave(user.email, role, permissions);
      onClose();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user.email} disabled />
          </div>
          
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="captain">Captain</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Permissions</Label>
            <div className="space-y-2 mt-2">
              {AVAILABLE_PERMISSIONS.map(permission => (
                <div key={permission} className="flex items-center space-x-2">
                  <Checkbox
                    checked={permissions.includes(permission)}
                    onCheckedChange={() => handlePermissionToggle(permission)}
                  />
                  <label className="text-sm">{permission.replace(/_/g, ' ')}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">Save Changes</Button>
            <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}