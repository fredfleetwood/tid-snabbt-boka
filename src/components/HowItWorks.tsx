
import { UserPlus, Settings, Shield, Calendar } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      number: "1",
      icon: <UserPlus className="w-8 h-8 text-blue-600" />,
      title: "Registrera dig och betala",
      description: "Skapa ditt konto och betala en engångsavgift på 300kr för 30 dagars service"
    },
    {
      number: "2", 
      icon: <Settings className="w-8 h-8 text-blue-600" />,
      title: "Konfigurera dina preferenser",
      description: "Välj datum, orter, provtyp och andra preferenser för din automatiska bokning"
    },
    {
      number: "3",
      icon: <Shield className="w-8 h-8 text-blue-600" />,
      title: "Logga in med BankID en gång",
      description: "Säker engångsinloggning med BankID för att ge oss tillgång till Trafikverkets system"
    },
    {
      number: "4",
      icon: <Calendar className="w-8 h-8 text-blue-600" />,
      title: "Vi bokar automatiskt första lediga tid",
      description: "Vår robot arbetar 24/7 och bokar automatiskt första lediga tiden som matchar dina kriterier"
    }
  ];

  return (
    <section id="how-it-works" className="py-16 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Så fungerar det
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Kom igång på bara 5 minuter. Enkel setup, sedan sköter vi resten automatiskt.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {step.icon}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {step.number}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a 
            href="#pricing" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
          >
            Starta din automatiska bokning nu
          </a>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
