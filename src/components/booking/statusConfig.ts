
export const statusConfig = {
  idle: { emoji: '🔴', text: 'Inte aktiv', color: 'bg-gray-500' },
  initializing: { emoji: '🟡', text: 'Startar webbläsare...', color: 'bg-yellow-500' },
  waiting_bankid: { emoji: '🔵', text: 'Väntar på BankID-inloggning...', color: 'bg-blue-500' },
  searching: { emoji: '🟠', text: 'Söker efter lediga tider...', color: 'bg-orange-500' },
  booking: { emoji: '🟢', text: 'Tid hittad - bokar nu...', color: 'bg-green-500' },
  completed: { emoji: '✅', text: 'Bokning klar!', color: 'bg-green-600' },
  error: { emoji: '❌', text: 'Fel uppstod', color: 'bg-red-500' }
};

export const getProgress = (status?: string) => {
  if (!status) return 0;
  const progressMap = {
    idle: 0,
    initializing: 20,
    waiting_bankid: 40,
    searching: 60,
    booking: 80,
    completed: 100,
    error: 0
  };
  return progressMap[status as keyof typeof progressMap] || 0;
};
