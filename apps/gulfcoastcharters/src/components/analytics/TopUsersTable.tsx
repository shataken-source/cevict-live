import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface TopUser {
  id: string;
  name: string;
  email: string;
  bookings: number;
  totalSpent: number;
}

interface TopUsersTableProps {
  users: TopUser[];
}

export default function TopUsersTable({ users }: TopUsersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Active Users</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>Total Spent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Badge variant={index === 0 ? "default" : "secondary"}>#{index + 1}</Badge>
                </TableCell>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.bookings}</TableCell>
                <TableCell>${user.totalSpent.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}