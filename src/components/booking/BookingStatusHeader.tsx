
import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface BookingStatusHeaderProps {
  isConnected: boolean;
  vpsJobId?: string | null;
}

const BookingStatusHeader = ({ isConnected, vpsJobId }: BookingStatusHeaderProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Bokningsstatus</h3>
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600">Ansluten</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600">Frånkopplad</span>
            </>
          )}
        </div>
      </div>
      {vpsJobId && (
        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          VPS Job: {vpsJobId}
        </div>
      )}
    </div>
  );
};

export default BookingStatusHeader;
