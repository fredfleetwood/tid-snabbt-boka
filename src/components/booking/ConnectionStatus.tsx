
import React from 'react';
import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus = ({ isConnected }: ConnectionStatusProps) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <Activity className={`h-4 w-4 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
        <span className="text-sm font-medium">
          {isConnected ? 'Ansluten till realtidsuppdateringar' : 'Ansluter...'}
        </span>
      </div>
      <Badge variant={isConnected ? 'default' : 'secondary'}>
        {isConnected ? 'Live' : 'Offline'}
      </Badge>
    </div>
  );
};

export default ConnectionStatus;
