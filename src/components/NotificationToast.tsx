
import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const NotificationToast = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time notifications using the correct table name
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_log',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new;
          
          // Show toast based on notification type
          switch (notification.type) {
            case 'booking_success':
              toast({
                title: "🎉 Provtid bokad!",
                description: "Din provtid har bokats framgångsrikt. Kontrollera din email för detaljer.",
                duration: 10000,
              });
              break;
            case 'booking_failed':
              toast({
                title: "Bokningsfel",
                description: "Det uppstod ett problem vid bokningen. Försöker igen automatiskt.",
                variant: "destructive",
                duration: 8000,
              });
              break;
            case 'booking_started':
              toast({
                title: "Bokning startad",
                description: "Automatisk bokning har startats och söker efter tillgängliga tider.",
                duration: 5000,
              });
              break;
            case 'payment_confirmation':
              toast({
                title: "Betalning bekräftad",
                description: "Din prenumeration är nu aktiv!",
                duration: 6000,
              });
              break;
            default:
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  return null; // This component doesn't render anything
};

export default NotificationToast;
