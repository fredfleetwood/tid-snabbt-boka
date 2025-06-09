
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
  Clock
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

const VPSTestPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [systemHealth, setSystemHealth] = useState<VPSSystemHealth | null>(null);
  const [testBookingResult, setTestBookingResult] = useState<any>(null);
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
    updateTestResult('Connectivity', 'pending', 'Testing basic connectivity...');
    
    try {
      const isOnline = await vpsService.ping();
      const duration = Date.now() - startTime;
      
      if (isOnline) {
        updateTestResult('Connectivity', 'success', 'VPS server is reachable', duration);
        return true;
      } else {
        updateTestResult('Connectivity', 'error', 'VPS server is not reachable', duration);
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult('Connectivity', 'error', `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, duration);
      return false;
    }
  };

  const runHealthTest = async (): Promise<boolean> => {
    const startTime = Date.now();
    updateTestResult('Health Check', 'pending', 'Checking VPS system health...');
    
    try {
      const health = await vpsService.getSystemHealth();
      const duration = Date.now() - startTime;
      
      setSystemHealth(health);
      
      if (health.status === 'healthy') {
        updateTestResult('Health Check', 'success', 'System is healthy', duration, health);
        return true;
      } else {
        updateTestResult('Health Check', 'error', `System status: ${health.status}`, duration, health);
        return false;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult('Health Check', 'error', `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`, duration);
      return false;
    }
  };

  const runAuthenticationTest = async (): Promise<boolean> => {
    const startTime = Date.now();
    updateTestResult('Authentication', 'pending', 'Testing API authentication...');
    
    try {
      // Test authentication by making an authenticated request to system info
      const response = await fetch('http://87.106.247.92:8080/api/system/info', {
        headers: {
          'Authorization': 'Bearer test-secret-token-12345',
          'Content-Type': 'application/json',
        },
      });
      
      const duration = Date.now() - startTime;
      
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
      updateTestResult('Authentication', 'error', `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, duration);
      return false;
    }
  };

  const runTestBooking = async () => {
    const startTime = Date.now();
    updateTestResult('Test Booking', 'pending', 'Starting test booking automation...');
    
    try {
      const testConfig = {
        personnummer: '123456-1234',
        license_type: 'B',
        exam: 'Körprov' as const,
        vehicle_language: ['Svenska'],
        date_ranges: [{
          from: new Date().toISOString().split('T')[0],
          to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }],
        locations: ['Test Location'],
        user_id: 'test-user',
        config_id: 'test-config'
      };

      const response = await vpsService.startBooking(testConfig);
      const duration = Date.now() - startTime;
      
      if (response.success) {
        setTestBookingResult(response);
        updateTestResult('Test Booking', 'success', `Test booking started: ${response.job_id}`, duration, response);
        
        // Stop the test booking after a few seconds
        setTimeout(async () => {
          try {
            await vpsService.stopBooking(response.job_id);
            toast({
              title: "Test booking stopped",
              description: "Test booking automation has been stopped.",
            });
          } catch (error) {
            console.error('Failed to stop test booking:', error);
          }
        }, 5000);
      } else {
        updateTestResult('Test Booking', 'error', response.message || 'Test booking failed', duration);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestResult('Test Booking', 'error', `Test booking failed: ${error instanceof Error ? error.message : 'Unknown error'}`, duration);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setSystemHealth(null);
    setTestBookingResult(null);

    toast({
      title: "🔧 Running VPS Tests",
      description: "Testing VPS connectivity and functionality...",
    });

    // Run tests sequentially
    const connectivityOk = await runConnectivityTest();
    
    if (connectivityOk) {
      const healthOk = await runHealthTest();
      const authOk = await runAuthenticationTest();
      
      if (healthOk && authOk) {
        toast({
          title: "✅ All VPS Tests Passed",
          description: "VPS server is fully operational.",
        });
      }
    }

    setIsRunning(false);
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
              <span className="text-orange-800">VPS Developer Tools</span>
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
              <strong>Developer/Admin Tool:</strong> This panel tests VPS connectivity and functionality. 
              Use for debugging and monitoring VPS server status.
            </AlertDescription>
          </Alert>

          <div className="flex space-x-2">
            <Button 
              onClick={runAllTests}
              disabled={isRunning}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              onClick={runTestBooking}
              disabled={isRunning || testResults.find(r => r.test === 'Authentication')?.status !== 'success'}
            >
              <Play className="h-4 w-4 mr-2" />
              Test Booking
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-800">Test Results:</h4>
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

          {/* Test Booking Result */}
          {testBookingResult && (
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Test Booking Result
              </h4>
              <div className="bg-gray-50 rounded p-3 text-xs font-mono">
                <pre>{JSON.stringify(testBookingResult, null, 2)}</pre>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
            <strong>VPS Server:</strong> 87.106.247.92:8080 | 
            <strong>Token:</strong> test-secret-token-12345 | 
            <strong>Environment:</strong> Development
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VPSTestPanel;
