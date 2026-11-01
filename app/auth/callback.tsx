/**
 * OAuth callback screen — handles the redirect from Supabase/Google
 * back into the app after the user signs in via the browser.
 *
 * Route: soshobird://auth/callback
 *
 * On native: expo-linking deep-links here; we parse the tokens from the URL
 * and call supabase.auth.setSession so the AuthProvider picks them up.
 *
 * On web: Supabase JS automatically exchanges the URL fragment for a session,
 * so this screen just shows a brief loading state before the AuthProvider
 * redirects the user to the dashboard.
 */
import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      // Tokens land in the URL fragment after #
      const fragment = url.split('#')[1] ?? '';
      const params = new URLSearchParams(fragment);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // AuthProvider's onAuthStateChange will handle the redirect,
        // but navigate explicitly for speed.
        router.replace('/(protected)/(tabs)/(home)');
      } else {
        // No tokens — go back to login
        router.replace('/(auth)/login');
      }
    };

    // Check if we were opened with a URL (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Listen for foreground deep links
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <ActivityIndicator color="#f97316" size="large" />
      <Text style={{ color: '#6b7280', fontSize: 15 }}>Completing sign-in...</Text>
    </View>
  );
}
