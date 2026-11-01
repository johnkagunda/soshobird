/**
 * Google Sign-In using only expo-web-browser + expo-linking.
 * No expo-auth-session needed — Supabase generates the OAuth URL,
 * we open it in the system browser, then parse tokens from the redirect.
 */
import { Pressable, Text, View, ActivityIndicator, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Warm up the browser on Android for a faster open
WebBrowser.maybeCompleteAuthSession();

/** Build the redirect URI Supabase will send the user back to */
function makeRedirectUri(): string {
  if (Platform.OS === 'web') {
    // On web, redirect to the current origin + /auth/callback
    return `${window.location.origin}/auth/callback`;
  }
  // On native, use the deep-link scheme defined in app.json
  return 'soshobird://auth/callback';
}

export default function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const redirectTo = makeRedirectUri();

      // 1. Ask Supabase for the Google OAuth URL
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,       // we handle the browser ourselves
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('No OAuth URL returned from Supabase');

      // 2. Open Google sign-in page in the system browser
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success') return; // user cancelled or dismissed

      // 3. Extract tokens from the redirect URL
      //    Supabase puts them in the fragment: #access_token=...&refresh_token=...
      const url = result.url;
      const fragment = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
      const params = new URLSearchParams(fragment);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        // 4. Set the session — AuthProvider's onAuthStateChange picks it up
        //    and redirects to the dashboard automatically
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      }
      // If tokens aren't in the URL, Supabase's client may have already
      // handled the session exchange via the deep-link listener.
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
          /* Coloured "G" — no image asset needed */
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
