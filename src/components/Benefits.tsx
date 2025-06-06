
import { Check, Clock, Shield, Smartphone, Mail, CreditCard } from 'lucide-react';

const Benefits = () => {
  const benefits = [
    {
      icon: <Check className="w-6 h-6 text-green-500" />,
      title: "Automatisk sökning efter lediga tider",
      description: "Vår robot söker kontinuerligt efter lediga provtider på alla trafikverkets testcentra"
    },
    {
      icon: <Shield className="w-6 h-6 text-blue-500" />,
      title: "BankID-integrerad inloggning",
      description: "Säker inloggning med BankID, precis som på Trafikverkets egen hemsida"
    },
    {
      icon: <Clock className="w-6 h-6 text-purple-500" />,
      title: "Fungerar dygnet runt",
      description: "Vi arbetar 24/7 för att hitta den första lediga tiden som passar dina kriterier"
    },
    {
      icon: <Mail className="w-6 h-6 text-orange-500" />,
      title: "Email-bekräftelse från Trafikverket",
      description: "Du får alltid bekräftelse direkt från Trafikverket när en tid är bokad"
    },
    {
      icon: <Smartphone className="w-6 h-6 text-green-600" />,
      title: "Fungerar på mobil och dator",
      description: "Använd tjänsten var du än är - responsiv design för alla enheter"
    },
    {
      icon: <CreditCard className="w-6 h-6 text-blue-600" />,
      title: "Betala senare-alternativ",
      description: "Flexibla betalningsalternativ - betala först när du är nöjd med tjänsten"
    }
  ];

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            Därför väljer tusentals svenskar oss
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Vi har hjälpt över 10,000 personer att få sina körkortsprov snabbare. 
            Här är varför vi är det självklara valet.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">
                    {benefit.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
