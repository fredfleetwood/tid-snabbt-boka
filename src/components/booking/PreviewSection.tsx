
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UseFormWatch } from 'react-hook-form';
import { FormData } from './constants';

interface PreviewSectionProps {
  watch: UseFormWatch<FormData>;
  watchedExam: string;
}

const PreviewSection = ({ watch, watchedExam }: PreviewSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Förhandsgranskning</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <p><strong>Personnummer:</strong> {watch('personnummer') || 'Ej angivet'}</p>
          <p><strong>Körkortsbehörighet:</strong> {watch('license_type')}</p>
          <p><strong>Provtyp:</strong> {watch('exam')}</p>
          <p><strong>{watchedExam === 'Körprov' ? 'Fordon:' : 'Språk:'}</strong> {watch('vehicle_language')?.join(', ') || 'Ej angivet'}</p>
          <p><strong>Datumperioder:</strong> {watch('date_ranges')?.length || 0} st</p>
          <p><strong>Provplatser:</strong> {watch('locations')?.join(', ') || 'Inga valda'}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PreviewSection;
