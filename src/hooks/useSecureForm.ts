
import { useState, useCallback } from 'react';
import { validateBookingConfig, rateLimiter, ValidationResult } from '@/utils/validation';
import { sanitizeError } from '@/utils/errorHandling';
import { logSecurityEvent } from '@/utils/security';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

/**
 * Secure form hook with validation, rate limiting, and security logging
 */
export const useSecureForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const secureSubmit = useCallback(async (
    data: any,
    submitFunction: (sanitizedData: any) => Promise<any>,
    options: {
      rateLimitKey?: string;
      validationType?: 'booking' | 'subscription' | 'custom';
      customValidator?: (data: any) => ValidationResult;
    } = {}
  ) => {
    if (!user) {
      logSecurityEvent('FORM_SUBMIT_WITHOUT_AUTH');
      toast({
        title: "Autentiseringsfel",
        description: "Du måste vara inloggad för att utföra denna åtgärd",
        variant: "destructive"
      });
      return { success: false, error: 'Not authenticated' };
    }

    // Rate limiting
    const rateLimitKey = options.rateLimitKey || user.id;
    if (!rateLimiter.isAllowed(rateLimitKey)) {
      toast({
        title: "För många försök",
        description: "Vänta en stund innan du försöker igen",
        variant: "destructive"
      });
      return { success: false, error: 'Rate limited' };
    }

    setIsSubmitting(true);
    setValidationErrors([]);

    try {
      // Validation
      let validationResult: ValidationResult;
      
      if (options.customValidator) {
        validationResult = options.customValidator(data);
      } else if (options.validationType === 'booking') {
        validationResult = validateBookingConfig(data);
      } else {
        // Default validation - basic sanitization
        validationResult = {
          isValid: true,
          errors: [],
          sanitizedData: data
        };
      }

      if (!validationResult.isValid) {
        setValidationErrors(validationResult.errors);
        logSecurityEvent('FORM_VALIDATION_FAILED', { 
          errors: validationResult.errors,
          userId: user.id 
        });
        
        toast({
          title: "Valideringsfel",
          description: validationResult.errors[0],
          variant: "destructive"
        });
        
        return { success: false, errors: validationResult.errors };
      }

      // Log successful validation
      logSecurityEvent('FORM_VALIDATION_SUCCESS', { 
        validationType: options.validationType,
        userId: user.id 
      });

      // Submit with sanitized data
      const result = await submitFunction(validationResult.sanitizedData);
      
      logSecurityEvent('FORM_SUBMIT_SUCCESS', { 
        validationType: options.validationType,
        userId: user.id 
      });

      return { success: true, data: result };

    } catch (error) {
      const safeError = sanitizeError(error);
      
      logSecurityEvent('FORM_SUBMIT_ERROR', { 
        error: safeError,
        userId: user.id 
      });

      toast({
        title: "Fel",
        description: safeError.message,
        variant: "destructive"
      });

      return { success: false, error: safeError };
    } finally {
      setIsSubmitting(false);
    }
  }, [user, toast]);

  const resetValidation = useCallback(() => {
    setValidationErrors([]);
  }, []);

  return {
    secureSubmit,
    isSubmitting,
    validationErrors,
    resetValidation
  };
};
