
import { Check, Smartphone, Clock, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import SubscriptionButton from './SubscriptionButton';

const Pricing = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();

  const features = [
    {
      icon: <Search className="w-5 h-5 text-green-500" />,
      text: "Obegränsad sökning"
    },
    {
      icon: <Check className="w-5 h-5 text-green-500" />,
      text: "Automatisk bokning"
    },
    {
      icon: <Smartphone className="w-5 h-5 text-green-500" />,
      text: "Fungerar på mobil och dator"
    },
    {
      icon: <RefreshCw className="w-5 h-5 text-green-500" />,
      text: "Gratis förlängning om ingen tid hittas inom 30 dagar"
    }
  ];

  return (
    <section id="pricing" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Enkel och transparent prissättning
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            En fast avgift, inga dolda kostnader. Betala bara en gång för 30 dagars fullständig service.
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className={`bg-white border-2 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow relative ${
            user && subscribed ? 'border-green-200' : 'border-blue-200'
          }`}>
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className={`text-white px-4 py-2 rounded-full text-sm font-semibold ${
                user && subscribed ? 'bg-green-600' : 'bg-blue-600'
              }`}>
                {user && subscribed ? 'Din nuvarande plan' : 'Mest populära'}
              </span>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Automatisk bokning
              </h3>
              <div className="mb-4">
                <span className="text-5xl font-bold text-blue-600">300kr</span>
                <span className="text-gray-600 ml-2">för 30 dagar</span>
              </div>
              <p className="text-gray-600">
                Allt du behöver för att få din provtid snabbare
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  {feature.icon}
                  <span className="text-gray-700">{feature.text}</span>
                </div>
              ))}
            </div>

            {user && subscribed ? (
              <div className="w-full bg-green-600 text-white py-4 rounded-lg text-lg font-semibold text-center">
                ✓ Aktiv prenumeration
              </div>
            ) : user ? (
              <SubscriptionButton />
            ) : (
              <a 
                href="/auth"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all text-center"
              >
                Kom igång nu - 300kr
              </a>
            )}

            <div className="text-center mt-6 text-sm text-gray-500">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span>🔒</span>
                <span>Säker betalning med Swish eller kort</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span>💰</span>
                <span>Pengarna tillbaka-garanti inom 7 dagar</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <div className="bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Garanti: Hittar vi ingen tid inom 30 dagar?
            </h4>
            <p className="text-gray-600">
              Då förlänger vi din service helt gratis i ytterligare 30 dagar. 
              Vi är så säkra på att vi kan hjälpa dig!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
