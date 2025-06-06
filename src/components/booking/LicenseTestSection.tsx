
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Car } from 'lucide-react';
import { Control, FieldErrors } from 'react-hook-form';
import { FormData, licenseTypes, vehicleOptions, languageOptions } from './constants';

interface LicenseTestSectionProps {
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
  watchedExam: string;
}

const LicenseTestSection = ({ control, errors, watchedExam }: LicenseTestSectionProps) => {
  return (
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
          control={control}
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
          control={control}
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
          control={control}
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
  );
};

export default LicenseTestSection;
