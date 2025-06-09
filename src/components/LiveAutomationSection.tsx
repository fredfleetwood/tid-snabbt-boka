
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
import { useToast } from '@/components/ui/use-toast';
import LiveAutomationMonitor from '@/components/LiveAutomationMonitor';
import VPSSettingsPanel from '@/components/VPSSettingsPanel';

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
  const [isConnected, setIsConnected] = useState(false);
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

  // Check VPS connection and system health
  useEffect(() => {
    const checkVPSStatus = async () => {
      try {
        const isOnline = await vpsService.ping();
        setIsConnected(isOnline);
        
        if (isOnline) {
          const health = await vpsService.getSystemHealth();
          setSystemHealth(health);
        }
      } catch (error) {
        console.error('Failed to check VPS status:', error);
        setIsConnected(false);
      }
    };

    checkVPSStatus();
    const interval = setInterval(checkVPSStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleStartAutomation = async () => {
    setIsStarting(true);
    
    try {
      // Convert the config to VPS format
      const vpsConfig = {
        personnummer: config.personnummer,
        license_type: config.license_type,
        exam: config.exam as 'Körprov' | 'Kunskapsprov',
        vehicle_language: config.vehicle_language,
        date_ranges: [
          {
            from: new Date().toISOString().split('T')[0],
            to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
          }
        ],
        locations: config.locations,
        user_id: config.id,
        config_id: config.id
      };

      const response = await vpsService.startBooking(vpsConfig);
      
      if (response.success && response.job_id) {
        setActiveJobId(response.job_id);
        toast({
          title: "Automation Started!",
          description: "Real browser automation is now running on the VPS server.",
        });
      } else {
        throw new Error(response.message || 'Failed to start automation');
      }
    } catch (error) {
      console.error('Failed to start automation:', error);
      toast({
        title: "Failed to Start Automation",
        description: error instanceof Error ? error.message : "Please check your VPS connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopAutomation = async () => {
    if (!activeJobId) return;
    
    try {
      await vpsService.stopBooking(activeJobId);
      setActiveJobId(null);
      toast({
        title: "Automation Stopped",
        description: "The automation has been successfully stopped.",
      });
    } catch (error) {
      console.error('Failed to stop automation:', error);
      toast({
        title: "Failed to Stop Automation",
        description: "There was an error stopping the automation.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    if (!isConnected) return <XCircle className="h-5 w-5 text-red-500" />;
    if (systemHealth?.status === 'healthy') return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (systemHealth?.status === 'degraded') return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (!isConnected) return "Offline";
    return systemHealth?.status === 'healthy' ? "Online" : 
           systemHealth?.status === 'degraded' ? "Degraded" : "Down";
  };

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
      {/* VPS Server Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>VPS Server Status</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <Badge variant={isConnected ? "default" : "destructive"}>
                {getStatusText()}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                VPS server is offline. Please check your connection or contact support.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{systemHealth?.active_jobs || 0}</p>
                <p className="text-sm text-gray-600">Active Jobs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{systemHealth?.memory_usage || 0}%</p>
                <p className="text-sm text-gray-600">Memory Usage</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{systemHealth?.cpu_usage || 0}%</p>
                <p className="text-sm text-gray-600">CPU Usage</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{systemHealth?.browser_count || 0}</p>
                <p className="text-sm text-gray-600">Browsers</p>
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
              Settings
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              ⚠️ Real Browser Automation
            </p>
            <p className="text-sm text-yellow-700">
              This will start actual browser automation on our VPS server using your configuration. 
              The system will interact with Trafikverket's website in real-time to book available slots.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Active Configuration:</h4>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p><strong>Type:</strong> {config.exam} - {config.license_type}</p>
              <p><strong>Languages:</strong> {config.vehicle_language.join(', ')}</p>
              <p><strong>Locations:</strong> {config.locations.length > 0 ? config.locations.join(', ') : 'All available'}</p>
            </div>
          </div>

          <Button 
            onClick={handleStartAutomation}
            disabled={!isConnected || isStarting}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            {isStarting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Starting Real Automation...
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Start Real Automation
              </>
            )}
          </Button>
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
