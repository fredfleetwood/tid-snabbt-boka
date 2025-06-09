
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, TestTube, RefreshCw } from 'lucide-react';
import { VPS_CONFIG } from '@/config/vps';
import { useToast } from '@/components/ui/use-toast';
import { vpsService } from '@/services/vpsService';

interface VPSSettingsPanelProps {
  onClose: () => void;
}

const VPSSettingsPanel = ({ onClose }: VPSSettingsPanelProps) => {
  const [settings, setSettings] = useState({
    vpsUrl: VPS_CONFIG.VPS_URL,
    apiToken: VPS_CONFIG.VPS_API_TOKEN,
    autoReconnect: true,
    maxRetries: 3,
    timeoutSeconds: 30,
    debugMode: false,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const { toast } = useToast();

  const handleSaveSettings = () => {
    // In a real implementation, these would be saved to a config file or database
    toast({
      title: "Settings Saved",
      description: "VPS configuration has been updated successfully.",
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const isConnected = await vpsService.ping();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
      
      toast({
        title: isConnected ? "Connection Successful" : "Connection Failed",
        description: isConnected 
          ? "Successfully connected to the VPS server." 
          : "Failed to connect to the VPS server. Please check your settings.",
        variant: isConnected ? "default" : "destructive",
      });
    } catch (error) {
      setConnectionStatus('failed');
      toast({
        title: "Connection Failed",
        description: "Unable to reach the VPS server.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-green-500">Connected</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>VPS Server Configuration</span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Connection Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vpsUrl">VPS Server URL</Label>
                <Input
                  id="vpsUrl"
                  value={settings.vpsUrl}
                  onChange={(e) => setSettings({ ...settings, vpsUrl: e.target.value })}
                  placeholder="http://your-vps-server.com:8080"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="apiToken">API Token</Label>
                <Input
                  id="apiToken"
                  type="password"
                  value={settings.apiToken}
                  onChange={(e) => setSettings({ ...settings, apiToken: e.target.value })}
                  placeholder="Your API token"
                />
              </div>
            </div>

            <Button 
              onClick={handleTestConnection}
              disabled={isTesting}
              variant="outline"
              className="w-full"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Advanced Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxRetries">Max Retry Attempts</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  value={settings.maxRetries}
                  onChange={(e) => setSettings({ ...settings, maxRetries: parseInt(e.target.value) })}
                  min="1"
                  max="10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeoutSeconds">Timeout (seconds)</Label>
                <Input
                  id="timeoutSeconds"
                  type="number"
                  value={settings.timeoutSeconds}
                  onChange={(e) => setSettings({ ...settings, timeoutSeconds: parseInt(e.target.value) })}
                  min="5"
                  max="120"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-reconnect</Label>
                  <p className="text-sm text-gray-600">
                    Automatically reconnect when connection is lost
                  </p>
                </div>
                <Switch
                  checked={settings.autoReconnect}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoReconnect: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Debug Mode</Label>
                  <p className="text-sm text-gray-600">
                    Enable detailed logging for troubleshooting
                  </p>
                </div>
                <Switch
                  checked={settings.debugMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, debugMode: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Server Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Server Information</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Current Server:</span>
                <span className="text-sm">{VPS_CONFIG.VPS_URL}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">WebSocket Status:</span>
                <span className="text-sm">{vpsService.getWebSocketStatus()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Last Connection Test:</span>
                <span className="text-sm">
                  {connectionStatus === 'unknown' ? 'Not tested' : 
                   connectionStatus === 'connected' ? 'Successful' : 'Failed'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button onClick={handleSaveSettings} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VPSSettingsPanel;
