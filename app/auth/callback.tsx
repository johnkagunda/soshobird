/**
 * OAuth / Password-reset callback screen
 *
 * Handles two cases from the same URL pattern:
 *
 *  1. Google OAuth login  → type undefined / "signup" → go to dashboard
 *  2. Password reset       → type "recovery"           → go to reset-password
 *
 * Web:    tokens arrive in the URL hash (#access_token=...&type=recovery)
 * Native: deep link soshobird://auth/callback#...
 */
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

function parseFragment(url: string) {
  const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
  return new URLSearchParams(fragment);
}

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handle = async (url: string) => {
      const params = parseFragment(url);
      const accessToken  = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type         = params.get('type'); // "recovery" | "signup" | undefined

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          router.replace('/(auth)/login');
          return;
        }

        if (type === 'recovery') {
          // Password reset flow — go to the reset screen
          router.replace('/auth/reset-password');
        } else {
          // Google login or email confirmation — go to the dashboard
          router.replace('/(protected)/(tabs)/(home)');
        }
      } else {
        router.replace('/(auth)/login');
      }
    };

    if (Platform.OS === 'web') {
      // On web, tokens are in window.location.hash
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (hash) {
        handle(`${window.location.origin}${window.location.pathname}${hash}`);
      } else {
        // No tokens — already handled by Supabase JS, go to dashboard
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            router.replace('/(protected)/(tabs)/(home)');
          } else {
            router.replace('/(auth)/login');
          }
        });
      }
    } else {
      // Native: check initial URL (app opened via deep link)
      Linking.getInitialURL().then((url) => {
        if (url) {
          handle(url);
        } else {
          // App was already open — check if session exists
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
              router.replace('/(protected)/(tabs)/(home)');
            } else {
              router.replace('/(auth)/login');
            }
          });
        }
      });

      const sub = Linking.addEventListener('url', ({ url }) => handle(url));
      return () => sub.remove();
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator color="#f97316" size="large" />
      <Text style={{ color: '#6b7280', fontSize: 15 }}>Please wait...</Text>
    </View>
  );
}
