
import { BookingDetails } from './types';

export const getBookingDetails = (booking_details?: any): BookingDetails => {
  if (!booking_details) return {};
  if (typeof booking_details === 'string') {
    try {
      return JSON.parse(booking_details);
    } catch {
      return {};
    }
  }
  return booking_details as BookingDetails;
};

export const safeParseDateRanges = (dateRanges: any[]): any[] => {
  if (!Array.isArray(dateRanges)) return [];
  
  return dateRanges.map(range => {
    if (!range) return range;
    
    // If range has string dates, convert them to Date objects
    if (range.from && typeof range.from === 'string') {
      range.from = new Date(range.from);
    }
    if (range.to && typeof range.to === 'string') {
      range.to = new Date(range.to);
    }
    
    return range;
  }).filter(range => range && range.from && range.to);
};
