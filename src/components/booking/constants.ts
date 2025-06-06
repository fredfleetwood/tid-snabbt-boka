
import { z } from 'zod';

export const licenseTypes = [
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

export const vehicleOptions = [
  'Ja, manuell',
  'Ja, automat', 
  'Nej, använder egen bil'
];

export const languageOptions = [
  'Svenska',
  'Engelska',
  'Arabiska',
  'Dari',
  'Finska',
  'Kurdiska sorani',
  'Somaliska',
  'Spanska'
];

export const formSchema = z.object({
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

export type FormData = z.infer<typeof formSchema>;
