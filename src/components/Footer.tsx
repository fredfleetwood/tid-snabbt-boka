
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company info */}
          <div className="col-span-1">
            <h3 className="text-xl font-bold mb-4">Snabbtkörprov.se</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Vi hjälper svenskar att få sina körkortsprov snabbare genom automatisk bokning. 
              Grundat 2024 i Sverige.
            </p>
            <div className="mt-4">
              <span className="text-sm text-gray-400">🇸🇪 Svenskt företag</span>
            </div>
          </div>

          {/* Quick links */}
          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4">Snabblänkar</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Hem</a></li>
              <li><a href="#how-it-works" className="text-gray-300 hover:text-white transition-colors">Så fungerar det</a></li>
              <li><a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Priser</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Logga in</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4">Juridiskt</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Användarvillkor</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Integritetspolicy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Cookiepolicy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">GDPR</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-1">
            <h4 className="text-lg font-semibold mb-4">Kontakt</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <p>📧 support@snabbtkorprov.se</p>
              <p>📞 08-123 456 78</p>
              <p>🕒 Vardagar 09:00-17:00</p>
              <div className="mt-4">
                <p className="text-xs text-gray-400">
                  Snabbtkörprov AB<br />
                  Org.nr: 559123-4567<br />
                  Stockholm, Sverige
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-400">
            © 2024 Snabbtkörprov.se. Alla rättigheter förbehållna. 
            <span className="ml-4">Inte affilierad med Trafikverket.</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
