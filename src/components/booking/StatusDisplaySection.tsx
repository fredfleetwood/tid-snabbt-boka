
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookingSession } from './types';

interface StatusDisplaySectionProps {
  currentStatus: {
    emoji: string;
    text: string;
    progress: number;
  };
  session: BookingSession | null;
}

const StatusDisplaySection = ({ currentStatus, session }: StatusDisplaySectionProps) => {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">{currentStatus.emoji}</span>
          <div>
            <h3 className="text-lg font-semibold">{currentStatus.text}</h3>
            {session?.started_at && (
              <p className="text-sm text-gray-600">
                Startad: {new Date(session.started_at).toLocaleString('sv-SE')}
              </p>
            )}
          </div>
        </div>
        <Badge className={`${session?.status === 'completed' ? 'bg-green-600' : session?.status === 'error' ? 'bg-red-600' : 'bg-blue-600'} text-white`}>
          {session?.status || 'idle'}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Framsteg</span>
          <span>{currentStatus.progress}%</span>
        </div>
        <Progress value={currentStatus.progress} className="w-full" />
      </div>
    </div>
  );
};

export default StatusDisplaySection;
