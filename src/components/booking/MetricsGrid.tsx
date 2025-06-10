
import React from 'react';
import { BookingSession, LogEntry } from './types';

interface MetricsGridProps {
  cycleCount: number;
  slotsFound: number;
  logs: LogEntry[];
  session: BookingSession | null;
}

const MetricsGrid = ({ cycleCount, slotsFound, logs, session }: MetricsGridProps) => {
  const minutesActive = session?.created_at 
    ? Math.floor((Date.now() - new Date(session.created_at).getTime()) / 60000) 
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div className="text-center p-3 bg-gray-50 rounded">
        <div className="text-2xl font-bold text-blue-600">{cycleCount}</div>
        <div className="text-sm text-gray-600">Sök-cykler</div>
      </div>
      <div className="text-center p-3 bg-gray-50 rounded">
        <div className="text-2xl font-bold text-green-600">{slotsFound}</div>
        <div className="text-sm text-gray-600">Tider hittade</div>
      </div>
      <div className="text-center p-3 bg-gray-50 rounded">
        <div className="text-2xl font-bold text-purple-600">{logs.length}</div>
        <div className="text-sm text-gray-600">Logg-poster</div>
      </div>
      <div className="text-center p-3 bg-gray-50 rounded">
        <div className="text-2xl font-bold text-orange-600">{minutesActive}</div>
        <div className="text-sm text-gray-600">Minuter aktiv</div>
      </div>
    </div>
  );
};

export default MetricsGrid;
