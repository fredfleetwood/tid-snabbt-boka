
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
