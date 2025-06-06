
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logSecurityEvent } from '@/utils/security';

const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    logSecurityEvent('USER_LOGOUT', { userId: user?.id });
    await signOut();
    navigate('/');
  };

  return (
    <>
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-blue-600">Snabbtkörprov.se</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Säker anslutning</span>
              </div>
              <span className="text-sm text-gray-600">
                Inloggad som: {user?.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Instrumentpanel</h2>
          <p className="text-gray-600">
            Hantera dina automatiska bokningar av körkortsprov
          </p>
        </div>
      </div>
    </>
  );
};

export default DashboardHeader;
