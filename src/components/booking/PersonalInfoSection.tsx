
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form';
import { FileCheck } from 'lucide-react';
import PersonnummerInput from '../PersonnummerInput';
import { Control, FieldErrors } from 'react-hook-form';
import { FormData } from './constants';

interface PersonalInfoSectionProps {
  control: Control<FormData>;
  errors: FieldErrors<FormData>;
  savedConfig?: any;
}

const PersonalInfoSection = ({ control, errors, savedConfig }: PersonalInfoSectionProps) => {
  return (
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
          control={control}
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
  );
};

export default PersonalInfoSection;
