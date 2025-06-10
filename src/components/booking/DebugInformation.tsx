
import React from 'react';
import { BookingSession } from './types';

interface DebugInformationProps {
  userId: string | undefined;
  configId: string;
  subscribed: boolean;
  session: BookingSession | null;
}

const DebugInformation = ({ userId, configId, subscribed, session }: DebugInformationProps) => {
  return (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h4 className="font-medium text-blue-900 mb-2">Debug Information</h4>
      <div className="text-sm text-blue-800 space-y-1">
        <div>User ID: {userId || 'Not logged in'}</div>
        <div>Config ID: {configId || 'Not provided'}</div>
        <div>Subscribed: {subscribed ? 'Yes' : 'No'}</div>
        <div>Current Session: {session?.id || 'None'}</div>
      </div>
    </div>
  );
};

export default DebugInformation;
