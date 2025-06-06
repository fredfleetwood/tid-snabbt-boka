
import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logSecurityEvent } from '@/utils/security';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Security-aware error boundary that logs security-related errors
 */
class SecurityErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log security-relevant errors
    const isSecurityError = this.isSecurityRelatedError(error);
    
    if (isSecurityError) {
      logSecurityEvent('SECURITY_ERROR_BOUNDARY_TRIGGERED', {
        error: error.message,
        stack: error.stack?.substring(0, 200),
        componentStack: errorInfo.componentStack?.substring(0, 200)
      });
    }

    console.error('Error caught by SecurityErrorBoundary:', error, errorInfo);
  }

  private isSecurityRelatedError(error: Error): boolean {
    const securityKeywords = [
      'unauthorized',
      'authentication',
      'permission',
      'access denied',
      'forbidden',
      'rls',
      'row level security',
      'policy'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return securityKeywords.some(keyword => errorMessage.includes(keyword));
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isSecurityError = this.state.error ? this.isSecurityRelatedError(this.state.error) : false;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full">
            <Alert variant={isSecurityError ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {isSecurityError ? 'Säkerhetsfel' : 'Ett fel uppstod'}
              </AlertTitle>
              <AlertDescription className="mt-2">
                {isSecurityError ? (
                  <div className="space-y-2">
                    <p>Ett säkerhetsrelaterat fel har upptäckts. Detta kan bero på:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Saknade behörigheter</li>
                      <li>Utgången session</li>
                      <li>Nätverksproblem</li>
                    </ul>
                    <p className="text-sm">Försök logga in igen eller kontakta support om problemet kvarstår.</p>
                  </div>
                ) : (
                  <p>Ett oväntat fel uppstod. Försök ladda om sidan eller kontakta support om problemet kvarstår.</p>
                )}
              </AlertDescription>
              <div className="flex gap-2 mt-4">
                <Button onClick={this.handleRetry} variant="outline" size="sm">
                  Försök igen
                </Button>
                <Button onClick={this.handleReload} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ladda om
                </Button>
              </div>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SecurityErrorBoundary;
