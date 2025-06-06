
import { useAuth } from '@/contexts/AuthContext';

const Hero = () => {
  const { user } = useAuth();

  const getStartedLink = user ? '/dashboard' : '/auth';
  const getStartedText = user ? 'Till min sida' : 'Kom igång nu - 300kr';

  return (
    <section className="bg-gradient-to-br from-blue-50 to-white py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Swedish flag indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border">
              <span className="text-sm text-gray-600">🇸🇪</span>
              <span className="text-sm font-medium text-gray-800">Svenskt företag</span>
            </div>
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Automatisk bokning av körkortsprov
            <span className="block text-blue-600">Spara tid och få din provtid snabbare</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Vi bokar automatiskt lediga provtider på Trafikverket åt dig, 24/7. 
            Slipp sitta och uppdatera sidan manuellt.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a 
              href={getStartedLink} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              {getStartedText}
            </a>
            <a 
              href="#how-it-works" 
              className="text-blue-600 hover:text-blue-700 px-8 py-4 text-lg font-semibold transition-colors"
            >
              Se hur det fungerar →
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <span className="text-green-500">🔒</span>
              <span>Säker betalning</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">✓</span>
              <span>BankID-integration</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-500">⚡</span>
              <span>Fungerar 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
