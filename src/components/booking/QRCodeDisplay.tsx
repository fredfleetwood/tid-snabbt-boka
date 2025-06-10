import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, RotateCcw, Smartphone } from 'lucide-react';

interface QRCodeDisplayProps {
  qrCode: string;
  onRefresh: () => void;
}

const QRCodeDisplay = ({ qrCode, onRefresh }: QRCodeDisplayProps) => {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [qrImageKey, setQrImageKey] = useState(0); // Force image re-render

  // Reset when new QR code is received
  useEffect(() => {
    if (qrCode) {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      console.log('🔄 NEW QR CODE RECEIVED at:', timeString);
      console.log('📱 QR Data length:', qrCode.length);
      console.log('📱 QR Data preview:', qrCode.substring(0, 100) + '...');
      
      setLastUpdateTime(timeString);
      setQrImageKey(prev => prev + 1); // Force image re-render
    }
  }, [qrCode]);

  // Add timestamp to prevent browser caching
  const getImageSrc = (qrData: string) => {
    const baseData = qrData.startsWith('data:') ? qrData : `data:image/png;base64,${qrData}`;
    return baseData;
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

          {/* Simple LIVE status indicator - NO COUNTDOWN */}
          <div className="flex justify-center items-center bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-2">
              <div className="bg-green-500 text-white px-3 py-2 rounded text-sm font-medium">
                ✅ LIVE från Trafikverket
              </div>
              {lastUpdateTime && (
                <span className="text-sm text-gray-600">
                  Senast uppdaterad: {lastUpdateTime}
                </span>
              )}
            </div>
          </div>

          {/* QR Code Display - CLEAN, NO OVERLAYS */}
          <div className="flex justify-center">
            <div className="relative">
              {!qrCode ? (
                <div className="w-64 h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center space-y-3">
                  <QrCode className="h-16 w-16 text-gray-400" />
                  <p className="text-gray-600 text-center">
                    Väntar på QR-kod...
                  </p>
                </div>
              ) : (
                <div className="bg-white p-2 rounded-lg border-2 border-green-300 shadow-lg">
                  <img 
                    key={qrImageKey} // FORCE RE-RENDER on new QR
                    src={getImageSrc(qrCode)} 
                    alt="BankID QR Code"
                    className="w-64 h-64 object-contain"
                    style={{ 
                      imageRendering: 'crisp-edges'
                    }}
                    onError={(e) => {
                      console.error('❌ QR code image FAILED to load:', qrCode.substring(0, 50) + '...');
                      console.error('❌ Image src:', e.currentTarget.src.substring(0, 100) + '...');
                    }}
                    onLoad={() => {
                      console.log('✅ QR code image LOADED successfully at:', new Date().toLocaleTimeString());
                      console.log('📱 Image key:', qrImageKey);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Debug info - SIMPLIFIED */}
          {qrCode && (
            <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 space-y-1">
              <div className="font-mono">
                QR data: {qrCode.substring(0, 60)}...
              </div>
              <div className="flex justify-between">
                <span>Längd: {qrCode.length} tecken</span>
                <span>Image Key: {qrImageKey}</span>
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
            <p className="text-xs text-green-600 mt-2">
              ✅ QR-koden uppdateras automatiskt från Trafikverket
            </p>
          </div>

          {/* Refresh Button */}
          <div className="text-center">
            <Button 
              onClick={onRefresh}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Hämta ny QR-kod
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;
