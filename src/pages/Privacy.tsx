
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Privacy = () => {
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
          <h1 className="text-3xl font-bold text-gray-900">Integritetspolicy</h1>
          <p className="text-gray-600 mt-2">Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">1. Inledning</h2>
            <p className="text-gray-700 leading-relaxed">
              Denna integritetspolicy beskriver hur Snabbtkörprov.se samlar in, använder och skyddar 
              dina personuppgifter när du använder vår tjänst för automatisk bokning av körkortsprov.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Personuppgiftsansvarig</h2>
            <p className="text-gray-700 leading-relaxed">
              Snabbtkörprov.se är personuppgiftsansvarig för behandlingen av dina personuppgifter. 
              Kontakta oss på support@snabbtkorprov.se för frågor om denna policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">3. Vilka uppgifter vi samlar in</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Vi samlar in följande typer av personuppgifter:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Kontaktuppgifter:</strong> Email-adress för kontoskapande och kommunikation</li>
              <li><strong>Identitetsuppgifter:</strong> Personnummer för bokningar hos Trafikverket</li>
              <li><strong>Bokningsinformation:</strong> Provtyp, föredragna platser och tider</li>
              <li><strong>Betalningsuppgifter:</strong> Hanteras säkert via Stripe (vi lagrar inte kortnummer)</li>
              <li><strong>Teknisk information:</strong> IP-adress, webbläsartyp för säkerhet och funktionalitet</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. Hur vi använder dina uppgifter</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Vi använder dina personuppgifter för att:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Tillhandahålla vår bokningsservice</li>
              <li>Kommunicera med Trafikverkets bokningssystem</li>
              <li>Skicka notifikationer om bokningsstatus</li>
              <li>Hantera betalningar och prenumerationer</li>
              <li>Ge kundsupport</li>
              <li>Förbättra vår tjänst genom analys av användningsmönster</li>
              <li>Efterleva lagkrav</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. Rättslig grund för behandling</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Vi behandlar dina personuppgifter baserat på:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Avtalsuppfyllelse:</strong> För att tillhandahålla tjänsten du har tecknat</li>
              <li><strong>Berättigat intresse:</strong> För att förbättra tjänsten och ge support</li>
              <li><strong>Samtycke:</strong> För marknadsföring och valfria notifikationer</li>
              <li><strong>Laglig förpliktelse:</strong> För bokföring och andra lagkrav</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. Delning av uppgifter</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Vi delar dina uppgifter med:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Trafikverket:</strong> Personnummer och bokningsinformation för att genomföra bokningar</li>
              <li><strong>Stripe:</strong> Betalningsuppgifter för att hantera prenumerationer</li>
              <li><strong>Supabase:</strong> Teknisk plattform för säker datalagring</li>
              <li><strong>Resend:</strong> Email-leveranstjänst för notifikationer</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Vi säljer aldrig dina personuppgifter till tredje part.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. Säkerhet</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi skyddar dina uppgifter genom kryptering, säkra servrar och begränsad åtkomst. 
              Personnummer lagras krypterat och maskeras i gränssnittet. All kommunikation sker 
              över säkra anslutningar (HTTPS).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Lagringstid</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi lagrar dina uppgifter så länge du har ett aktivt konto. Efter kontouppsägning 
              behåller vi vissa uppgifter i 3 år för bokföring och lagkrav, därefter raderas de säkert.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. Dina rättigheter</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Enligt GDPR har du rätt att:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Få information om vilka uppgifter vi har om dig</li>
              <li>Rätta felaktiga uppgifter</li>
              <li>Radera dina uppgifter (rätt att bli glömd)</li>
              <li>Begränsa behandlingen av dina uppgifter</li>
              <li>Få ut dina uppgifter i maskinläsbart format (dataportabilitet)</li>
              <li>Invända mot behandling baserad på berättigat intresse</li>
              <li>Återkalla samtycke när som helst</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. Cookies</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi använder endast nödvändiga cookies för autentisering och sessionhantering. 
              Inga cookies används för marknadsföring eller spårning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">11. Ändringar av policyn</h2>
            <p className="text-gray-700 leading-relaxed">
              Vi kan uppdatera denna policy. Väsentliga ändringar meddelas via email. 
              Den senaste versionen finns alltid tillgänglig på vår webbplats.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">12. Kontakt</h2>
            <p className="text-gray-700 leading-relaxed">
              För frågor om denna integritetspolicy eller dina personuppgifter, kontakta oss på:
              <br /><br />
              Email: support@snabbtkorprov.se
              <br />
              För klagomål kan du också kontakta Integritetsskyddsmyndigheten (IMY).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
