
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Inloggning misslyckades",
        description: error.message === 'Invalid login credentials' 
          ? "Fel e-post eller lösenord" 
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Välkommen tillbaka!",
        description: "Du är nu inloggad.",
      });
      navigate('/dashboard');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        title: "Registrering misslyckades",
        description: error.message === 'User already registered' 
          ? "En användare med denna e-post finns redan" 
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Registrering lyckades!",
        description: "Kontrollera din e-post för bekräftelse.",
      });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Snabbtkörprov.se</h1>
          <p className="text-gray-600">Automatisk bokning av körkortsprov</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Logga in</TabsTrigger>
            <TabsTrigger value="signup">Registrera</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Logga in</CardTitle>
                <CardDescription>
                  Logga in på ditt konto för att komma åt din instrumentpanel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-post</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="din@email.se"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Lösenord</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Ditt lösenord"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Loggar in...' : 'Logga in'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Skapa konto</CardTitle>
                <CardDescription>
                  Registrera dig för att börja boka körkortsprov automatiskt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-post</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="din@email.se"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Lösenord</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Välj ett säkert lösenord"
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Registrerar...' : 'Skapa konto'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Tillbaka till startsidan
          </a>
        </div>
      </div>
    </div>
  );
};

export default Auth;
