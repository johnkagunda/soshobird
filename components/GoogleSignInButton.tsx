/**
 * Google Sign-In — platform-specific flow:
 *
 * WEB:
 *   signInWithOAuth without skipBrowserRedirect → Supabase redirects the
 *   current page to Google, Google redirects back to /auth/callback,
 *   Supabase JS picks up the session from the URL fragment automatically.
 *   No extra browser window ever opens.
 *
 * ANDROID / iOS:
 *   skipBrowserRedirect: true → we get the OAuth URL, open it in a
 *   controlled in-app browser via WebBrowser.openAuthSessionAsync,
 *   the browser closes automatically when it sees our redirect URI,
 *   and we parse the tokens from the result URL.
 */
import { Pressable, Text, View, ActivityIndicator, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      if (Platform.OS === 'web') {
        // ── Web flow ────────────────────────────────────────────────────────
        // Let Supabase redirect the current browser tab — no popup, no new window.
        // After Google auth, Supabase redirects back to window.location.origin
        // and the Supabase JS client auto-detects the session from the URL fragment.
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: { prompt: 'select_account' },
          },
        });
        if (oauthError) throw oauthError;
        // Page will navigate away — nothing more to do here.
        return;
      }

      // ── Native flow (Android / iOS) ─────────────────────────────────────
      // Build the deep-link redirect URI for this build environment.
      const redirectTo = Linking.createURL('auth/callback');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('No OAuth URL returned from Supabase');

      // Open Google sign-in in a controlled in-app browser.
      // The browser closes automatically as soon as it sees the redirectTo URI.
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        showInRecents: false,
      });

      if (result.type !== 'success') return; // user cancelled

      // Parse tokens from the redirect URL fragment
      const url = result.url;
      const fragment = url.includes('#')
        ? url.split('#')[1]
        : url.split('?')[1] ?? '';
      const params = new URLSearchParams(fragment);

      const accessToken  = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        // Activate the session — AuthProvider's onAuthStateChange fires
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      } else {
        // Fallback: check if Supabase already handled it
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error('Sign-in completed but no session found. Please try again.');
        }
      }
    } catch (e: any) {
      setError(e?.message ?? 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ width: '100%' }}>
      <Pressable
        onPress={handleGoogleSignIn}
        disabled={loading}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: pressed ? '#e5e5e5' : '#ffffff',
          borderRadius: 12,
          paddingVertical: 13,
          paddingHorizontal: 20,
          opacity: loading ? 0.7 : 1,
        })}
      >
        {loading ? (
          <ActivityIndicator color="#4285F4" size="small" />
        ) : (
          <Text style={{ fontSize: 19, fontWeight: '800', color: '#4285F4', lineHeight: 22 }}>G</Text>
        )}
        <Text style={{ color: '#111111', fontWeight: '600', fontSize: 15 }}>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </Text>
      </Pressable>

      {!!error && (
        <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
          {error}
        </Text>
      )}
    </View>
  );
}
