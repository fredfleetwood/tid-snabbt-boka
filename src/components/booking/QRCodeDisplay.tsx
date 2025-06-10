import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, RotateCcw, Smartphone, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QRCodeDisplayProps {
  qrCode: string; // Can be URL or base64
  jobId?: string;
  onRefresh: () => void;
}

const QRCodeDisplay = ({ qrCode, jobId, onRefresh }: QRCodeDisplayProps) => {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [qrImageKey, setQrImageKey] = useState(0);
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const [isStorageBased, setIsStorageBased] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Handle QR code updates - detect if it's URL or base64
  useEffect(() => {
    if (qrCode) {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      
      // Check if it's a Supabase Storage URL
      const isStorageUrl = qrCode.includes('supabase.co') && qrCode.includes('booking-assets');
      
      setIsStorageBased(isStorageUrl);
      setImageError(false);
      
      if (isStorageUrl) {
        console.log('📱 NEW QR from Supabase Storage:', qrCode);
        setQrImageUrl(qrCode);
      } else {
        console.log('📱 NEW QR base64 received at:', timeString);
        const baseData = qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`;
        setQrImageUrl(baseData);
      }
      
      setLastUpdateTime(timeString);
      setQrImageKey(prev => prev + 1);
    }
  }, [qrCode]);

  // Listen for real-time QR updates from Supabase
  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`qr-updates-${jobId}`)
      .on('broadcast', { event: 'qr_code_update' }, (payload) => {
        console.log('🔄 Real-time QR update received:', payload);
        
        if (payload.payload?.qr_url) {
          const newQrUrl = payload.payload.qr_url;
          const timestamp = payload.payload.timestamp || new Date().toISOString();
          
          setQrImageUrl(newQrUrl);
          setIsStorageBased(true);
          setLastUpdateTime(new Date(timestamp).toLocaleTimeString());
          setQrImageKey(prev => prev + 1);
          setImageError(false);
          
          console.log('✅ QR image updated from real-time:', newQrUrl);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  // Fetch latest QR from storage if needed
  const fetchLatestQR = async () => {
    if (!jobId) return;
    
    try {
      setImageLoading(true);
      const { data, error } = await supabase.functions.invoke('qr-storage', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: { job_id: jobId }
      });

      if (error) throw error;

      if (data?.qr_url) {
        setQrImageUrl(data.qr_url);
        setIsStorageBased(true);
        setLastUpdateTime(new Date().toLocaleTimeString());
        setQrImageKey(prev => prev + 1);
        setImageError(false);
        console.log('✅ Latest QR fetched from storage:', data.qr_url);
      }
    } catch (error) {
      console.error('❌ Failed to fetch latest QR:', error);
    } finally {
      setImageLoading(false);
    }
  };

  const handleImageLoad = () => {
    console.log('✅ QR image loaded successfully at:', new Date().toLocaleTimeString());
    setImageError(false);
    setImageLoading(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('❌ QR image failed to load:', qrImageUrl);
    setImageError(true);
    setImageLoading(false);
    
    // If it's a storage URL that failed, try to refresh
    if (isStorageBased && jobId) {
      console.log('🔄 Storage image failed, attempting to refresh...');
      setTimeout(() => fetchLatestQR(), 2000);
    }
  };

  const downloadQR = () => {
    if (!qrImageUrl) return;
    
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `bankid-qr-${jobId || 'code'}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-900">
          <Smartphone className="h-5 w-5" />
          <span>BankID-inloggning</span>
          {isStorageBased && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              📁 Storage
            </span>
          )}
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

          {/* Status indicator */}
          <div className="flex justify-center items-center bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-2">
              <div className="bg-green-500 text-white px-3 py-2 rounded text-sm font-medium">
                ✅ {isStorageBased ? 'LIVE från Storage' : 'LIVE från Server'}
              </div>
              {lastUpdateTime && (
                <span className="text-sm text-gray-600">
                  Uppdaterad: {lastUpdateTime}
                </span>
              )}
            </div>
          </div>

          {/* QR Code Display */}
          <div className="flex justify-center">
            <div className="relative">
              {!qrImageUrl ? (
                <div className="w-64 h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center space-y-3">
                  <QrCode className="h-16 w-16 text-gray-400" />
                  <p className="text-gray-600 text-center">
                    Väntar på QR-kod...
                  </p>
                </div>
              ) : (
                <div className="bg-white p-2 rounded-lg border-2 border-green-300 shadow-lg relative">
                  {imageLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                      <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  
                  {imageError ? (
                    <div className="w-64 h-64 bg-red-50 border-2 border-red-200 rounded flex flex-col items-center justify-center space-y-2">
                      <QrCode className="h-12 w-12 text-red-400" />
                      <p className="text-red-600 text-sm text-center">
                        Kunde inte ladda QR-kod
                      </p>
                      <Button 
                        onClick={fetchLatestQR}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300"
                      >
                        Försök igen
                      </Button>
                    </div>
                  ) : (
                    <img 
                      key={qrImageKey}
                      src={qrImageUrl} 
                      alt="BankID QR Code"
                      className="w-64 h-64 object-contain"
                      style={{ imageRendering: 'crisp-edges' }}
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* QR Info */}
          {qrImageUrl && !imageError && (
            <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Källa: {isStorageBased ? 'Supabase Storage' : 'Base64 Data'}</span>
                <span>Bild-ID: {qrImageKey}</span>
              </div>
              {isStorageBased && (
                <div className="font-mono text-xs">
                  URL: {qrImageUrl.substring(qrImageUrl.lastIndexOf('/') + 1)}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
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

          {/* Action Buttons */}
          <div className="flex justify-center space-x-2">
            <Button 
              onClick={onRefresh}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Hämta ny QR-kod
            </Button>
            
            {qrImageUrl && !imageError && (
              <Button 
                onClick={downloadQR}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Ladda ner
              </Button>
            )}
            
            {isStorageBased && jobId && (
              <Button 
                onClick={fetchLatestQR}
                variant="outline"
                size="sm"
                disabled={imageLoading}
              >
                {imageLoading ? '...' : '🔄 Uppdatera'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;
