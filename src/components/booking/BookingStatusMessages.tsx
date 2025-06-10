
// Enhanced status mapping for booking automation
export const statusMessages = {
  'initializing': { emoji: '🚀', text: 'Startar automatisering...', progress: 5 },
  'browser_starting': { emoji: '🌍', text: 'Startar webbläsare...', progress: 10 },
  'navigating': { emoji: '🌐', text: 'Navigerar till Trafikverket...', progress: 15 },
  'cookies_accepted': { emoji: '🍪', text: 'Accepterade cookies', progress: 20 },
  'logging_in': { emoji: '🔐', text: 'Startar inloggning...', progress: 25 },
  'bankid_waiting': { emoji: '📱', text: 'Väntar på BankID...', progress: 30 },
  'login_success': { emoji: '✅', text: 'Inloggning lyckades!', progress: 40 },
  'selecting_locations': { emoji: '📍', text: 'Väljer provplatser...', progress: 45 },
  'locations_confirmed': { emoji: '✅', text: 'Alla provplatser valda', progress: 50 },
  'searching': { emoji: '🔄', text: 'Söker lediga tider...', progress: 60 },
  'searching_times': { emoji: '🔍', text: 'Analyserar tillgängliga tider...', progress: 70 },
  'times_found': { emoji: '📅', text: 'Hittade lediga tider!', progress: 75 },
  'booking_time': { emoji: '⏰', text: 'Bokar vald tid...', progress: 85 },
  'booking_complete': { emoji: '🎉', text: 'Bokning genomförd!', progress: 100 },
  'completed': { emoji: '🎉', text: 'Automatisering klar!', progress: 100 },
  'error': { emoji: '❌', text: 'Fel uppstod', progress: 0 },
  'cancelled': { emoji: '⏹️', text: 'Stoppad av användare', progress: 0 }
};
