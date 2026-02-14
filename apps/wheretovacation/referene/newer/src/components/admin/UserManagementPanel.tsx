import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserManagementTable } from './UserManagementTable';
import { UserEditModal } from './UserEditModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Users, RefreshCw } from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  user_metadata?: any;
  banned_until?: string;
}

export function UserManagementPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [disableReason, setDisableReason] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const { toast } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'list_users', data: { limit: 100 } }
      });

      if (error) throw error;
      setUsers(data.users.users || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleResetPassword = async (email: string) => {
    setTargetEmail(email);
    setShowPasswordModal(true);
  };

  const confirmResetPassword = async () => {
    try {
      const { error } = await supabase.functions.invoke('admin-user-management', {
        body: { 
          action: 'reset_password', 
          data: { email: targetEmail, newPassword } 
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Password reset successfully'
      });
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleToggleAccount = async (email: string, disable: boolean) => {
    setTargetEmail(email);
    if (disable) {
      setShowDisableModal(true);
    } else {
      await confirmToggleAccount(false);
    }
  };

  const confirmToggleAccount = async (disable: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('admin-user-management', {
        body: { 
          action: 'toggle_account', 
          data: { email: targetEmail, disable, reason: disableReason } 
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: disable ? 'Account disabled' : 'Account enabled'
      });
      setShowDisableModal(false);
      setDisableReason('');
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleSaveUser = async (email: string, role: string, permissions: string[]) => {
    try {
      const { error } = await supabase.functions.invoke('admin-user-management', {
        body: { 
          action: 'update_role', 
          data: { email, role, permissions } 
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'User updated successfully'
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6" />
            <h2 className="text-2xl font-bold">User Management</h2>
          </div>
          <Button onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <UserManagementTable
          users={users}
          onResetPassword={handleResetPassword}
          onToggleAccount={handleToggleAccount}
          onEditUser={(user) => {
            setSelectedUser(user);
            setShowEditModal(true);
          }}
          loading={loading}
        />
      </Card>

      <UserEditModal
        user={selectedUser}
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
      />

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmResetPassword} className="flex-1">
                Reset Password
              </Button>
              <Button onClick={() => setShowPasswordModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Reason</Label>
              <Textarea
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                placeholder="Enter reason for disabling account"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => confirmToggleAccount(true)} variant="destructive" className="flex-1">
                Disable Account
              </Button>
              <Button onClick={() => setShowDisableModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}