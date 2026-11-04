import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuth } from './AuthProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TablesUpdate } from '@/types/database.types';
import { updateProfile } from '@/services/profile';
import { supabase } from '@/lib/supabase';
import { useNotificationBanner } from '@/components/NotificationBanner';

// Native: set the foreground notification handler
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Web browser Notification API helpers ─────────────────────────────────────

/** Request browser notification permission (web only). Returns true if granted. */
async function requestWebNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Show a native browser notification (web only). */
function showWebSystemNotification(title: string, body: string, icon?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: icon ?? '/favicon.ico',  // uses app favicon by default
    badge: '/favicon.ico',
    tag: 'soshobird',              // replaces previous notification of same tag
    silent: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export default function NotificationsProvider({ children }: PropsWithChildren) {
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showBanner } = useNotificationBanner();

  const { mutate: updateMutation } = useMutation({
    mutationFn: (data: TablesUpdate<'profiles'>) =>
      updateProfile(user!.id, data),
  });

  // Save push token to profile (native)
  useEffect(() => {
    if (expoPushToken && user) {
      updateMutation({ push_token: expoPushToken });
    }
  }, [expoPushToken, user]);

  // ── Native: register for push notifications ──────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;

    registerForPushNotificationsAsync().then(
      (token) => token && setExpoPushToken(token)
    );

    if (Platform.OS === 'android') {
      Notifications.getNotificationChannelsAsync();
    }

    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {});

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification response:', response);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // ── Web: request browser notification permission once user is logged in ──
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!user) return;
    requestWebNotificationPermission().then((granted) => {
      console.log('[Web Notifications] permission:', granted ? 'granted' : 'denied');
    });
  }, [user?.id]);

  // ── Realtime subscription — fires on both native and web ─────────────────
  useEffect(() => {
    if (!user) return;

    const channelName = `notifications:${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const n = payload.new as {
            actor_id: string;
            type: 'follow' | 'post';
            post_id: string | null;
          };

          // Fetch actor name
          const { data: actor } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', n.actor_id)
            .maybeSingle();

          const actorName = actor?.full_name || actor?.username || 'Someone';

          if (n.type === 'follow') {
            const title = 'New follower';
            const body = `${actorName} started following you`;

            // In-app banner (both platforms)
            showBanner(body, undefined, 'follow');

            // System notification
            if (Platform.OS === 'web') {
              showWebSystemNotification(title, body);
            } else {
              Notifications.scheduleNotificationAsync({
                content: { title, body, sound: 'default', data: { type: 'follow' } },
                trigger: null,
              });
            }

          } else if (n.type === 'post') {
            let postContent = '';
            if (n.post_id) {
              const { data: post } = await supabase
                .from('posts')
                .select('content')
                .eq('id', n.post_id)
                .maybeSingle();
              postContent = post?.content?.slice(0, 100) ?? '';
            }

            const title = `${actorName} posted`;
            const body = postContent || 'Check out the new post';

            // In-app banner (both platforms)
            showBanner(title, postContent || undefined, 'post');

            // System notification
            if (Platform.OS === 'web') {
              showWebSystemNotification(title, body);
            } else {
              Notifications.scheduleNotificationAsync({
                content: { title, body, sound: 'default', data: { type: 'post', post_id: n.post_id } },
                trigger: null,
              });
            }
          }

          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn('[Notifications] Realtime subscribe error:', err);
        else console.log('[Notifications] Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return <>{children}</>;
}

export async function schedulePushNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "You've got mail! 📬",
      body: 'Here is the notification body',
      data: { data: 'goes here' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
    },
  });
}

async function getPermissionsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return existingStatus;
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('myNotificationChannel', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const status = await getPermissionsAsync();
  if (status !== 'granted') {
    console.log('Push notification permission not granted');
    return;
  }

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return;
  }

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) throw new Error('EAS project ID not found in app.json');

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Push token:', token);
    return token;
  } catch (e) {
    console.log('Push token error:', e);
  }
}
