import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Activity, 
  Square, 
  ChevronDown, 
  ChevronUp,
  Smartphone,
  RotateCcw,
  Clock,
  Cpu,
  HardDrive,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';
import { VPSPollingService } from '@/services/vpsPollingService';
import { VPSJobStatus, VPSSystemHealth } from '@/services/types/vpsTypes';
import QRCodeDisplay from '@/components/booking/QRCodeDisplay';

interface LiveAutomationMonitorProps {
  jobId: string;
  onStop: () => void;
}

interface StatusConfig {
  emoji: string;
  text: string;
  progress: number;
  color: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  idle: { emoji: '⏸️', text: 'System idle...', progress: 0, color: 'bg-gray-500' },
  initializing: { emoji: '🚀', text: 'Initializing automation...', progress: 5, color: 'bg-blue-500' },
  starting: { emoji: '⚡', text: 'Starting browser automation...', progress: 10, color: 'bg-blue-600' },
  navigating: { emoji: '🌐', text: 'Navigating to Trafikverket...', progress: 15, color: 'bg-cyan-500' },
  login: { emoji: '🔑', text: 'Starting login process...', progress: 20, color: 'bg-indigo-500' },
  bankid: { emoji: '📱', text: 'BankID authentication in progress...', progress: 25, color: 'bg-orange-500' },
  waiting_bankid: { emoji: '📱', text: 'Waiting for BankID authentication...', progress: 35, color: 'bg-orange-500' },
  authenticated: { emoji: '✅', text: 'Authentication completed!', progress: 40, color: 'bg-green-600' },
  configuring: { emoji: '⚙️', text: 'Configuring booking parameters...', progress: 50, color: 'bg-purple-500' },
  searching: { emoji: '🔍', text: 'Searching for available slots...', progress: 75, color: 'bg-purple-500' },
  booking: { emoji: '📅', text: 'Booking available slot...', progress: 90, color: 'bg-green-700' },
  completed: { emoji: '🎉', text: 'Booking completed successfully!', progress: 100, color: 'bg-green-800' },
  error: { emoji: '❌', text: 'Automation failed', progress: 0, color: 'bg-red-500' },
  cancelled: { emoji: '🛑', text: 'Automation cancelled', progress: 0, color: 'bg-yellow-500' }
};

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  stage?: string;
}

const LiveAutomationMonitor = ({ jobId, onStop }: LiveAutomationMonitorProps) => {
  const [status, setStatus] = useState<VPSJobStatus | null>(null);
  const [systemHealth, setSystemHealth] = useState<VPSSystemHealth | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [qrUpdateCount, setQrUpdateCount] = useState(0);
  const [lastQrUpdate, setLastQrUpdate] = useState<string>('');
  const [pollingService, setPollingService] = useState<VPSPollingService | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Enhanced VPS polling service integration
  useEffect(() => {
    console.log(`🎯 [MONITOR] Setting up ultra-fast polling for job: ${jobId}`);
    
    // Create VPS polling service with enhanced callbacks
    const polling = new VPSPollingService(
      // Status update callback
      (statusUpdate: VPSJobStatus) => {
        console.log(`📊 [MONITOR] Status update:`, statusUpdate);
        setStatus(statusUpdate);
        setIsConnected(true);
        
        if (statusUpdate.started_at && !startTime) {
          setStartTime(new Date(statusUpdate.started_at));
        }
        
        // Add status changes to logs
        setLogs(prev => [...prev, {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Status: ${statusUpdate.status} - ${statusUpdate.message || 'Processing...'}`,
          stage: statusUpdate.stage
        }]);
      },
      
      // QR code callback with enhanced tracking
      (qrCodeData: string) => {
        console.log(`📱 [MONITOR] NEW QR received:`, qrCodeData.substring(0, 50) + '...');
        setQrCode(qrCodeData);
        setQrUpdateCount(prev => prev + 1);
        setLastQrUpdate(new Date().toLocaleTimeString());
        setIsConnected(true);
        
        // Add QR update to logs
        setLogs(prev => [...prev, {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `🆕 QR Code updated (#${qrUpdateCount + 1}) - Ready for scanning`,
          stage: 'qr_update'
        }]);
      }
    );

    setPollingService(polling);

    // Start ultra-smart QR polling
    polling.startSmartQRPolling(jobId);
    
    // Cleanup function
    return () => {
      console.log(`🧹 [MONITOR] Cleaning up polling for job: ${jobId}`);
      polling.cleanup();
    };
  }, [jobId, startTime, qrUpdateCount]);

  // Connection health monitoring
  useEffect(() => {
    if (!pollingService) return;

    const healthCheck = setInterval(() => {
      // Check if we're still receiving updates
      const now = Date.now();
      const lastActivity = pollingService.getQRStats().lastUpdate;
      
      if (lastActivity && (now - lastActivity) > 30000) { // 30 seconds without updates
        console.warn(`⚠️ [MONITOR] No QR updates for 30+ seconds - connection may be stale`);
        setIsConnected(false);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(healthCheck);
  }, [pollingService]);

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!startTime) return '00:00';
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get current status configuration
  const currentStatusConfig = status ? statusConfigs[status.status] || statusConfigs.error : statusConfigs.idle;

  // Format time
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleRefreshQR = async () => {
    if (!pollingService) return;
    
    try {
      console.log(`🔄 [MONITOR] Manual QR refresh requested`);
      const newQrCode = await pollingService.refreshQRCode(jobId);
      if (newQrCode) {
        console.log(`✅ [MONITOR] QR refreshed successfully`);
      } else {
        console.log(`⚠️ [MONITOR] No new QR available`);
      }
    } catch (error) {
      console.error('❌ [MONITOR] Error refreshing QR code:', error);
    }
  };

  const handleForceRefresh = () => {
    console.log(`🔄 [MONITOR] Force refresh - restarting polling service`);
    if (pollingService) {
      pollingService.cleanup();
      setTimeout(() => {
        pollingService.startSmartQRPolling(jobId);
      }, 1000);
    }
  };

  // Enhanced QR-ready detection with correct status types
  const isQRReady = status && (
    status.status === 'waiting_bankid' || 
    status.stage === 'bankid' ||
    status.stage === 'authentication' ||
    status.stage === 'qr_streaming' ||
    (status.message && status.message.toLowerCase().includes('qr'))
  );

  return (
    <div className="space-y-6 bg-slate-950 text-white p-6 rounded-lg">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="h-8 w-8 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold">Ultra-Fast Automation Monitor</h2>
            <p className="text-slate-400">Job ID: {jobId}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Enhanced Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {isConnected ? <Wifi className="h-4 w-4 text-green-400" /> : <WifiOff className="h-4 w-4 text-red-400" />}
            <span className="text-sm text-slate-400">
              {isConnected ? 'Live Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* QR Update Counter */}
          {qrUpdateCount > 0 && (
            <div className="flex items-center space-x-2 bg-green-900 px-3 py-1 rounded-full">
              <Zap className="h-4 w-4 text-green-400" />
              <span className="text-sm text-green-300">QR Updates: {qrUpdateCount}</span>
            </div>
          )}
          
          <Button onClick={onStop} variant="destructive" className="bg-red-600 hover:bg-red-700">
            <Square className="h-4 w-4 mr-2" />
            Stop Automation
          </Button>
        </div>
      </div>

      {/* Enhanced Status Card */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{currentStatusConfig.emoji}</span>
              <div>
                <span>{currentStatusConfig.text}</span>
                {status?.stage && status.stage !== status.status && (
                  <p className="text-sm text-slate-400">Stage: {status.stage}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-slate-400">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{getElapsedTime()}</span>
              </div>
              {lastQrUpdate && (
                <div className="text-sm">
                  Last QR: {lastQrUpdate}
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress 
            value={currentStatusConfig.progress} 
            className="h-3"
          />
          
          <div className="grid grid-cols-3 gap-4 text-sm text-slate-400">
            {status?.cycle_count && (
              <span>Cycle: {status.cycle_count}</span>
            )}
            <span>Slots found: {status?.slots_found || 0}</span>
            <span>Progress: {currentStatusConfig.progress}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced QR Code Display */}
      {isQRReady && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5" />
                <span>Ultra-Fast BankID QR Code</span>
                {qrUpdateCount > 0 && (
                  <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs">
                    #{qrUpdateCount}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleRefreshQR}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Refresh QR
                </Button>
                <Button 
                  onClick={handleForceRefresh}
                  variant="outline"
                  size="sm"
                  className="border-blue-600 text-blue-300 hover:bg-blue-900"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Force Refresh
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {qrCode ? (
              <QRCodeDisplay 
                qrCode={qrCode} 
                jobId={jobId}
                onRefresh={handleRefreshQR}
              />
            ) : (
              <div className="flex flex-col items-center space-y-4 p-8">
                <div className="w-48 h-48 bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center space-y-3">
                  <Smartphone className="h-16 w-16 text-slate-500 animate-pulse" />
                  <p className="text-slate-400 text-center">
                    Waiting for QR code from backend...
                  </p>
                  <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-blue-500 animate-pulse"></div>
                  </div>
                </div>
                
                <p className="text-center text-slate-300">
                  Ultra-fast QR polling is active - QR will appear within seconds!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced System Metrics */}
      {systemHealth && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Real-Time System Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm text-slate-400">CPU Usage</p>
                  <p className="font-semibold text-white">{systemHealth.cpu_usage}%</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-sm text-slate-400">Memory</p>
                  <p className="font-semibold text-white">{systemHealth.memory_usage}%</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-slate-400">Active Jobs</p>
                <p className="font-semibold text-white">{systemHealth.active_jobs}</p>
              </div>
              
              <div>
                <p className="text-sm text-slate-400">Browser Instances</p>
                <p className="font-semibold text-white">{systemHealth.browser_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Logs Section */}
      <Card className="bg-slate-900 border-slate-700">
        <Collapsible open={logsExpanded} onOpenChange={setLogsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-800 transition-colors">
              <CardTitle className="flex items-center justify-between text-white">
                <span>Live Activity Logs ({logs.length})</span>
                {logsExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent>
              <ScrollArea className="h-64 w-full">
                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No activity logs yet...</p>
                  ) : (
                    logs.map((log, index) => (
                      <div 
                        key={index}
                        className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 ${
                          log.stage === 'qr_update' 
                            ? 'bg-green-900 border-green-500' 
                            : 'bg-slate-800 border-blue-500'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <span className="text-xs font-mono text-slate-400 bg-slate-700 px-2 py-1 rounded">
                            {formatTime(log.timestamp)}
                          </span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white break-words">
                            {log.message}
                          </p>
                          {log.stage && log.stage !== 'qr_update' && (
                            <p className="text-xs text-slate-400 mt-1">
                              Stage: {log.stage}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export default LiveAutomationMonitor;
