
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Edit, Calendar, MapPin, User, Car } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface BookingConfig {
  id: string;
  personnummer: string;
  license_type: string;
  exam: string;
  vehicle_language: string[];
  date_ranges: Array<{ from: string; to: string }>;
  locations: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ConfigurationSummaryProps {
  config: BookingConfig;
  onEdit: () => void;
  onToggleActive: () => void;
  loading?: boolean;
}

const ConfigurationSummary = ({ config, onEdit, onToggleActive, loading }: ConfigurationSummaryProps) => {
  const getExamDisplayName = (exam: string) => {
    return exam === 'Körprov' ? 'Körprov' : 'Kunskapsprov';
  };

  const getLicenseDisplayName = (license: string) => {
    const licenseNames: Record<string, string> = {
      'A': 'Motorcykel',
      'A1': 'Lätt motorcykel',
      'A2': 'Mellanstor motorcykel',
      'AM': 'Moped',
      'B': 'Personbil',
      'B96': 'Personbil med släp',
      'BE': 'Personbil med tung släp',
      'C': 'Lastbil',
      'C1': 'Lätt lastbil',
      'CE': 'Lastbil med släp',
      'C1E': 'Lätt lastbil med släp',
      'D': 'Buss',
      'D1': 'Liten buss',
      'DE': 'Buss med släp',
      'D1E': 'Liten buss med släp'
    };
    return `${license} - ${licenseNames[license] || 'Okänd'}`;
  };

  const maskPersonnummer = (personnummer: string) => {
    if (personnummer.length >= 13) {
      return personnummer.substring(0, 6) + 'XX-XXXX';
    }
    return 'XXXXXX-XXXX';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Konfiguration klar att använda
        </CardTitle>
        <CardDescription>
          Senast uppdaterad: {format(new Date(config.updated_at), 'PPP', { locale: sv })}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Personal Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <User className="h-4 w-4" />
            Personuppgifter
          </div>
          <div className="pl-6 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Personnummer:</span> {maskPersonnummer(config.personnummer)}
            </p>
          </div>
        </div>

        {/* License & Exam Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Car className="h-4 w-4" />
            Prov & behörighet
          </div>
          <div className="pl-6 space-y-1">
            <p className="text-sm">
              <span className="font-medium">Körkortsbehörighet:</span> {getLicenseDisplayName(config.license_type)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Provtyp:</span> {getExamDisplayName(config.exam)}
            </p>
            <p className="text-sm">
              <span className="font-medium">
                {config.exam === 'Körprov' ? 'Fordon:' : 'Språk:'}
              </span> {config.vehicle_language.join(', ')}
            </p>
          </div>
        </div>

        {/* Date Ranges */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4" />
            Datumperioder
          </div>
          <div className="pl-6 space-y-1">
            {config.date_ranges.map((range, index) => (
              <p key={index} className="text-sm">
                {format(new Date(range.from), 'd MMM yyyy', { locale: sv })} - {format(new Date(range.to), 'd MMM yyyy', { locale: sv })}
              </p>
            ))}
          </div>
        </div>

        {/* Locations */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <MapPin className="h-4 w-4" />
            Provplatser ({config.locations.length})
          </div>
          <div className="pl-6">
            <div className="flex flex-wrap gap-1">
              {config.locations.map((location) => (
                <Badge key={location} variant="secondary" className="text-xs">
                  {location}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge 
              variant={config.is_active ? "default" : "secondary"}
              className={config.is_active ? "bg-green-100 text-green-800" : ""}
            >
              {config.is_active ? 'Aktiv bokning' : 'Inaktiv'}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              disabled={loading}
            >
              <Edit className="h-4 w-4 mr-1" />
              Redigera
            </Button>
            <Button
              variant={config.is_active ? "destructive" : "default"}
              size="sm"
              onClick={onToggleActive}
              disabled={loading}
            >
              {config.is_active ? 'Stoppa bokning' : 'Starta bokning'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigurationSummary;
