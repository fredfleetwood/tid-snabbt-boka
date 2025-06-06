
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { maskPersonnummer, logSecurityEvent } from '@/utils/security';
import { useSubscription } from '@/hooks/useSubscription';
import SubscriptionButton from '@/components/SubscriptionButton';

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

interface UserSettingsCardProps {
  configs: BookingConfig[];
}

const UserSettingsCard = ({ configs }: UserSettingsCardProps) => {
  const navigate = useNavigate();
  const { subscribed } = useSubscription();
  const [showSensitiveData, setShowSensitiveData] = useState<Record<string, boolean>>({});

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

  if (!subscribed) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Uppgradera till Premium
          </h3>
          <p className="text-gray-600 mb-4">
            För att skapa bokningskonfigurationer och använda automatisk bokning behöver du en aktiv prenumeration.
          </p>
          <SubscriptionButton />
        </CardContent>
      </Card>
    );
  }

  if (configs.length === 0) {
    return (
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
    );
  }

  return (
    <>
      {subscribed && (
        <div className="mb-6">
          <Button onClick={() => navigate('/dashboard/new-config')}>
            <Plus className="h-4 w-4 mr-2" />
            Ny bokningskonfiguration
          </Button>
        </div>
      )}

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
    </>
  );
};

export default UserSettingsCard;
