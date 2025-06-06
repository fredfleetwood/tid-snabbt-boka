
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="text-2xl font-bold text-blue-600">
              Snabbtkörprov.se
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="/" className="text-gray-900 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors">
                Hem
              </a>
              <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors">
                Så fungerar det
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors">
                Priser
              </a>
              {user ? (
                <>
                  <a href="/dashboard" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors">
                    Min sida
                  </a>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSignOut}
                    className="text-sm font-medium"
                  >
                    Logga ut
                  </Button>
                </>
              ) : (
                <>
                  <a href="/auth" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium transition-colors">
                    Logga in
                  </a>
                  <a href="/auth" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Kom igång
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600 p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <a href="/" className="text-gray-900 block px-3 py-2 text-base font-medium">
                Hem
              </a>
              <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium">
                Så fungerar det
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium">
                Priser
              </a>
              {user ? (
                <>
                  <a href="/dashboard" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium">
                    Min sida
                  </a>
                  <button 
                    onClick={handleSignOut}
                    className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium w-full text-left"
                  >
                    Logga ut
                  </button>
                </>
              ) : (
                <>
                  <a href="/auth" className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium">
                    Logga in
                  </a>
                  <a href="/auth" className="bg-blue-600 text-white block px-3 py-2 rounded-md text-base font-medium mt-2">
                    Kom igång
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
