
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
  HardDrive
} from 'lucide-react';
import { vpsService } from '@/services/vpsService';
import { VPSWebSocketMessage, VPSJobStatus, VPSSystemHealth } from '@/services/types/vpsTypes';

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
  waiting_bankid: { emoji: '📱', text: 'Waiting for BankID authentication...', progress: 35, color: 'bg-orange-500' },
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // WebSocket connection and event handling
  useEffect(() => {
    const handleMessage = (message: VPSWebSocketMessage) => {
      console.log('WebSocket message received:', message);
      
      switch (message.type) {
        case 'status_update':
          setStatus(message.data);
          if (message.data.started_at && !startTime) {
            setStartTime(new Date(message.data.started_at));
          }
          break;
          
        case 'qr_code':
          setQrCode(message.data.qr_code);
          break;
          
        case 'log':
          setLogs(prev => [...prev, {
            timestamp: message.timestamp,
            level: message.data.level || 'info',
            message: message.data.message,
            stage: message.data.stage
          }]);
          break;
          
        case 'completion':
          setStatus(prev => prev ? { ...prev, status: 'completed' } : null);
          break;
          
        case 'error':
          setStatus(prev => prev ? { ...prev, status: 'error', error_message: message.data.error } : null);
          break;
      }
    };

    const handleError = (error: Event) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    const handleClose = (event: CloseEvent) => {
      console.log('WebSocket closed:', event);
      setIsConnected(false);
    };

    // Connect WebSocket
    vpsService.connectWebSocket(jobId, handleMessage, handleError, handleClose);
    setIsConnected(true);

    return () => {
      vpsService.disconnectWebSocket();
    };
  }, [jobId, startTime]);

  // Fetch initial status and system health
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [statusData, healthData] = await Promise.all([
          vpsService.getJobStatus(jobId),
          vpsService.getSystemHealth()
        ]);
        
        setStatus(statusData);
        setSystemHealth(healthData);
        
        if (statusData.started_at) {
          setStartTime(new Date(statusData.started_at));
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
  }, [jobId]);

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
    try {
      const newQrCode = await vpsService.getQRCode(jobId);
      if (newQrCode) {
        setQrCode(newQrCode);
      }
    } catch (error) {
      console.error('Error refreshing QR code:', error);
    }
  };

  return (
    <div className="space-y-6 bg-slate-950 text-white p-6 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="h-8 w-8 text-blue-400" />
          <div>
            <h2 className="text-2xl font-bold">Live Automation Monitor</h2>
            <p className="text-slate-400">Job ID: {jobId}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <Button onClick={onStop} variant="destructive" className="bg-red-600 hover:bg-red-700">
            <Square className="h-4 w-4 mr-2" />
            Stop Automation
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{currentStatusConfig.emoji}</span>
              <span>{currentStatusConfig.text}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-slate-400">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{getElapsedTime()}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress 
            value={currentStatusConfig.progress} 
            className="h-3"
          />
          
          {status?.cycle_count && (
            <div className="flex justify-between text-sm text-slate-400">
              <span>Cycle: {status.cycle_count}</span>
              <span>Slots found: {status.slots_found || 0}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Display */}
      {qrCode && status?.status === 'waiting_bankid' && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Smartphone className="h-5 w-5" />
              <span>BankID QR Code</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg">
                <img 
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="BankID QR Code"
                  className="w-48 h-48 object-contain"
                />
              </div>
              
              <p className="text-center text-slate-300">
                Scan this QR code with your BankID app
              </p>
              
              <Button 
                onClick={handleRefreshQR}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh QR Code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Metrics */}
      {systemHealth && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">System Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-sm text-slate-400">CPU</p>
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
                <p className="text-sm text-slate-400">Browsers</p>
                <p className="font-semibold text-white">{systemHealth.browser_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Section */}
      <Card className="bg-slate-900 border-slate-700">
        <Collapsible open={logsExpanded} onOpenChange={setLogsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-slate-800 transition-colors">
              <CardTitle className="flex items-center justify-between text-white">
                <span>Detailed Logs ({logs.length})</span>
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
                    <p className="text-slate-400 text-center py-4">No logs yet...</p>
                  ) : (
                    logs.map((log, index) => (
                      <div 
                        key={index}
                        className="flex items-start space-x-3 p-3 bg-slate-800 rounded-lg border-l-4 border-blue-500"
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
                          {log.stage && (
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
