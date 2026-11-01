/**
 * Google Sign-In — works on Android (native), iOS, and Web.
 *
 * Flow:
 *  1. Get OAuth URL from Supabase (skipBrowserRedirect: true)
 *  2. Open in system browser via WebBrowser.openAuthSessionAsync
 *  3. After Google auth, Supabase redirects back to our redirectTo URL
 *  4. WebBrowser intercepts it (on native) or the page loads (on web)
 *  5. Parse access_token + refresh_token from the URL fragment
 *  6. Call supabase.auth.setSession() → AuthProvider logs user in
 */
import { Pressable, Text, View, ActivityIndicator, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

function makeRedirectUri(): string {
  if (Platform.OS === 'web') {
    // Web: use the actual current origin so it works on both
    // localhost:8081 (dev) and soshobird.onrender.com (prod)
    return `${window.location.origin}/auth/callback`;
  }
  // Native: Expo's Linking.createURL uses the scheme from app.json ("soshobird")
  // and generates soshobird://auth/callback on a real device / production build.
  // In Expo Go it generates exp://... which also gets intercepted correctly.
  return Linking.createURL('auth/callback');
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
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('No OAuth URL returned from Supabase');

      // 2. Open Google sign-in in the system browser.
      //    On Android/iOS, WebBrowser watches for the redirectTo URL and
      //    closes the browser as soon as it appears — giving us result.url.
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        showInRecents: false,
      });

      if (result.type !== 'success') {
        // User cancelled or browser was dismissed without completing
        return;
      }

      // 3. Parse tokens from the redirect URL fragment
      const url = result.url;
      const fragmentOrQuery = url.includes('#')
        ? url.split('#')[1]
        : url.split('?')[1] ?? '';
      const params = new URLSearchParams(fragmentOrQuery);

      const accessToken  = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        // 4. Activate the session — AuthProvider's onAuthStateChange fires
        //    and navigates to the dashboard automatically
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      } else {
        // Tokens weren't in the URL — Supabase JS may have already handled
        // the session via its own URL listener (common on web)
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error('Sign-in completed but no session was created. Please try again.');
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
