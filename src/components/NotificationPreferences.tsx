
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bell, Mail, MessageSquare } from 'lucide-react';

interface NotificationPreferences {
  email_notifications: boolean;
  browser_notifications: boolean;
  booking_updates: boolean;
  payment_notifications: boolean;
  marketing_emails: boolean;
}

const NotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    browser_notifications: false,
    booking_updates: true,
    payment_notifications: true,
    marketing_emails: false
  });

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences({
          email_notifications: data.email_notifications ?? true,
          browser_notifications: data.browser_notifications ?? false,
          booking_updates: data.booking_updates ?? true,
          payment_notifications: data.payment_notifications ?? true,
          marketing_emails: data.marketing_emails ?? false
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ladda notifikationsinställningar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Inställningar sparade",
        description: "Dina notifikationsinställningar har uppdaterats"
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Fel",
        description: "Kunde inte spara inställningar",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifikationsinställningar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-blue-600" />
              <div>
                <p className="font-medium">Email-notifikationer</p>
                <p className="text-sm text-muted-foreground">
                  Få viktiga uppdateringar via email
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-green-600" />
              <div>
                <p className="font-medium">Webbläsarnotifikationer</p>
                <p className="text-sm text-muted-foreground">
                  Få popup-notifikationer i webbläsaren
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.browser_notifications}
              onCheckedChange={(checked) => updatePreference('browser_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <div>
                <p className="font-medium">Bokningsuppdateringar</p>
                <p className="text-sm text-muted-foreground">
                  Notifikationer om bokningsstatus och resultat
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.booking_updates}
              onCheckedChange={(checked) => updatePreference('booking_updates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-orange-600" />
              <div>
                <p className="font-medium">Betalningsnotifikationer</p>
                <p className="text-sm text-muted-foreground">
                  Bekräftelser och påminnelser om betalningar
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.payment_notifications}
              onCheckedChange={(checked) => updatePreference('payment_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-600" />
              <div>
                <p className="font-medium">Marknadsföringsmail</p>
                <p className="text-sm text-muted-foreground">
                  Nyheter och erbjudanden (valfritt)
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.marketing_emails}
              onCheckedChange={(checked) => updatePreference('marketing_emails', checked)}
            />
          </div>
        </div>

        <Button 
          onClick={savePreferences}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sparar...
            </>
          ) : (
            'Spara inställningar'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferences;
