
import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useSecureForm } from '@/hooks/useSecureForm';
import { supabase } from '@/integrations/supabase/client';
import { supabaseBookingService } from '@/services/supabaseBookingService';
import ConfigurationSummary from './ConfigurationSummary';
import PersonalInfoSection from './booking/PersonalInfoSection';
import LicenseTestSection from './booking/LicenseTestSection';
import DateLocationSection from './booking/DateLocationSection';
import ActionButtonsSection from './booking/ActionButtonsSection';
import PreviewSection from './booking/PreviewSection';
import { formSchema, FormData } from './booking/constants';
import { safeParseDateRanges } from './booking/utils';
import { logSecurityEvent } from '@/utils/security';

const BookingConfigForm = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  const { secureSubmit, isSubmitting, validationErrors } = useSecureForm();
  const [savedConfig, setSavedConfig] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Real-time booking state
  const [bookingStatus, setBookingStatus] = useState<string>('idle');
  const [bookingProgress, setBookingProgress] = useState<number>(0);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personnummer: '',
      license_type: 'B',
      exam: 'Körprov',
      vehicle_language: ['Ja, manuell'],
      date_ranges: [],
      locations: []
    }
  });

  const watchedExam = form.watch('exam');

  // Load saved configuration on mount
  useEffect(() => {
    if (user) {
      loadSavedConfig();
    }
  }, [user]);

  // Set up real-time subscription for booking updates
  useEffect(() => {
    if (!user || !jobId) return;

    const subscription = supabaseBookingService.setupRealtimeSubscription(
      user.id,
      // Handle status updates
      (payload) => {
        setBookingStatus(payload.status || 'unknown');
        setBookingProgress(payload.progress || 0);
        
        // Show toast for important status changes
        if (payload.status === 'completed') {
          toast({
            title: "Bokning genomförd!",
            description: "Din körprovstid har bokats framgångsrikt",
          });
        } else if (payload.status === 'failed') {
          toast({
            title: "Bokning misslyckades",
            description: payload.message || "Ett fel uppstod under bokningsprocessen",
            variant: "destructive"
          });
        }
      },
      // Handle QR code updates
      (qrCode) => {
        setQrCode(qrCode);
        toast({
          title: "Ny QR-kod",
          description: "Scanna QR-koden med din BankID-app",
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user, jobId, toast]);

  // Save form data to localStorage when it changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (data.personnummer || data.locations?.length || data.date_ranges?.length) {
        try {
          localStorage.setItem('booking-config-draft', JSON.stringify(data));
        } catch (error) {
          logSecurityEvent('LOCALSTORAGE_ERROR', { error });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem('booking-config-draft');
    if (draft && !savedConfig) {
      try {
        const parsedDraft = JSON.parse(draft);
        if (parsedDraft.date_ranges) {
          parsedDraft.date_ranges = safeParseDateRanges(parsedDraft.date_ranges);
        }
        form.reset(parsedDraft);
      } catch (error) {
        logSecurityEvent('DRAFT_PARSE_ERROR', { error });
        // Clear corrupted draft
        localStorage.removeItem('booking-config-draft');
      }
    }
  }, [savedConfig, form]);

  const loadSavedConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_configs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logSecurityEvent('CONFIG_LOAD_ERROR', { error: error.message });
        return;
      }

      if (data) {
        setSavedConfig(data);
        if (!isEditing) {
          populateFormFromConfig(data);
        }
      }
    } catch (error) {
      logSecurityEvent('CONFIG_LOAD_UNEXPECTED_ERROR', { error });
    }
  };

  const populateFormFromConfig = (config: any) => {
    const dateRanges = safeParseDateRanges(config.date_ranges || []);

    form.reset({
      personnummer: config.personnummer,
      license_type: config.license_type,
      exam: config.exam,
      vehicle_language: config.vehicle_language,
      date_ranges: dateRanges,
      locations: config.locations
    });
  };

  const onSubmit = async (data: FormData) => {
    const result = await secureSubmit(
      data,
      async (sanitizedData) => {
        const configData = {
          user_id: user!.id,
          personnummer: sanitizedData.personnummer,
          license_type: sanitizedData.license_type,
          exam: sanitizedData.exam,
          vehicle_language: sanitizedData.vehicle_language,
          date_ranges: sanitizedData.date_ranges.map((range: any) => ({
            from: range.from.toISOString(),
            to: range.to.toISOString()
          })),
          locations: sanitizedData.locations,
          is_active: false
        };

        let result;
        if (savedConfig) {
          result = await supabase
            .from('booking_configs')
            .update(configData)
            .eq('id', savedConfig.id)
            .select()
            .single();
        } else {
          result = await supabase
            .from('booking_configs')
            .insert(configData)
            .select()
            .single();
        }

        if (result.error) {
          throw result.error;
        }

        return result.data;
      },
      {
        rateLimitKey: `booking_config_${user?.id}`,
        validationType: 'booking'
      }
    );

    if (result.success) {
      setSavedConfig(result.data);
      setIsEditing(false);
      localStorage.removeItem('booking-config-draft');
      
      toast({
        title: "Framgång!",
        description: "Konfiguration sparad framgångsrikt"
      });
    }
  };

  const handleStartBooking = async () => {
    if (!subscribed) {
      toast({
        title: "Aktivt abonnemang krävs",
        description: "Du behöver en aktiv prenumeration för att starta automatisk bokning",
        variant: "destructive"
      });
      return;
    }

    if (!savedConfig) {
      toast({
        title: "Spara konfiguration först",
        description: "Du måste spara din konfiguration innan du kan starta bokning",
        variant: "destructive"
      });
      return;
    }

    try {
      // First, activate the config in database
      const { error } = await supabase
        .from('booking_configs')
        .update({ is_active: true })
        .eq('id', savedConfig.id);

      if (error) throw error;

      // Then start the actual booking automation via Supabase → VPS
      const bookingConfig = {
        user_id: user!.id,
        config_id: savedConfig.id,
        personnummer: savedConfig.personnummer,
        license_type: savedConfig.license_type,
        exam: savedConfig.exam,
        vehicle_language: savedConfig.vehicle_language,
        locations: savedConfig.locations,
        date_ranges: savedConfig.date_ranges
      };

      const result = await supabaseBookingService.startBooking(bookingConfig);
      
      // Update local state
      setSavedConfig({ ...savedConfig, is_active: true });
      setJobId(result.job_id);
      setBookingStatus('starting');
      
      toast({
        title: "Bokning startad!",
        description: `Automatisk bokning startad via Supabase! Job ID: ${result.job_id}`,
      });
      
    } catch (error) {
      console.error('Error starting booking:', error);
      toast({
        title: "Fel vid start av bokning",
        description: error instanceof Error ? error.message : "Ett okänt fel uppstod",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async () => {
    if (!savedConfig) return;

    if (!savedConfig.is_active) {
      // If activating, call the full start booking process
      await handleStartBooking();
    } else {
      // If deactivating, just stop the booking
      const result = await secureSubmit(
        { configId: savedConfig.id, is_active: false },
        async (data) => {
          const { error } = await supabase
            .from('booking_configs')
            .update({ is_active: data.is_active })
            .eq('id', data.configId);

          if (error) throw error;
          return { ...savedConfig, is_active: data.is_active };
        },
        {
          rateLimitKey: `booking_toggle_${user?.id}`
        }
      );

      if (result.success) {
        setSavedConfig(result.data);
        toast({
          title: "Bokning stoppad",
          description: "Automatisk bokning har stoppats"
        });
      }
    }
  };

  // Show saved configuration if exists and not editing
  if (savedConfig && !isEditing) {
    return (
      <div className="space-y-6">
        <ConfigurationSummary
          config={savedConfig}
          onEdit={() => setIsEditing(true)}
          onToggleActive={handleToggleActive}
          loading={isSubmitting}
        />
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Valideringsfel:</h3>
            <ul className="text-red-700 mt-2">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">• {error}</li>
              ))}
            </ul>
          </div>
        )}

        <PersonalInfoSection 
          control={form.control}
          errors={form.formState.errors}
          savedConfig={savedConfig}
        />

        <LicenseTestSection 
          control={form.control}
          errors={form.formState.errors}
          watchedExam={watchedExam}
        />

        <DateLocationSection 
          control={form.control}
          errors={form.formState.errors}
        />

        <ActionButtonsSection
          loading={isSubmitting}
          savedConfig={savedConfig}
          subscribed={subscribed}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          handleStartBooking={handleStartBooking}
          setIsEditing={setIsEditing}
          populateFormFromConfig={populateFormFromConfig}
        />

        {showPreview && (
          <PreviewSection 
            watch={form.watch}
            watchedExam={watchedExam}
          />
        )}
      </form>
    </FormProvider>
  );
};

export default BookingConfigForm;
