
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, RotateCcw, Activity } from 'lucide-react';
import { BookingSession } from './types';

interface ControlButtonsProps {
  isActive: boolean;
  isStarting: boolean;
  isStopping: boolean;
  subscribed: boolean;
  configId: string;
  session: BookingSession | null;
  onStart: () => void;
  onStop: () => void;
}

const ControlButtons = ({
  isActive,
  isStarting,
  isStopping,
  subscribed,
  configId,
  session,
  onStart,
  onStop
}: ControlButtonsProps) => {
  return (
    <div className="flex space-x-3">
      {!isActive ? (
        <Button 
          onClick={onStart} 
          disabled={isStarting || !subscribed || !configId}
          className="bg-green-600 hover:bg-green-700"
        >
          {isStarting ? (
            <>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              Startar...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Starta avancerad automatisering
            </>
          )}
        </Button>
      ) : (
        <Button 
          onClick={onStop} 
          disabled={isStopping}
          variant="destructive"
        >
          {isStopping ? (
            <>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              Stoppar...
            </>
          ) : (
            <>
              <Square className="h-4 w-4 mr-2" />
              Stoppa automatisering
            </>
          )}
        </Button>
      )}
      
      {session && (
        <Button 
          variant="outline"
          onClick={() => window.location.reload()}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Uppdatera status
        </Button>
      )}
    </div>
  );
};

export default ControlButtons;
