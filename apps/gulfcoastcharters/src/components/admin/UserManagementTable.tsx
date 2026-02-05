import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Lock, Ban, CheckCircle, Edit } from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  user_metadata?: any;
  banned_until?: string;
}

interface UserManagementTableProps {
  users: User[];
  onResetPassword: (email: string) => void;
  onToggleAccount: (email: string, disable: boolean) => void;
  onEditUser: (user: User) => void;
  loading?: boolean;
}

export function UserManagementTable({ 
  users, 
  onResetPassword, 
  onToggleAccount, 
  onEditUser,
  loading 
}: UserManagementTableProps) {
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Last Login</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">
                    {user.user_metadata?.role || 'user'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {user.banned_until ? (
                    <Badge variant="destructive">Disabled</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {user.last_sign_in_at 
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onResetPassword(user.email)}
                    >
                      <Lock className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={user.banned_until ? "default" : "destructive"}
                      onClick={() => onToggleAccount(user.email, !user.banned_until)}
                    >
                      {user.banned_until ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}