
import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface BookingStatusHeaderProps {
  isConnected: boolean;
}

const BookingStatusHeader = ({ isConnected }: BookingStatusHeaderProps) => {
  return (
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
  );
};

export default BookingStatusHeader;
