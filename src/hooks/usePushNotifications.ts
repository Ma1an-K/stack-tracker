import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FUNCTIONS_URL } from '@/lib/functionsUrl';
import { useAuthContext } from '@/contexts/AuthContext';

const VAPID_PUBLIC_KEY = 'BP9Z5RasNjMn4BQ_bUyAHKoIAH1t7Arh_oAuIZXjuiUULpOUbDBgRB57r998FrM1v9F9hBTY0h9lstgm4Oosu1Q';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user, homegame } = useAuthContext();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported && user && homegame) {
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, [user, homegame]);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        setIsSubscribed(false);
        setLoading(false);
        return;
      }
      
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Verify it exists in our DB
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('endpoint', subscription.endpoint)
          .eq('homegame_id', homegame!.id)
          .maybeSingle();
        
        setIsSubscribed(!!data);
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Error checking push subscription:', err);
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = useCallback(async () => {
    if (!user || !homegame || !isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return false;

      // Register service worker
      let registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      // Unsubscribe any existing subscription (e.g. from old VAPID key)
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      // Subscribe to push with new key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const key = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      
      if (!key || !auth) throw new Error('Failed to get subscription keys');

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
      const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)));

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          homegame_id: homegame.id,
          endpoint: subscription.endpoint,
          p256dh: p256dh,
          auth: authKey,
        }, { onConflict: 'user_id,endpoint' });

      if (error) throw error;

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Error subscribing to push:', err);
      return false;
    }
  }, [user, homegame, isSupported]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Remove from DB
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint);
          
          await subscription.unsubscribe();
        }
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Error unsubscribing from push:', err);
      return false;
    }
  }, []);

  const sendNotification = useCallback(async (homegameId: string, sessionDate: string, homegameName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await fetch(`${FUNCTIONS_URL}/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          homegame_id: homegameId,
          session_date: sessionDate,
          homegame_name: homegameName,
        }),
      });
    } catch (err) {
      console.error('Error sending push notification:', err);
    }
  }, []);

  return {
    isSubscribed,
    isSupported,
    loading,
    subscribe,
    unsubscribe,
    sendNotification,
  };
}