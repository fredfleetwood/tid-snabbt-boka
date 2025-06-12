import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, RotateCcw, Smartphone, Download, Zap, Clock } from 'lucide-react';
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
  const [qrChangeCount, setQrChangeCount] = useState(0);
  const [lastQrHash, setLastQrHash] = useState<string>('');
  const [qrUpdateInterval, setQrUpdateInterval] = useState<NodeJS.Timeout | null>(null);
  const [isNewQr, setIsNewQr] = useState(false);

  // Generate simple hash for QR change detection
  const generateQrHash = useCallback((qr: string): string => {
    let hash = 0;
    for (let i = 0; i < qr.length; i++) {
      const char = qr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }, []);

  // Handle QR code updates with enhanced change detection
  useEffect(() => {
    if (qrCode) {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      
      // Generate hash for change detection
      const qrHash = generateQrHash(qrCode);
      const hasChanged = qrHash !== lastQrHash;
      
      if (hasChanged) {
        setQrChangeCount(prev => prev + 1);
        setLastQrHash(qrHash);
        setIsNewQr(true);
        
        // Auto-hide new QR indicator after 3 seconds
        setTimeout(() => setIsNewQr(false), 3000);
        
        console.log(`📱 NEW QR #${qrChangeCount + 1} detected at:`, timeString);
      }
      
      // Check if it's a Supabase Storage URL
      const isStorageUrl = qrCode.includes('supabase.co') && qrCode.includes('booking-assets');
      
      setIsStorageBased(isStorageUrl);
      setImageError(false);
      
      if (isStorageUrl) {
        console.log('📁 QR from Supabase Storage:', qrCode.substring(qrCode.lastIndexOf('/') + 1));
        setQrImageUrl(qrCode);
      } else {
        console.log('📊 QR base64 received:', qrCode.length, 'characters');
        const baseData = qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`;
        setQrImageUrl(baseData);
      }
      
      setLastUpdateTime(timeString);
      setQrImageKey(prev => prev + 1);
    }
  }, [qrCode, generateQrHash, lastQrHash, qrChangeCount]);

  // Enhanced real-time QR subscription matching backend's 2-second update frequency
  useEffect(() => {
    if (!jobId) return;

    // Set up multiple subscription channels for maximum responsiveness
    const channels = [
      // Primary QR channel
      supabase
        .channel(`qr-updates-${jobId}`)
        .on('broadcast', { event: 'qr_code_update' }, (payload) => {
          console.log('🔄 Real-time QR update via primary channel:', payload);
          
          if (payload.payload?.qr_url) {
            const newQrUrl = payload.payload.qr_url;
            const timestamp = payload.payload.timestamp || new Date().toISOString();
            
            handleNewQr(newQrUrl, timestamp, 'real-time-primary');
          }
        }),
      
      // Booking channel (fallback)
      supabase
        .channel(`booking-${jobId}`)
        .on('broadcast', { event: 'qr_code_update' }, (payload) => {
          console.log('🔄 Real-time QR update via booking channel:', payload);
          
          if (payload.payload?.qr_url || payload.payload?.qr_code) {
            const newQrUrl = payload.payload.qr_url || payload.payload.qr_code;
            const timestamp = payload.payload.timestamp || new Date().toISOString();
            
            handleNewQr(newQrUrl, timestamp, 'real-time-booking');
          }
        })
    ];

    // Subscribe to all channels
    channels.forEach(channel => channel.subscribe());

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [jobId]);

  // Enhanced auto-refresh matching backend's QR detection speed  
  useEffect(() => {
    if (!jobId) return;

    // Clear existing interval
    if (qrUpdateInterval) {
      clearInterval(qrUpdateInterval);
    }

    // Set up aggressive polling to match backend's ~2 second QR updates
    const interval = setInterval(async () => {
      try {
        await fetchLatestQR(true); // Silent fetch
      } catch (error) {
        console.warn('🔄 Auto-refresh failed:', error);
      }
    }, 1500); // Poll every 1.5 seconds to catch 2-second backend updates

    setQrUpdateInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId]);

  const handleNewQr = (qrUrl: string, timestamp: string, source: string) => {
    const qrHash = generateQrHash(qrUrl);
    const hasChanged = qrHash !== lastQrHash;
    
    if (hasChanged) {
      setQrImageUrl(qrUrl);
      setIsStorageBased(qrUrl.includes('supabase.co'));
      setLastUpdateTime(new Date(timestamp).toLocaleTimeString());
      setQrImageKey(prev => prev + 1);
      setImageError(false);
      setQrChangeCount(prev => prev + 1);
      setLastQrHash(qrHash);
      setIsNewQr(true);
      
      setTimeout(() => setIsNewQr(false), 3000);
      console.log(`✅ QR #${qrChangeCount + 1} updated from ${source}:`, qrUrl.substring(qrUrl.lastIndexOf('/') + 1));
    }
  };

  // Fetch latest QR from storage with enhanced error handling
  const fetchLatestQR = async (silent: boolean = false) => {
    if (!jobId) return;
    
    try {
      if (!silent) setImageLoading(true);
      
      const { data, error } = await supabase.functions.invoke('qr-storage', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: { job_id: jobId }
      });

      if (error) throw error;

      if (data?.qr_url) {
        handleNewQr(data.qr_url, data.qr_updated_at || new Date().toISOString(), 'manual-fetch');
      }
    } catch (error) {
      if (!silent) {
        console.error('❌ Failed to fetch latest QR:', error);
      }
    } finally {
      if (!silent) setImageLoading(false);
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
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-blue-900">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>BankID-inloggning</span>
            {isNewQr && (
              <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs animate-pulse">
                <Zap className="h-3 w-3" />
                <span>NY QR!</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs">
            {isStorageBased && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                📁 Storage
              </span>
            )}
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
              #{qrChangeCount}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Enhanced Status indicator */}
          <div className="flex justify-center items-center bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-3">
              <div className={`px-3 py-2 rounded text-sm font-medium text-white ${
                isNewQr 
                  ? 'bg-green-500 animate-pulse' 
                  : 'bg-blue-500'
              }`}>
                {isNewQr ? '🔥 UPPDATERAR' : '✅ LIVE'}
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center space-x-2">
                  <Clock className="h-3 w-3" />
                  <span>Senast: {lastUpdateTime || 'Väntar...'}</span>
                </div>
                <div>Källa: {isStorageBased ? 'Supabase Storage' : 'Direct Server'}</div>
              </div>
            </div>
          </div>

          {/* Enhanced Instructions */}
          <div className="text-center bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-lg">
            <p className="text-blue-800 font-medium mb-2">
              🚀 QR-koden uppdateras automatiskt var 2:a sekund
            </p>
            <p className="text-sm text-blue-700">
              Öppna BankID-appen och scanna koden nedan när den visas
            </p>
          </div>

          {/* Enhanced QR Code Display */}
          <div className="flex justify-center">
            <div className="relative">
              {!qrImageUrl ? (
                <div className="w-64 h-64 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center space-y-3">
                  <QrCode className="h-16 w-16 text-gray-400 animate-pulse" />
                  <p className="text-gray-600 text-center">
                    Väntar på QR-kod från backend...
                  </p>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-blue-400 animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <div className={`bg-white p-2 rounded-lg border-2 shadow-lg relative transition-all duration-300 ${
                  isNewQr 
                    ? 'border-green-400 shadow-green-200 ring-2 ring-green-300' 
                    : 'border-blue-300 shadow-blue-200'
                }`}>
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
                        onClick={() => fetchLatestQR()}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300"
                      >
                        Försök igen
                      </Button>
                    </div>
                  ) : (
                    <>
                      <img 
                        key={qrImageKey}
                        src={qrImageUrl} 
                        alt="BankID QR Code"
                        className="w-64 h-64 object-contain"
                        style={{ imageRendering: 'crisp-edges' }}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                      />
                      {isNewQr && (
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-bounce">
                          NY!
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Enhanced QR Info */}
          {qrImageUrl && !imageError && (
            <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <span>QR-nummer: #{qrChangeCount}</span>
                <span>Uppdateringar: {qrChangeCount}</span>
                <span>Källa: {isStorageBased ? 'Storage' : 'Direct'}</span>
                <span>Status: {isNewQr ? '🔥 Ny' : '✅ Aktiv'}</span>
              </div>
              {isStorageBased && (
                <div className="font-mono text-xs pt-2 border-t">
                  Fil: {qrImageUrl.substring(qrImageUrl.lastIndexOf('/') + 1)}
                </div>
              )}
            </div>
          )}

          {/* Enhanced Action Buttons */}
          <div className="flex justify-center space-x-2">
            <Button 
              onClick={() => fetchLatestQR()}
              variant="outline"
              size="sm"
              disabled={imageLoading}
              className="transition-colors"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${imageLoading ? 'animate-spin' : ''}`} />
              {imageLoading ? 'Hämtar...' : 'Hämta ny QR'}
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
            
            <Button 
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="bg-blue-50 hover:bg-blue-100 text-blue-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Force Refresh
            </Button>
          </div>

          {/* Enhanced Instructions */}
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <span className="mr-2">📱</span>
              Ultra-snabb QR-inloggning:
            </h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. QR-koden uppdateras automatiskt var 2:a sekund</li>
              <li>2. Öppna BankID-appen → "Läs QR-kod"</li>
              <li>3. Scanna koden så snart den visas (vänta inte!)</li>
              <li>4. Systemet fortsätter automatiskt efter inloggning</li>
            </ol>
            <div className="mt-3 p-2 bg-green-50 rounded text-xs text-green-700">
              ⚡ Optimerad för maximal hastighet - QR uppdateras direkt från Trafikverket!
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;
