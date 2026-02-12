import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// VAPID public key from environment — must match the server-side VAPID_PUBLIC_KEY secret
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

/** Checks whether the browser supports service workers, PushManager, and Notification API. */
function checkPushSupport(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export const usePushNotifications = () => {
  const { currentUser } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check support once on mount — no permission requests here
  useEffect(() => {
    const supported = checkPushSupport();
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }

    setIsLoading(false);
  }, []);

  // Check existing subscription (read-only, no permission prompt)
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported || !currentUser) {
        setIsSubscribed(false);
        return;
      }

      // If permission was never granted, skip the SW lookup entirely
      if (Notification.permission !== 'granted') {
        setIsSubscribed(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        if (!registration.pushManager) {
          setIsSubscribed(false);
          return;
        }
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking push subscription:', error);
        setIsSubscribed(false);
      }
    };

    checkSubscription();
  }, [isSupported, currentUser]);

  /**
   * Subscribe to push notifications.
   * MUST be called from a user-initiated event (button click / toggle).
   */
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser.',
        variant: 'destructive',
      });
      return false;
    }

    if (!currentUser) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to enable push notifications.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Request permission — only runs from a user gesture
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'denied') {
        toast({
          title: 'Notifications Blocked',
          description: 'Notifications are blocked. You can re-enable them in your browser settings.',
          variant: 'destructive',
        });
        return false;
      }

      if (permissionResult !== 'granted') {
        return false;
      }

      // Use the PWA plugin's registered service worker (includes push handler via importScripts)
      const registration = await navigator.serviceWorker.ready;

      if (!registration.pushManager) {
        toast({
          title: 'Not Supported',
          description: 'Push notifications are not available on this device.',
          variant: 'destructive',
        });
        return false;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save subscription to database
      const subscriptionJson = subscription.toJSON();
      if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
        throw new Error('Incomplete push subscription data');
      }

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: currentUser.id,
          endpoint: subscriptionJson.endpoint,
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
        },
        { onConflict: 'endpoint' },
      );

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: 'Notifications Enabled',
        description: "You'll receive reminders for your beauty routine.",
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable push notifications. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [isSupported, currentUser]);

  const unsubscribe = useCallback(async () => {
    if (!currentUser) return false;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.pushManager) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint)
            .eq('user_id', currentUser.id);

          await subscription.unsubscribe();
        }
      }

      setIsSubscribed(false);
      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive push notifications.',
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      return false;
    }
  }, [currentUser]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
};
