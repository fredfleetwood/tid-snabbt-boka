import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, RotateCcw, Smartphone } from 'lucide-react';

interface QRCodeDisplayProps {
  qrCode: string;
  onRefresh: () => void;
}

const QRCodeDisplay = ({ qrCode, onRefresh }: QRCodeDisplayProps) => {
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes
  const [isExpired, setIsExpired] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  // Reset timer when new QR code is received
  useEffect(() => {
    if (qrCode) {
      const now = new Date().toLocaleTimeString();
      console.log('🔄 New QR code received, resetting timer at:', now);
      setTimeLeft(180); // Reset to 3 minutes
      setIsExpired(false); // Reset expired state
      setLastUpdateTime(now);
    }
  }, [qrCode]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-900">
          <Smartphone className="h-5 w-5" />
          <span>BankID-inloggning</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Instructions */}
          <div className="text-center">
            <p className="text-blue-800 font-medium mb-2">
              Scanna QR-koden med din BankID-app
            </p>
            <p className="text-sm text-blue-600">
              Öppna BankID-appen på din telefon och scanna koden nedan
            </p>
          </div>

          {/* Status indicators - MOVED OUTSIDE QR CODE */}
          <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-2">
              <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                LIVE
              </div>
              <span className="text-sm text-green-700">
                Uppdateras automatiskt
              </span>
            </div>
            <div className="text-right">
              <div className="bg-green-600 text-white px-2 py-1 rounded text-sm font-mono">
                {formatTime(timeLeft)}
              </div>
              {lastUpdateTime && (
                <div className="text-xs text-gray-600 mt-1">
                  Senast: {lastUpdateTime}
                </div>
              )}
            </div>
          </div>

          {/* QR Code Display - CLEAN, NO OVERLAYS */}
          <div className="flex justify-center">
            <div className="relative">
              {isExpired ? (
                <div className="w-64 h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center space-y-3">
                  <QrCode className="h-16 w-16 text-gray-400" />
                  <p className="text-gray-600 text-center">
                    QR-koden har gått ut
                  </p>
                  <Button 
                    onClick={onRefresh}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Generera ny
                  </Button>
                </div>
              ) : (
                <div className="bg-white p-2 rounded-lg border-2 border-green-300 shadow-lg">
                  <img 
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                    alt="BankID QR Code"
                    className="w-64 h-64 object-contain"
                    onError={(e) => {
                      console.error('QR code image failed to load:', qrCode.substring(0, 50) + '...');
                      // Fallback if base64 doesn't work, try direct URL
                      if (!qrCode.startsWith('http')) {
                        e.currentTarget.src = qrCode;
                      }
                    }}
                    onLoad={() => {
                      console.log('✅ QR code image loaded successfully');
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Debug info */}
          {qrCode && !isExpired && (
            <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
              <div className="font-mono">
                QR data: {qrCode.substring(0, 50)}...
              </div>
              <div>
                Längd: {qrCode.length} tecken
              </div>
            </div>
          )}

          {/* Additional Instructions */}
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Instruktioner:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Öppna BankID-appen på din telefon</li>
              <li>2. Välj "Läs QR-kod" eller använd kameran</li>
              <li>3. Scanna QR-koden ovan</li>
              <li>4. Följ instruktionerna i appen för att logga in</li>
            </ol>
          </div>

          {/* Refresh Button */}
          {!isExpired && (
            <div className="text-center">
              <Button 
                onClick={onRefresh}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Visa QR-kod igen
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;
