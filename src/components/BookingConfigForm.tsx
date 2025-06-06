import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import PersonnummerInput from './PersonnummerInput';
import DateRangePicker, { DateRange } from './DateRangePicker';
import LocationSelector from './LocationSelector';
import ConfigurationSummary from './ConfigurationSummary';
import { Car, FileCheck, Calendar, MapPin, Save, Play, Eye } from 'lucide-react';

// ... keep existing code (licenseTypes, vehicleOptions, languageOptions constants)

const licenseTypes = [
  { value: 'A', label: 'A - Motorcykel' },
  { value: 'A1', label: 'A1 - Lätt motorcykel' },
  { value: 'A2', label: 'A2 - Mellanstor motorcykel' },
  { value: 'AM', label: 'AM - Moped' },
  { value: 'B', label: 'B - Personbil' },
  { value: 'B96', label: 'B96 - Personbil med släp' },
  { value: 'BE', label: 'BE - Personbil med tung släp' },
  { value: 'C', label: 'C - Lastbil' },
  { value: 'C1', label: 'C1 - Lätt lastbil' },
  { value: 'CE', label: 'CE - Lastbil med släp' },
  { value: 'C1E', label: 'C1E - Lätt lastbil med släp' },
  { value: 'D', label: 'D - Buss' },
  { value: 'D1', label: 'D1 - Liten buss' },
  { value: 'DE', label: 'DE - Buss med släp' },
  { value: 'D1E', label: 'D1E - Liten buss med släp' }
];

const vehicleOptions = [
  'Ja, manuell',
  'Ja, automat', 
  'Nej, använder egen bil'
];

const languageOptions = [
  'Svenska',
  'Engelska',
  'Arabiska',
  'Dari',
  'Finska',
  'Kurdiska sorani',
  'Somaliska',
  'Spanska'
];

const formSchema = z.object({
  personnummer: z.string()
    .regex(/^\d{8}-\d{4}$/, 'Personnummer måste vara i formatet YYYYMMDD-XXXX'),
  license_type: z.string().min(1, 'Körkortsbehörighet krävs'),
  exam: z.enum(['Körprov', 'Kunskapsprov']),
  vehicle_language: z.array(z.string()).min(1, 'Minst ett alternativ måste väljas'),
  date_ranges: z.array(z.object({
    from: z.date(),
    to: z.date()
  })).min(1, 'Minst en datumperiod krävs'),
  locations: z.array(z.string()).min(1, 'Minst en provplats krävs')
});

type FormData = z.infer<typeof formSchema>;

// Helper function to safely convert potential date range data to DateRange[]
const safeParseDateRanges = (dateRanges: any[]): DateRange[] => {
  if (!Array.isArray(dateRanges)) return [];
  
  return dateRanges
    .map((range: any) => {
      const from = range.from ? new Date(range.from) : null;
      const to = range.to ? new Date(range.to) : null;
      
      // Only include ranges where both dates are valid
      if (from && to && !isNaN(from.getTime()) && !isNaN(to.getTime())) {
        return { from, to };
      }
      return null;
    })
    .filter((range): range is DateRange => range !== null);
};

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
          // Use the helper function to safely parse date ranges
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
        // Don't auto-populate form if user is editing
        if (!isEditing) {
          populateFormFromConfig(data);
        }
      }
    } catch (error) {
      console.error('Unexpected error loading config:', error);
    }
  };

  const populateFormFromConfig = (config: any) => {
    // Use the helper function to safely parse date ranges
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
        {/* Personal Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Personuppgifter
            </CardTitle>
            <CardDescription>
              Din personliga information för BankID-inloggning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="personnummer"
              render={({ field, fieldState }) => (
                <PersonnummerInput
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  isPrivacyMode={!!savedConfig}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* License & Test Configuration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Prov & behörighet
            </CardTitle>
            <CardDescription>
              Välj din körkortsbehörighet och provtyp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="license_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Körkortsbehörighet <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj körkortsbehörighet" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {licenseTypes.map((license) => (
                        <SelectItem key={license.value} value={license.value}>
                          {license.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exam"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Provtyp <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Körprov" id="körprov" />
                        <label htmlFor="körprov" className="flex items-center gap-2 cursor-pointer">
                          🚗 Körprov
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Kunskapsprov" id="kunskapsprov" />
                        <label htmlFor="kunskapsprov" className="flex items-center gap-2 cursor-pointer">
                          📚 Kunskapsprov
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicle_language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchedExam === 'Körprov' ? 'Fordon' : 'Språk'} <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange([value])} 
                    defaultValue={field.value[0]}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Välj ${watchedExam === 'Körprov' ? 'fordon' : 'språk'}`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(watchedExam === 'Körprov' ? vehicleOptions : languageOptions).map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Date & Location Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Datum & platser
            </CardTitle>
            <CardDescription>
              Välj när och var du vill genomföra ditt prov
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="date_ranges"
              render={({ field, fieldState }) => (
                <DateRangePicker
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <FormField
              control={form.control}
              name="locations"
              render={({ field, fieldState }) => (
                <LocationSelector
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={loading}>
                <Save className="mr-2 h-4 w-4" />
                {savedConfig ? 'Uppdatera konfiguration' : 'Spara konfiguration'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Förhandsgranska
              </Button>

              {savedConfig && subscribed && (
                <Button
                  type="button"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleStartBooking}
                  disabled={loading || savedConfig.is_active}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {savedConfig.is_active ? 'Bokning aktiv' : 'Starta automatisk bokning'}
                </Button>
              )}

              {savedConfig && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    populateFormFromConfig(savedConfig);
                  }}
                >
                  Avbryt redigering
                </Button>
              )}
            </div>

            {!subscribed && (
              <p className="text-sm text-amber-600 mt-3">
                Aktivt abonnemang krävs för att starta automatisk bokning
              </p>
            )}
          </CardContent>
        </Card>

        {/* Preview Section */}
        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle>Förhandsgranskning</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <p><strong>Personnummer:</strong> {form.watch('personnummer') || 'Ej angivet'}</p>
                <p><strong>Körkortsbehörighet:</strong> {form.watch('license_type')}</p>
                <p><strong>Provtyp:</strong> {form.watch('exam')}</p>
                <p><strong>{watchedExam === 'Körprov' ? 'Fordon:' : 'Språk:'}</strong> {form.watch('vehicle_language')?.join(', ') || 'Ej angivet'}</p>
                <p><strong>Datumperioder:</strong> {form.watch('date_ranges')?.length || 0} st</p>
                <p><strong>Provplatser:</strong> {form.watch('locations')?.join(', ') || 'Inga valda'}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </FormProvider>
  );
};

export default BookingConfigForm;
