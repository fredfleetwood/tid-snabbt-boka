
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Snabbtkörprov.se</h3>
            <p className="text-gray-400 text-sm">
              Automatisk bokning av körkortsprov. Få din provtid snabbare med vår intelligenta tjänst.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Tjänster</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Automatisk bokning</li>
              <li>Realtidsövervakning</li>
              <li>Email-notifikationer</li>
              <li>Månadsabonnemang</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/support" className="text-gray-400 hover:text-white transition-colors">
                  Kontakta oss
                </Link>
              </li>
              <li>
                <a href="mailto:support@snabbtkorprov.se" className="text-gray-400 hover:text-white transition-colors">
                  support@snabbtkorprov.se
                </a>
              </li>
              <li className="text-gray-400">Svarstid: 24h</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Juridiskt</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Användarvillkor
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Integritetspolicy
                </Link>
              </li>
              <li className="text-gray-400">Cookies-policy</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} Snabbtkörprov.se. Alla rättigheter förbehållna.</p>
          <p className="mt-2">Inte affilierad med Trafikverket. Oberoende bokningsservice.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
