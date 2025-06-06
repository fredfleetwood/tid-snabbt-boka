
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form';
import { Calendar } from 'lucide-react';
import { Control, FieldErrors } from 'react-hook-form';
import { FormData } from './constants';
import DateRangePicker, { DateRange } from '../DateRangePicker';
import LocationSelector from '../LocationSelector';

interface DateLocationSectionProps {
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
}

const DateLocationSection = ({ control, errors }: DateLocationSectionProps) => {
  return (
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
          control={control}
          name="date_ranges"
          render={({ field, fieldState }) => (
            <DateRangePicker
              value={field.value || []}
              onChange={(ranges: DateRange[]) => field.onChange(ranges)}
              error={fieldState.error?.message}
            />
          )}
        />

        <FormField
          control={control}
          name="locations"
          render={({ field, fieldState }) => (
            <LocationSelector
              value={field.value || []}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </CardContent>
    </Card>
  );
};

export default DateLocationSection;
