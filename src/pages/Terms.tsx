
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka till startsidan
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Användarvillkor</h1>
          <p className="text-gray-600 mt-2">Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Allmänna villkor</h2>
            <p className="text-gray-700 leading-relaxed">
              Välkommen till Snabbtkörprov.se. Genom att använda vår tjänst accepterar du dessa användarvillkor. 
              Tjänsten tillhandahåller automatisk bokning av körkortsprov genom Trafikverkets bokningssystem.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Tjänstebeskrivning</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Snabbtkörprov.se erbjuder en automatiserad tjänst för att boka provtider för körkortsprov. Tjänsten:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Övervakar Trafikverkets bokningssystem efter tillgängliga tider</li>
              <li>Bokar automatiskt en tid när den blir tillgänglig enligt dina kriterier</li>
              <li>Skickar notifikationer om bokningsstatus</li>
              <li>Kräver en aktiv prenumeration för att använda</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Användaransvar</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Som användare ansvarar du för att:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Tillhandahålla korrekta och aktuella uppgifter</li>
              <li>Ha behörighet att boka prov för det angivna personnumret</li>
              <li>Kontrollera bokade tider och medela ändringar eller avbokningar till Trafikverket</li>
              <li>Betala för prenumerationen enligt prislistan</li>
              <li>Använda tjänsten på ett ansvarsfullt sätt</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Begränsningar och garantier</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Vi kan inte garantera:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Att en provtid kommer att bli tillgänglig inom en viss tidsram</li>
              <li>Att bokningar alltid kommer att lyckas på grund av tekniska begränsningar</li>
              <li>Kontinuerlig tjänstetillgänglighet utan avbrott</li>
              <li>Att Trafikverkets system alltid kommer att vara tillgängligt</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Prenumeration och betalning</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Prenumerationen kostar 300 SEK per månad och förnyas automatiskt. Du kan säga upp prenumerationen 
              när som helst. Vid uppsägning förlorar du tillgång till tjänsten vid nästa förnyelsedatum.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Personuppgifter</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi behandlar dina personuppgifter enligt vår integritetspolicy. Personnummer används endast 
              för att identifiera dig i Trafikverkets system och lagras säkert och krypterat.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Ansvarsbegränsning</h2>
            <p className="text-gray-700 leading-relaxed">
              Snabbtkörprov.se ansvarar inte för direkta eller indirekta skador som uppstår till följd av 
              användning av tjänsten, inklusive men inte begränsat till missade provtider, tekniska fel 
              eller problem med Trafikverkets system.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Ändringar av villkoren</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi förbehåller oss rätten att ändra dessa villkor. Användare kommer att meddelas om 
              väsentliga ändringar via email. Fortsatt användning av tjänsten innebär acceptans av 
              de ändrade villkoren.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Uppsägning</h2>
            <p className="text-gray-700 leading-relaxed">
              Du kan säga upp ditt konto när som helst. Vi förbehåller oss rätten att säga upp konton 
              som bryter mot dessa villkor eller använder tjänsten på ett otillbörligt sätt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Kontaktinformation</h2>
            <p className="text-gray-700 leading-relaxed">
              Vid frågor om dessa villkor, kontakta oss på support@snabbtkorprov.se
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
