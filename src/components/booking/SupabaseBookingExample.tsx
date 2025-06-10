import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabaseBooking } from '@/hooks/useSupabaseBooking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Example component showing how to use the new Supabase booking integration
const SupabaseBookingExample = () => {
  const { user } = useAuth();
  const {
    bookingState,
    startBooking,
    stopBooking,
    isActive,
    isLoading,
    qrCode,
    status,
    progress,
    message
  } = useSupabaseBooking();

  // Example booking configuration
  const exampleConfig = {
    user_id: user?.id || '',
    license_type: 'B',
    exam: 'Körprov',
    vehicle_language: ['Ja, manuell'],
    locations: ['Stockholm', 'Uppsala'],
    date_ranges: [
      {
        from: new Date().toISOString(),
        to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      }
    ]
  };

  const handleStartBooking = async () => {
    await startBooking(exampleConfig);
  };

  const handleStopBooking = async () => {
    await stopBooking();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Supabase VPS Booking Integration
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Section */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Status:</span>
            <span className="font-medium">{status}</span>
          </div>
          
          {message && (
            <div className="text-sm text-gray-600">
              {message}
            </div>
          )}
          
          {progress > 0 && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <div className="text-xs text-gray-500 text-center">
                {progress}% Complete
              </div>
            </div>
          )}
        </div>

        {/* QR Code Section */}
        {qrCode && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">BankID QR Code:</h3>
            <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
              <img 
                src={qrCode} 
                alt="BankID QR Code"
                className="w-48 h-48 border rounded-lg"
              />
            </div>
            <p className="text-xs text-center text-gray-600">
              Scanna med din BankID-app
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isActive ? (
            <Button 
              onClick={handleStartBooking}
              disabled={isLoading || !user}
              className="flex-1"
            >
              {isLoading ? 'Startar...' : 'Starta Supabase Booking'}
            </Button>
          ) : (
            <Button 
              onClick={handleStopBooking}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
            >
              {isLoading ? 'Stoppar...' : 'Stoppa Booking'}
            </Button>
          )}
        </div>

        {/* Job Information */}
        {bookingState.jobId && (
          <div className="text-xs text-gray-500 font-mono">
            Job ID: {bookingState.jobId}
          </div>
        )}

        {/* Integration Flow Diagram */}
        <div className="text-xs text-gray-600 border-t pt-4">
          <h4 className="font-medium mb-2">Integration Flow:</h4>
          <div className="space-y-1">
            <div>1. Frontend → Supabase Edge Function</div>
            <div>2. Edge Function → VPS Server (87.106.247.92:8080)</div>
            <div>3. VPS Server → Browser Automation</div>
            <div>4. Status Updates → Webhook → Supabase → Real-time</div>
            <div>5. QR Codes → WebSocket → Frontend Display</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupabaseBookingExample; 