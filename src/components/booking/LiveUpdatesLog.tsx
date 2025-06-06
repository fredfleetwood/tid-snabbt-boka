
import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity } from 'lucide-react';

interface LogEntry {
  message: string;
  timestamp: string;
  stage: string;
}

interface LiveUpdatesLogProps {
  logs: LogEntry[];
}

const LiveUpdatesLog = ({ logs }: LiveUpdatesLogProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStageColor = (stage: string) => {
    const colorMap = {
      starting: 'text-blue-600',
      initializing: 'text-yellow-600',
      waiting_bankid: 'text-blue-600',
      searching: 'text-orange-600',
      booking: 'text-green-600',
      completed: 'text-green-700',
      error: 'text-red-600',
      cancelled: 'text-gray-600'
    };
    return colorMap[stage as keyof typeof colorMap] || 'text-gray-600';
  };

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Live-uppdateringar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Inga uppdateringar ännu</p>
            <p className="text-sm">Starta en bokning för att se live-uppdateringar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Live-uppdateringar</span>
          <span className="ml-auto text-sm font-normal text-gray-500">
            {logs.length} meddelanden
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 w-full">
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div 
                key={index}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-200"
              >
                <div className="flex-shrink-0">
                  <span className="text-xs font-mono text-gray-500 bg-white px-2 py-1 rounded">
                    {formatTime(log.timestamp)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${getStageColor(log.stage)}`}>
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveUpdatesLog;
