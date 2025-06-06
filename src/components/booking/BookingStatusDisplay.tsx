
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookingSession } from './types';
import { statusConfig, getProgress } from './statusConfig';

interface BookingStatusDisplayProps {
  session: BookingSession | null;
  children?: React.ReactNode;
}

const BookingStatusDisplay = ({ session, children }: BookingStatusDisplayProps) => {
  const currentStatus = statusConfig[session?.status as keyof typeof statusConfig] || statusConfig.idle;
  const progress = getProgress(session?.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{currentStatus.emoji}</span>
            <div>
              <h4 className="font-semibold">{currentStatus.text}</h4>
              {session?.started_at && (
                <p className="text-sm text-gray-600">
                  Startad: {new Date(session.started_at).toLocaleString('sv-SE')}
                </p>
              )}
            </div>
          </div>
          <Badge className={`${currentStatus.color} text-white`}>
            {session?.status || 'idle'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Framsteg</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          {children}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingStatusDisplay;
