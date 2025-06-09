
import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Square, RotateCcw } from 'lucide-react';
import { BookingSession } from './types';

interface BookingControlsProps {
  session: BookingSession | null;
  isStarting: boolean;
  subscribed: boolean;
  isActive: boolean;
  onStart: () => void;
  onStop: () => void;
}

const BookingControls = ({ 
  session, 
  isStarting, 
  subscribed, 
  isActive, 
  onStart, 
  onStop 
}: BookingControlsProps) => {
  const isError = session?.status === 'error';

  return (
    <>
      <div className="flex space-x-3">
        {!isActive ? (
          <Button 
            onClick={onStart} 
            disabled={isStarting || !subscribed}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="h-4 w-4 mr-2" />
            {isStarting ? 'Startar...' : 'Starta bokning'}
          </Button>
        ) : (
          <Button onClick={onStop} variant="destructive">
            <Square className="h-4 w-4 mr-2" />
            Stoppa bokning
          </Button>
        )}

        {isError && (
          <Button onClick={onStart} variant="outline" disabled={isStarting}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Försök igen
          </Button>
        )}
      </div>

      {!subscribed && (
        <Alert>
          <AlertDescription>
            Aktivt abonnemang krävs för att starta automatisk bokning.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default BookingControls;
