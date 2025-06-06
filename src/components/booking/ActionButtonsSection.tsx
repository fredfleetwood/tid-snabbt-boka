
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Play, Eye } from 'lucide-react';

interface ActionButtonsSectionProps {
  loading: boolean;
  savedConfig: any;
  subscribed: boolean;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  handleStartBooking: () => void;
  setIsEditing: (editing: boolean) => void;
  populateFormFromConfig: (config: any) => void;
}

const ActionButtonsSection = ({
  loading,
  savedConfig,
  subscribed,
  showPreview,
  setShowPreview,
  handleStartBooking,
  setIsEditing,
  populateFormFromConfig
}: ActionButtonsSectionProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {savedConfig ? 'Uppdatera konfiguration' : 'Spara konfiguration'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Förhandsgranska
          </Button>

          {savedConfig && subscribed && (
            <Button
              type="button"
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={handleStartBooking}
              disabled={loading || savedConfig.is_active}
            >
              <Play className="mr-2 h-4 w-4" />
              {savedConfig.is_active ? 'Bokning aktiv' : 'Starta automatisk bokning'}
            </Button>
          )}

          {savedConfig && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                populateFormFromConfig(savedConfig);
              }}
            >
              Avbryt redigering
            </Button>
          )}
        </div>

        {!subscribed && (
          <p className="text-sm text-amber-600 mt-3">
            Aktivt abonnemang krävs för att starta automatisk bokning
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ActionButtonsSection;
