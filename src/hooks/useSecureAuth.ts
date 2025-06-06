
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { securityMonitor, enhancedRateLimiter } from '@/utils/securityMonitoring';
import { logSecurityEvent } from '@/utils/security';
import { useToast } from '@/components/ui/use-toast';

/**
 * Enhanced authentication hook with security monitoring
 */
export const useSecureAuth = () => {
  const { user, signIn, signUp, signOut } = useAuth();
  const { toast } = useToast();
  const [isBlocked, setIsBlocked] = useState(false);

  const getUserIdentifier = (email: string) => {
    // Use email domain + first few chars for tracking
    const domain = email.split('@')[1] || 'unknown';
    const prefix = email.substring(0, 3);
    return `${prefix}_${domain}`;
  };

  const secureSignIn = async (email: string, password: string) => {
    const identifier = getUserIdentifier(email);

    // Check if user is blocked
    if (securityMonitor.isBlocked(identifier)) {
      setIsBlocked(true);
      logSecurityEvent('BLOCKED_USER_SIGNIN_ATTEMPT', { identifier });
      toast({
        title: "Konto tillfälligt blockerat",
        description: "För många misslyckade inloggningsförsök. Försök igen om 15 minuter.",
        variant: "destructive",
      });
      return { error: { message: 'Konto tillfälligt blockerat' } };
    }

    // Check rate limits
    if (!enhancedRateLimiter.isAllowed(identifier, 'auth')) {
      toast({
        title: "För många försök",
        description: "Vänta en stund innan du försöker igen.",
        variant: "destructive",
      });
      return { error: { message: 'För många försök' } };
    }

    const result = await signIn(email, password);

    if (result.error) {
      // Record failed attempt
      const blocked = securityMonitor.recordFailedAttempt(identifier);
      setIsBlocked(blocked);
      
      logSecurityEvent('FAILED_SIGNIN_ATTEMPT', { 
        identifier,
        error: result.error.message 
      });

      if (blocked) {
        toast({
          title: "Konto blockerat",
          description: "För många misslyckade försök. Kontot är blockerat i 15 minuter.",
          variant: "destructive",
        });
      }
    } else {
      // Record successful attempt
      securityMonitor.recordSuccessfulAttempt(identifier);
      enhancedRateLimiter.reset(identifier, 'auth');
      setIsBlocked(false);
      
      logSecurityEvent('SUCCESSFUL_SIGNIN', { identifier });
    }

    return result;
  };

  const secureSignUp = async (email: string, password: string) => {
    const identifier = getUserIdentifier(email);

    // Check rate limits for registration
    if (!enhancedRateLimiter.isAllowed(identifier, 'auth')) {
      toast({
        title: "För många försök",
        description: "Vänta en stund innan du försöker igen.",
        variant: "destructive",
      });
      return { error: { message: 'För många försök' } };
    }

    const result = await signUp(email, password);

    if (result.error) {
      logSecurityEvent('FAILED_SIGNUP_ATTEMPT', { 
        identifier,
        error: result.error.message 
      });
    } else {
      logSecurityEvent('SUCCESSFUL_SIGNUP', { identifier });
    }

    return result;
  };

  const secureSignOut = async () => {
    logSecurityEvent('USER_SIGNOUT', { userId: user?.id?.substring(0, 8) + '...' });
    return signOut();
  };

  // Monitor session changes for security
  useEffect(() => {
    if (user) {
      logSecurityEvent('SESSION_ACTIVE', { 
        userId: user.id.substring(0, 8) + '...',
        lastSignIn: user.last_sign_in_at 
      });
    }
  }, [user]);

  return {
    user,
    signIn: secureSignIn,
    signUp: secureSignUp,
    signOut: secureSignOut,
    isBlocked
  };
};
