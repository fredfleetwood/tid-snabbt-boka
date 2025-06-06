
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TestTube, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface BookingTestControlsProps {
  configId: string;
  disabled?: boolean;
}

const BookingTestControls = ({ configId, disabled }: BookingTestControlsProps) => {
  const { toast } = useToast();
  const [isStartingTest, setIsStartingTest] = useState(false);

  const startTestBooking = async () => {
    setIsStartingTest(true);

    try {
      const { data, error } = await supabase.functions.invoke('test-booking', {
        body: { config_id: configId }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Testbokning startad",
          description: "Simulering av bokningsprocessen har startats. Följ statusen nedan.",
        });
      } else {
        throw new Error(data.error || 'Failed to start test booking');
      }
    } catch (error) {
      console.error('Error starting test booking:', error);
      toast({
        title: "Kunde inte starta testbokning",
        description: error.message || "Ett oväntat fel inträffade",
        variant: "destructive"
      });
    } finally {
      setIsStartingTest(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-orange-800">
          <TestTube className="h-5 w-5" />
          <span>Testläge</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200 bg-orange-100">
          <TestTube className="h-4 w-4" />
          <AlertDescription className="text-orange-800">
            Testa bokningsbotten utan att göra riktiga bokningar. Detta simulerar hela processen 
            inklusive BankID-inloggning, sökning och bokning.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={startTestBooking}
          disabled={isStartingTest || disabled}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          <Play className="h-4 w-4 mr-2" />
          {isStartingTest ? 'Startar test...' : 'Starta testbokning'}
        </Button>

        <div className="text-sm text-orange-700">
          <p className="font-medium">Vad händer under testet:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Simulerar webbläsarstart</li>
            <li>Visar mock BankID QR-kod</li>
            <li>Simulerar sökning efter lediga tider</li>
            <li>Simulerar bokningsförsök</li>
            <li>Visar alla meddelanden i realtid</li>
          </ul>
          <p className="mt-2 font-medium text-orange-800">
            ⚠️ Ingen riktig bokning kommer att göras under testet
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingTestControls;
