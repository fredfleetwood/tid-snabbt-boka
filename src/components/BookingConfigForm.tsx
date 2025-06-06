
import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import ConfigurationSummary from './ConfigurationSummary';
import PersonalInfoSection from './booking/PersonalInfoSection';
import LicenseTestSection from './booking/LicenseTestSection';
import DateLocationSection from './booking/DateLocationSection';
import ActionButtonsSection from './booking/ActionButtonsSection';
import PreviewSection from './booking/PreviewSection';
import { formSchema, FormData } from './booking/constants';
import { safeParseDateRanges } from './booking/utils';

const BookingConfigForm = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [savedConfig, setSavedConfig] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  // Save form data to localStorage when it changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (data.personnummer || data.locations?.length || data.date_ranges?.length) {
        localStorage.setItem('booking-config-draft', JSON.stringify(data));
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
        console.error('Failed to load draft:', error);
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
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading config:', error);
        return;
      }

      if (data) {
        setSavedConfig(data);
        if (!isEditing) {
          populateFormFromConfig(data);
        }
      }
    } catch (error) {
      console.error('Unexpected error loading config:', error);
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
    if (!user) {
      toast({
        title: "Fel",
        description: "Du måste vara inloggad för att spara konfiguration",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const configData = {
        user_id: user.id,
        personnummer: data.personnummer,
        license_type: data.license_type,
        exam: data.exam,
        vehicle_language: data.vehicle_language,
        date_ranges: data.date_ranges.map(range => ({
          from: range.from.toISOString(),
          to: range.to.toISOString()
        })),
        locations: data.locations,
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

      setSavedConfig(result.data);
      setIsEditing(false);
      localStorage.removeItem('booking-config-draft');
      
      toast({
        title: "Framgång!",
        description: "Konfiguration sparad framgångsrikt"
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara konfiguration. Försök igen.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

    setLoading(true);
    try {
      const { error } = await supabase
        .from('booking_configs')
        .update({ is_active: true })
        .eq('id', savedConfig.id);

      if (error) throw error;

      setSavedConfig({ ...savedConfig, is_active: true });
      toast({
        title: "Bokning startad!",
        description: "Automatisk bokning är nu aktiv för din konfiguration"
      });
    } catch (error) {
      console.error('Start booking error:', error);
      toast({
        title: "Fel",
        description: "Kunde inte starta bokning. Försök igen.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!savedConfig) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('booking_configs')
        .update({ is_active: !savedConfig.is_active })
        .eq('id', savedConfig.id);

      if (error) throw error;

      setSavedConfig({ ...savedConfig, is_active: !savedConfig.is_active });
      toast({
        title: savedConfig.is_active ? "Bokning stoppad" : "Bokning startad",
        description: savedConfig.is_active 
          ? "Automatisk bokning har stoppats" 
          : "Automatisk bokning är nu aktiv"
      });
    } catch (error) {
      console.error('Toggle booking error:', error);
      toast({
        title: "Fel",
        description: "Kunde inte uppdatera bokningsstatus. Försök igen.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
          loading={loading}
        />
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
          loading={loading}
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
