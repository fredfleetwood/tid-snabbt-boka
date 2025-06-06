
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, MessageCircle, HelpCircle, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Support = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      const { error } = await supabase.functions.invoke('send-support-message', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Meddelande skickat!",
        description: "Vi kommer att kontakta dig inom 24 timmar."
      });

      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error('Error sending support message:', error);
      toast({
        title: "Fel",
        description: "Kunde inte skicka meddelandet. Försök igen senare.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Support & Hjälp</h1>
          <p className="text-gray-600 mt-2">Vi hjälper dig gärna med frågor om Snabbtkörprov.se</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Kontakta oss
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Namn</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                    placeholder="Ditt namn"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    required
                    placeholder="din@email.se"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ämne</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => updateField('subject', e.target.value)}
                    required
                    placeholder="Vad gäller ditt meddelande?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Meddelande</label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => updateField('message', e.target.value)}
                    required
                    placeholder="Beskriv ditt problem eller din fråga..."
                    rows={5}
                  />
                </div>

                <Button type="submit" disabled={sending} className="w-full">
                  {sending ? (
                    <>
                      <Send className="h-4 w-4 mr-2 animate-pulse" />
                      Skickar...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Skicka meddelande
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* FAQ and Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Vanliga frågor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold">Hur fungerar automatisk bokning?</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Vårt system övervakar Trafikverkets bokningssystem kontinuerligt och bokar automatiskt första tillgängliga tid som matchar dina kriterier.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">Kan jag avbryta prenumerationen?</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Ja, du kan avbryta när som helst. Prenumerationen är aktiv till nästa förnyelsedatum.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">Vad händer om bokningen misslyckas?</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Systemet försöker automatiskt igen. Du får notifikationer om eventuella problem.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">Är mina uppgifter säkra?</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Ja, alla uppgifter krypteras och lagras säkert. Personnummer maskeras i gränssnittet.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Direktkontakt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">Email</p>
                    <a href="mailto:support@snabbtkorprov.se" className="text-blue-600 hover:underline">
                      support@snabbtkorprov.se
                    </a>
                  </div>
                  
                  <div>
                    <p className="font-medium">Svarstid</p>
                    <p className="text-sm text-gray-600">Inom 24 timmar på vardagar</p>
                  </div>

                  <div>
                    <p className="font-medium">Akuta problem</p>
                    <p className="text-sm text-gray-600">
                      För akuta tekniska problem, skriv "AKUT" i ämnesraden
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
