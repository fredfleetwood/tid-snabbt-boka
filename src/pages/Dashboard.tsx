
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, LogOut, Plus, Eye, EyeOff, Shield } from 'lucide-react';
import { maskPersonnummer, logSecurityEvent } from '@/utils/security';

interface BookingConfig {
  id: string;
  personnummer: string;
  license_type: string;
  exam: string;
  vehicle_language: string[];
  locations: string[];
  is_active: boolean;
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<BookingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSensitiveData, setShowSensitiveData] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', { page: 'dashboard' });
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      logSecurityEvent('DASHBOARD_ACCESS', { userId: user.id });
      fetchBookingConfigs();
    }
  }, [user]);

  const fetchBookingConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching booking configs:', error);
        logSecurityEvent('DATA_FETCH_ERROR', { error: error.message });
        toast({
          title: "Fel",
          description: "Kunde inte hämta bokningskonfigurationer",
          variant: "destructive",
        });
      } else {
        setConfigs(data || []);
        logSecurityEvent('DATA_FETCH_SUCCESS', { configCount: data?.length || 0 });
      }
    } catch (error) {
      console.error('Error:', error);
      logSecurityEvent('UNEXPECTED_ERROR', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    logSecurityEvent('USER_LOGOUT', { userId: user?.id });
    await signOut();
    navigate('/');
  };

  const toggleSensitiveData = (configId: string) => {
    setShowSensitiveData(prev => ({
      ...prev,
      [configId]: !prev[configId]
    }));
    
    logSecurityEvent('SENSITIVE_DATA_TOGGLE', { 
      configId, 
      revealed: !showSensitiveData[configId] 
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                Inloggad som: {user.email}
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
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-900">Datasäkerhet</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Dina personnummer är maskerade för säkerhet. Klicka på ögon-ikonen för att visa fullständig information när det behövs.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <Button onClick={() => navigate('/dashboard/new-config')}>
            <Plus className="h-4 w-4 mr-2" />
            Ny bokningskonfiguration
          </Button>
        </div>

        {configs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Inga bokningskonfigurationer ännu
              </h3>
              <p className="text-gray-600 mb-4">
                Skapa din första bokningskonfiguration för att börja söka efter lediga provtider automatiskt.
              </p>
              <Button onClick={() => navigate('/dashboard/new-config')}>
                Kom igång
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {configs.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{config.exam}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      config.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {config.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Körkort: {config.license_type}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <strong>Personnummer:</strong>{' '}
                        <span className="font-mono">
                          {showSensitiveData[config.id] 
                            ? config.personnummer 
                            : maskPersonnummer(config.personnummer)
                          }
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSensitiveData(config.id)}
                        className="h-6 w-6 p-0 ml-2"
                        title={showSensitiveData[config.id] ? "Dölj personnummer" : "Visa personnummer"}
                      >
                        {showSensitiveData[config.id] ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p><strong>Språk:</strong> {config.vehicle_language.join(', ')}</p>
                    <p><strong>Platser:</strong> {config.locations.length > 0 ? config.locations.join(', ') : 'Alla'}</p>
                    <p><strong>Skapad:</strong> {new Date(config.created_at).toLocaleDateString('sv-SE')}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
