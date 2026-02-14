import { useUser } from '@/contexts/UserContext';
import { Navigate } from 'react-router-dom';
import EnterpriseSecurityDashboard from '@/components/EnterpriseSecurityDashboard';

export default function AdminSecurity() {
  const { user } = useUser();
  if (!user || user.level !== 1) return <Navigate to="/" replace />;
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Enterprise Security Dashboard</h1>
      <EnterpriseSecurityDashboard />
    </div>
  );
}
