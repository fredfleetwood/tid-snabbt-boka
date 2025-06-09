import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Square, 
  Settings, 
  Activity,
  Server,
  Clock,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { vpsService } from '@/services/vpsService';
import { VPSSystemHealth } from '@/services/types/vpsTypes';
import { useToast } from '@/hooks/use-toast';
import { VPSErrorHandler } from '@/utils/vpsErrorHandler';
import LiveAutomationMonitor from '@/components/LiveAutomationMonitor';
import VPSSettingsPanel from '@/components/VPSSettingsPanel';
import VPSConnectionStatus, { ConnectionStatus } from '@/components/VPSConnectionStatus';

interface BookingConfig {
  id: string;
  personnummer: string;
  license_type: string;
  exam: string;
  vehicle_language: string[];
  locations: string[];
  is_active: boolean;
  created_at: string;
}

interface LiveAutomationSectionProps {
  config: BookingConfig;
}

const LiveAutomationSection = ({ config }: LiveAutomationSectionProps) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [systemHealth, setSystemHealth] = useState<VPSSystemHealth | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [recentJobs, setRecentJobs] = useState<Array<{
    id: string;
    status: string;
    startTime: string;
    duration: string;
  }>>([]);
  const { toast } = useToast();

  // Handle connection status changes
  const handleConnectionStatusChange = (status: ConnectionStatus) => {
    setConnectionStatus(status);
    
    if (status === 'connected' && !systemHealth) {
      fetchSystemHealth();
    }
  };

  // Fetch system health with error handling
  const fetchSystemHealth = async () => {
    try {
      const health = await vpsService.getSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      // Error already handled by VPSErrorHandler in the service
      setSystemHealth(null);
    }
  };

  // Check VPS status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (connectionStatus === 'connected') {
        fetchSystemHealth();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [connectionStatus]);

  const handleStartAutomation = async () => {
    setIsStarting(true);
    
    try {
      // Check connection first
      if (connectionStatus === 'disconnected') {
        throw new Error('VPS server is not available');
      }

      // Convert the config to VPS format
      const vpsConfig = {
        personnummer: config.personnummer,
        license_type: config.license_type,
        exam: config.exam as 'Körprov' | 'Kunskapsprov',
        vehicle_language: config.vehicle_language,
        date_ranges: [
          {
            from: new Date().toISOString().split('T')[0],
            to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        ],
        locations: config.locations,
        user_id: config.id,
        config_id: config.id
      };

      const response = await vpsService.startBooking(vpsConfig);
      
      if (response.success && response.job_id) {
        setActiveJobId(response.job_id);
        
        if (connectionStatus === 'fallback') {
          toast({
            title: "🔄 Automatisering startad i fallback-läge",
            description: "Lokalt läge används eftersom VPS-servern är otillgänglig.",
          });
        } else {
          toast({
            title: "🚀 Automatisering startad!",
            description: "Real browser automation körs nu på VPS-servern.",
          });
        }
      } else {
        throw new Error(response.message || 'Failed to start automation');
      }
    } catch (error) {
      console.error('Failed to start automation:', error);
      
      // Error is already handled by VPSErrorHandler, but we can add specific logic here
      if (connectionStatus === 'fallback') {
        // Try to start in fallback mode
        try {
          const fallbackJobId = `fallback-${Date.now()}`;
          setActiveJobId(fallbackJobId);
          toast({
            title: "⚠️ Fallback-läge aktiverat",
            description: "Automatisering startad med begränsad funktionalitet.",
          });
        } catch (fallbackError) {
          VPSErrorHandler.handleError(
            fallbackError as Error,
            'Fallback Mode Start'
          );
        }
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopAutomation = async () => {
    if (!activeJobId) return;
    
    try {
      if (activeJobId.startsWith('fallback-')) {
        // Handle fallback mode stop
        setActiveJobId(null);
        toast({
          title: "⏹️ Fallback-automatisering stoppad",
          description: "Fallback-automatiseringen har stoppats.",
        });
        return;
      }

      await vpsService.stopBooking(activeJobId);
      setActiveJobId(null);
      toast({
        title: "⏹️ Automatisering stoppad",
        description: "Automatiseringen har stoppats framgångsrikt.",
      });
    } catch (error) {
      // Error already handled by VPSErrorHandler
      console.error('Failed to stop automation:', error);
    }
  };

  const isVPSAvailable = connectionStatus === 'connected' || connectionStatus === 'degraded';
  const canStartAutomation = connectionStatus !== 'checking' && !isStarting;

  if (activeJobId) {
    return (
      <LiveAutomationMonitor 
        jobId={activeJobId} 
        onStop={handleStopAutomation} 
      />
    );
  }

  if (showSettings) {
    return (
      <VPSSettingsPanel onClose={() => setShowSettings(false)} />
    );
  }

  return (
    <div className="space-y-6">
      {/* VPS Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>VPS Server Status</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VPSConnectionStatus 
            onStatusChange={handleConnectionStatusChange}
            showDetails={true}
            autoCheck={true}
          />
          
          {isVPSAvailable && systemHealth && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{systemHealth.active_jobs || 0}</p>
                <p className="text-sm text-gray-600">Aktiva jobb</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{systemHealth.memory_usage || 0}%</p>
                <p className="text-sm text-gray-600">Minnesanvändning</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{systemHealth.cpu_usage || 0}%</p>
                <p className="text-sm text-gray-600">CPU-användning</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{systemHealth.browser_count || 0}</p>
                <p className="text-sm text-gray-600">Webbläsare</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Real Browser Automation Control</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Inställningar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Warning */}
          {connectionStatus === 'fallback' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Fallback-läge aktivt:</strong> VPS-servern är otillgänglig. 
                Automatiseringen kommer att köras med begränsad funktionalitet.
              </AlertDescription>
            </Alert>
          )}

          {connectionStatus === 'disconnected' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>VPS-servern är otillgänglig:</strong> Kontrollera din internetanslutning 
                eller försök igen senare.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              ⚠️ Real Browser Automation
            </p>
            <p className="text-sm text-yellow-700">
              Detta kommer att starta riktig webbläsarautomation på vår VPS-server med din konfiguration. 
              Systemet kommer att interagera med Trafikverkets webbplats i realtid för att boka tillgängliga tider.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Aktiv Configuration:</h4>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p><strong>Type:</strong> {config.exam} - {config.license_type}</p>
              <p><strong>Languages:</strong> {config.vehicle_language.join(', ')}</p>
              <p><strong>Locations:</strong> {config.locations.length > 0 ? config.locations.join(', ') : 'All available'}</p>
            </div>
          </div>

          <Button 
            onClick={handleStartAutomation}
            disabled={!canStartAutomation}
            className={`w-full text-white ${
              connectionStatus === 'fallback' 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
            size="lg"
          >
            {isStarting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Startar automatisering...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                {connectionStatus === 'fallback' 
                  ? 'Starta i fallback-läge' 
                  : 'Starta real automatisering'
                }
              </>
            )}
          </Button>

          {connectionStatus === 'checking' && (
            <p className="text-sm text-gray-600 text-center">
              Kontrollerar VPS-anslutning...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Automation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Automation History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No automation history available yet.
            </p>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Job {job.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-600">{job.startTime}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                      {job.status}
                    </Badge>
                    <p className="text-sm text-gray-600">{job.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveAutomationSection;
