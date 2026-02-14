import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, User, LogOut } from 'lucide-react';

export function Navigation() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <Home className="w-6 h-6 text-blue-600" />
          <span className="text-2xl font-bold text-blue-600">WhereToVacation</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <User className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="ghost" onClick={() => navigate('/host/dashboard')}>
                Host Dashboard
              </Button>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>

          ) : (
            <Button onClick={() => navigate('/')}>Sign In</Button>
          )}
        </div>
      </div>
    </nav>
  );
}
