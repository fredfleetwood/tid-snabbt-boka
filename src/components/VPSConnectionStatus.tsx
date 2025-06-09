
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  RefreshCw 
} from 'lucide-react';
import { vpsService } from '@/services/vpsService';
import { VPSErrorHandler } from '@/utils/vpsErrorHandler';
import { useToast } from '@/hooks/use-toast';

export type ConnectionStatus = 'connected' | 'disconnected' | 'degraded' | 'checking' | 'fallback';

interface VPSConnectionStatusProps {
  onStatusChange?: (status: ConnectionStatus) => void;
  showDetails?: boolean;
  autoCheck?: boolean;
  checkInterval?: number;
}

const VPSConnectionStatus = ({ 
  onStatusChange, 
  showDetails = true,
  autoCheck = true,
  checkInterval = 30000 
}: VPSConnectionStatusProps) => {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isManualChecking, setIsManualChecking] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const { toast } = useToast();

  const checkConnection = async (isManual = false) => {
    if (isManual) {
      setIsManualChecking(true);
    } else if (status !== 'checking') {
      setStatus('checking');
    }

    try {
      const isOnline = await VPSErrorHandler.withRetry(
        () => vpsService.ping(),
        'VPS Connection Check',
        { maxAttempts: 2, baseDelay: 1000 }
      );

      const newStatus: ConnectionStatus = isOnline ? 'connected' : 'disconnected';
      setStatus(newStatus);
      setErrorDetails(null);
      setLastCheck(new Date());

      if (onStatusChange) {
        onStatusChange(newStatus);
      }

      if (isManual && isOnline) {
        toast({
          title: '✅ Anslutning lyckades',
          description: 'VPS-servern är nu tillgänglig.',
        });
      }

    } catch (error) {
      console.error('VPS connection check failed:', error);
      
      const vpsError = VPSErrorHandler.handleError(
        error as Error,
        'Connection Status Check',
        isManual // Only show toast for manual checks
      );

      setStatus('disconnected');
      setErrorDetails(vpsError.userMessage);
      setLastCheck(new Date());

      if (onStatusChange) {
        onStatusChange('disconnected');
      }

      // Check if we should switch to fallback mode
      if (vpsError.code === 'VPS_OFFLINE' || vpsError.severity === 'critical') {
        handleFallbackMode();
      }
    } finally {
      if (isManual) {
        setIsManualChecking(false);
      }
    }
  };

  const handleFallbackMode = () => {
    setStatus('fallback');
    if (onStatusChange) {
      onStatusChange('fallback');
    }
    
    toast({
      title: '🔄 Fallback-läge aktiverat',
      description: 'Använder lokal bearbetning medan VPS-servern är otillgänglig.',
    });
  };

  // Auto-check connection
  useEffect(() => {
    if (!autoCheck) return;

    // Initial check
    checkConnection();

    // Set up interval for regular checks
    const interval = setInterval(() => {
      checkConnection();
    }, checkInterval);

    return () => clearInterval(interval);
  }, [autoCheck, checkInterval]);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          color: 'bg-green-600',
          text: 'Ansluten',
          description: 'VPS-servern är tillgänglig och fungerar normalt.',
          variant: 'default' as const
        };
      case 'degraded':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          color: 'bg-yellow-600',
          text: 'Försämrad',
          description: 'VPS-servern fungerar men med begränsad prestanda.',
          variant: 'secondary' as const
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-4 w-4" />,
          color: 'bg-red-600',
          text: 'Frånkopplad',
          description: 'Kan inte ansluta till VPS-servern.',
          variant: 'destructive' as const
        };
      case 'fallback':
        return {
          icon: <Wifi className="h-4 w-4" />,
          color: 'bg-blue-600',
          text: 'Fallback-läge',
          description: 'Använder lokal bearbetning istället för VPS.',
          variant: 'secondary' as const
        };
      case 'checking':
      default:
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          color: 'bg-gray-600',
          text: 'Kontrollerar...',
          description: 'Kontrollerar anslutning till VPS-servern.',
          variant: 'secondary' as const
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="space-y-3">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {statusConfig.icon}
          <Badge variant={statusConfig.variant} className={statusConfig.color}>
            VPS: {statusConfig.text}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => checkConnection(true)}
          disabled={isManualChecking || status === 'checking'}
        >
          {isManualChecking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Details Section */}
      {showDetails && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{statusConfig.description}</p>
          
          {lastCheck && (
            <p className="text-xs text-gray-500">
              Senast kontrollerad: {lastCheck.toLocaleTimeString('sv-SE')}
            </p>
          )}

          {/* Error Details */}
          {errorDetails && status === 'disconnected' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {errorDetails}
              </AlertDescription>
            </Alert>
          )}

          {/* Fallback Mode Info */}
          {status === 'fallback' && (
            <Alert>
              <AlertDescription>
                Applikationen fungerar i fallback-läge. Vissa funktioner kan vara begränsade 
                tills VPS-anslutningen återställs.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};

export default VPSConnectionStatus;
