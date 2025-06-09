
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UseFormWatch } from 'react-hook-form';
import { FormData } from './constants';

interface PreviewSectionProps {
  watch: UseFormWatch<FormData>;
  watchedExam: string;
}

const PreviewSection = ({ watch, watchedExam }: PreviewSectionProps) => {
  const personnummer = watch('personnummer');
  const licenseType = watch('license_type');
  const exam = watch('exam');
  const vehicleLanguage = watch('vehicle_language');
  const dateRanges = watch('date_ranges');
  const locations = watch('locations');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Förhandsgranskning</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <p><strong>Personnummer:</strong> {personnummer || 'Ej angivet'}</p>
          <p><strong>Körkortsbehörighet:</strong> {licenseType}</p>
          <p><strong>Provtyp:</strong> {exam}</p>
          <p><strong>{watchedExam === 'Körprov' ? 'Fordon:' : 'Språk:'}</strong> {vehicleLanguage?.join(', ') || 'Ej angivet'}</p>
          <p><strong>Datumperioder:</strong> {dateRanges?.length || 0} st</p>
          <p><strong>Provplatser:</strong> {locations?.join(', ') || 'Inga valda'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreviewSection;
