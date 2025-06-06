
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Play, Square, Calendar, MapPin, User, Car } from 'lucide-react';
import { maskPersonnummer } from '@/utils/security';
import BookingStatusDashboard from './BookingStatusDashboard';

interface ConfigurationSummaryProps {
  config: any;
  onEdit: () => void;
  onToggleActive: () => void;
  loading: boolean;
}

const ConfigurationSummary = ({ config, onEdit, onToggleActive, loading }: ConfigurationSummaryProps) => {
  const formatDateRange = (dateRange: any) => {
    const from = new Date(dateRange.from).toLocaleDateString('sv-SE');
    const to = new Date(dateRange.to).toLocaleDateString('sv-SE');
    return `${from} - ${to}`;
  };

  return (
    <div className="space-y-6">
      {/* Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>Bokningskonfiguration</span>
              <Badge variant={config.is_active ? "default" : "secondary"}>
                {config.is_active ? 'Aktiv' : 'Inaktiv'}
              </Badge>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Redigera
              </Button>
              <Button
                variant={config.is_active ? "destructive" : "default"}
                size="sm"
                onClick={onToggleActive}
                disabled={loading}
                className={!config.is_active ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {config.is_active ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Stoppa
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Aktivera
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Personnummer:</span>
                <span className="font-mono">{maskPersonnummer(config.personnummer)}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Car className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Körkort:</span>
                <span>{config.license_type}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <span className="font-medium">Prov:</span>
                <span>{config.exam}</span>
              </div>
              
              <div className="text-sm">
                <span className="font-medium">
                  {config.exam === 'Körprov' ? 'Fordon:' : 'Språk:'}
                </span>
                <div className="mt-1">
                  {config.vehicle_language.map((item: string, index: number) => (
                    <Badge key={index} variant="secondary" className="mr-1 mb-1">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking Preferences */}
            <div className="space-y-3">
              <div className="text-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Datumperioder:</span>
                </div>
                <div className="space-y-1">
                  {config.date_ranges.map((range: any, index: number) => (
                    <div key={index} className="text-gray-600">
                      {formatDateRange(range)}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Provplatser:</span>
                </div>
                <div>
                  {config.locations.length > 0 ? (
                    <div className="space-y-1">
                      {config.locations.map((location: string, index: number) => (
                        <Badge key={index} variant="outline" className="mr-1 mb-1">
                          {location}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-600">Alla tillgängliga platser</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Status Dashboard */}
      <BookingStatusDashboard configId={config.id} />
    </div>
  );
};

export default ConfigurationSummary;
