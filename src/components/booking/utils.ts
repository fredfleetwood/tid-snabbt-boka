
import { DateRange } from '../DateRangePicker';

// Helper function to safely convert potential date range data to DateRange[]
export const safeParseDateRanges = (dateRanges: any[]): DateRange[] => {
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
