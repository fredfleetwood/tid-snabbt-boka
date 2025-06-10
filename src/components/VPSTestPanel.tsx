import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Server, 
  Shield, 
  BarChart3, 
  Play, 
  AlertTriangle,
  Eye,
  EyeOff,
  Wifi,
  Database,
  Clock,
  Globe,
  Settings
} from 'lucide-react';
import { vpsService } from '@/services/vpsService';
import { VPSSystemHealth } from '@/services/types/vpsTypes';
import { useToast } from '@/hooks/use-toast';
import { VPSErrorHandler } from '@/utils/vpsErrorHandler';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
  details?: any;
}

interface DiagnosticInfo {
  serverUrl: string;
  reachable: boolean;
  fallbackMode: boolean;
  lastPingTime?: number;
  networkError?: string;
}

const VPSTestPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [systemHealth, setSystemHealth] = useState<VPSSystemHealth | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo | null>(null);
  const { toast } = useToast();

  const updateTestResult = (testName: string, status: TestResult['status'], message: string, duration?: number, details?: any) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.test === testName);
      const newResult = { test: testName, status, message, duration, details };
      
      if (existing) {
        return prev.map(r => r.test === testName ? newResult : r);
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runConnectivityTest = async (): Promise<boolean> => {
    const startTime = Date.now();
    updateTestResult('Network Connectivity', 'pending', 'Testing basic network connectivity...');
    
    try {
      console.log('[VPS-TEST] Starting connectivity test');
      const isOnline = await vpsService.ping();
      const duration = Date.now() - startTime;
      
      // Get connection info for diagnostics
      const connectionInfo = vpsService.getConnectionInfo();
      setDiagnosticInfo({
        serverUrl: connectionInfo.baseUrl,
        reachable: connectionInfo.reachable,
        fallbackMode: connectionInfo.fallbackMode,
        lastPingTime: duration
      });
      
      if (isOnline) {
        updateTestResult('Network Connectivity', 'success', `VPS server is reachable at ${connectionInfo.baseUrl}`, duration, connectionInfo);
        console.log('[VPS-TEST] Connectivity test passed');
        return true;
      } else {
        updateTestResult('Network Connectivity', 'error', `VPS server is not reachable at ${connectionInfo.baseUrl}`, duration, connectionInfo);
        console.log('[VPS-TEST] Connectivity test failed');
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VPS-TEST] Connectivity test error:', errorMessage);
      
      setDiagnosticInfo(prev => ({
        ...prev!,
        networkError: errorMessage,
        lastPingTime: duration
      }));
      
      updateTestResult('Network Connectivity', 'error', `Connection failed: ${errorMessage}`, duration, { error: errorMessage });
      return false;
    }
  };

  const runHealthTest = async (): Promise<boolean> => {
    const startTime = Date.now();
    updateTestResult('Health Check', 'pending', 'Checking VPS system health...');
    
    try {
      console.log('[VPS-TEST] Starting health check');
      const health = await vpsService.getSystemHealth();
      const duration = Date.now() - startTime;
      
      setSystemHealth(health);
      
      if (health.status === 'healthy') {
        updateTestResult('Health Check', 'success', 'System is healthy and responding', duration, health);
        console.log('[VPS-TEST] Health check passed');
        return true;
      } else {
        updateTestResult('Health Check', 'error', `System status: ${health.status}`, duration, health);
        console.log('[VPS-TEST] Health check failed:', health.status);
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VPS-TEST] Health check error:', errorMessage);
      updateTestResult('Health Check', 'error', `Health check failed: ${errorMessage}`, duration);
      return false;
    }
  };

  const runAdvancedDiagnostics = async () => {
    const startTime = Date.now();
    updateTestResult('Advanced Diagnostics', 'pending', 'Running comprehensive diagnostics...');
    
    try {
      console.log('[VPS-TEST] Starting advanced diagnostics');
      
      const connectionInfo = vpsService.getConnectionInfo();
      
      // Test different endpoints
      const diagnostics = {
        baseUrl: connectionInfo.baseUrl,
        reachable: connectionInfo.reachable,
        fallbackMode: connectionInfo.fallbackMode,
        timestamp: new Date().toISOString(),
        tests: {
          basicConnectivity: false,
          dnsResolution: false,
          portAccess: false,
          sslHandshake: false
        }
      };
      
      // Basic connectivity test
      try {
        await fetch(connectionInfo.baseUrl, { 
          method: 'HEAD', 
          mode: 'no-cors',
          timeout: 5000 
        });
        diagnostics.tests.basicConnectivity = true;
      } catch (error) {
        console.log('[VPS-TEST] Basic connectivity failed:', error);
      }
      
      // DNS resolution test
      try {
        const url = new URL(connectionInfo.baseUrl);
        await fetch(`https://dns.google/resolve?name=${url.hostname}&type=A`);
        diagnostics.tests.dnsResolution = true;
      } catch (error) {
        console.log('[VPS-TEST] DNS resolution failed:', error);
      }
      
      const duration = Date.now() - startTime;
      
      setDiagnosticInfo(prev => ({
        ...prev!,
        ...diagnostics
      }));
      
      if (diagnostics.tests.basicConnectivity) {
        updateTestResult('Advanced Diagnostics', 'success', 'Diagnostics completed - basic connectivity OK', duration, diagnostics);
      } else {
        updateTestResult('Advanced Diagnostics', 'error', 'Diagnostics show connectivity issues', duration, diagnostics);
      }
      
      console.log('[VPS-TEST] Advanced diagnostics completed:', diagnostics);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VPS-TEST] Advanced diagnostics error:', errorMessage);
      updateTestResult('Advanced Diagnostics', 'error', `Diagnostics failed: ${errorMessage}`, duration);
    }
  };

  const runAuthenticationTest = async (): Promise<boolean> => {
    const startTime = Date.now();
    updateTestResult('Authentication', 'pending', 'Testing API authentication...');
    
    try {
      console.log('[VPS-TEST] Starting authentication test');
      
      const response = await fetch('http://87.106.247.92:8080/api/system/info', {
        headers: {
          'Authorization': 'Bearer test-secret-token-12345',
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });
      
      const duration = Date.now() - startTime;
      console.log('[VPS-TEST] Auth response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        updateTestResult('Authentication', 'success', 'API authentication successful', duration, data);
        return true;
      } else if (response.status === 401) {
        updateTestResult('Authentication', 'error', 'Authentication failed - Invalid token', duration);
        return false;
      } else {
        updateTestResult('Authentication', 'error', `Authentication test failed with status ${response.status}`, duration);
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[VPS-TEST] Authentication test error:', errorMessage);
      updateTestResult('Authentication', 'error', `Authentication test failed: ${errorMessage}`, duration);
      return false;
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setSystemHealth(null);
    setDiagnosticInfo(null);

    toast({
      title: "🔧 Running Comprehensive VPS Tests",
      description: "Testing connectivity, authentication, and system health...",
    });

    console.log('[VPS-TEST] Starting comprehensive test suite');

    // Run tests with detailed diagnostics
    const connectivityOk = await runConnectivityTest();
    await runAdvancedDiagnostics();
    
    if (connectivityOk) {
      const healthOk = await runHealthTest();
      const authOk = await runAuthenticationTest();
      
      if (healthOk && authOk) {
        toast({
          title: "✅ All VPS Tests Passed",
          description: "VPS server is fully operational and accessible.",
        });
      } else {
        toast({
          title: "⚠️ Partial VPS Issues",
          description: "Some VPS tests failed. Check results for details.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "❌ VPS Server Unreachable",
        description: "Cannot connect to VPS server. Check network or server status.",
        variant: "destructive"
      });
    }

    setIsRunning(false);
    console.log('[VPS-TEST] Test suite completed');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-600">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'pending':
        return <Badge variant="secondary">Running...</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (!isVisible) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="pt-6">
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => setIsVisible(true)}
              className="text-gray-600 hover:text-gray-800"
            >
              <Eye className="h-4 w-4 mr-2" />
              Show VPS Developer Tools
            </Button>
            <p className="text-xs text-gray-500 mt-2">Developer/Admin only</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-orange-600" />
              <span className="text-orange-800">VPS Developer Tools & Diagnostics</span>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Enhanced Diagnostics:</strong> This panel provides deep network and connectivity analysis 
              to troubleshoot VPS server issues.
            </AlertDescription>
          </Alert>

          {/* Connection Status Overview */}
          {diagnosticInfo && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                <Globe className="h-4 w-4 mr-2" />
                Connection Diagnostics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Server URL:</strong> {diagnosticInfo.serverUrl}</p>
                  <p><strong>Reachable:</strong> <span className={diagnosticInfo.reachable ? 'text-green-600' : 'text-red-600'}>
                    {diagnosticInfo.reachable ? 'Yes' : 'No'}
                  </span></p>
                  <p><strong>Fallback Mode:</strong> <span className={diagnosticInfo.fallbackMode ? 'text-orange-600' : 'text-green-600'}>
                    {diagnosticInfo.fallbackMode ? 'Active' : 'Inactive'}
                  </span></p>
                </div>
                <div>
                  {diagnosticInfo.lastPingTime && (
                    <p><strong>Last Ping:</strong> {diagnosticInfo.lastPingTime}ms</p>
                  )}
                  {diagnosticInfo.networkError && (
                    <p><strong>Network Error:</strong> <span className="text-red-600 text-xs">{diagnosticInfo.networkError}</span></p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button 
              onClick={runAllTests}
              disabled={isRunning}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Run Full Diagnostics
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              onClick={runAdvancedDiagnostics}
              disabled={isRunning}
            >
              <Settings className="h-4 w-4 mr-2" />
              Network Analysis
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Diagnostic Results:</h4>
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium text-sm">{result.test}</p>
                      <p className="text-xs text-gray-600">{result.message}</p>
                      {result.duration && (
                        <p className="text-xs text-gray-500">Duration: {result.duration}ms</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
            </div>
          )}

          {/* System Health Metrics */}
          {systemHealth && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                VPS System Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{systemHealth.active_jobs}</p>
                  <p className="text-xs text-gray-600">Active Jobs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{systemHealth.memory_usage}%</p>
                  <p className="text-xs text-gray-600">Memory Usage</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{systemHealth.cpu_usage}%</p>
                  <p className="text-xs text-gray-600">CPU Usage</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{systemHealth.browser_count}</p>
                  <p className="text-xs text-gray-600">Browsers</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Status: <span className={`font-medium ${systemHealth.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                  {systemHealth.status}
                </span> | 
                Uptime: {Math.round(systemHealth.uptime / 3600)}h | 
                Last Check: {new Date(systemHealth.last_check).toLocaleTimeString()}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            <strong>VPS Server:</strong> 87.106.247.92:8080 | 
            <strong>Token:</strong> test-secret-token-12345 | 
            <strong>Environment:</strong> Development |
            <strong>Status:</strong> {diagnosticInfo?.reachable ? 'Online' : 'Offline'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VPSTestPanel;
