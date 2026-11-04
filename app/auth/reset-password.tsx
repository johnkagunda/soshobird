/**
 * Reset Password screen
 *
 * By the time the user reaches this screen, supabase.auth.setSession()
 * has already been called in auth/callback.tsx with the recovery tokens.
 * So we just need to call supabase.auth.updateUser({ password }).
 */
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const ORANGE = '#f97316';

export default function ResetPasswordScreen() {
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused]   = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(false);

  // Verify we have a valid recovery session before showing the form
  useEffect(() => {
    const verify = async () => {
      // On web: callback.tsx already called setSession — just confirm it exists
      // On native: same — callback handled it before routing here
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSessionReady(true);
      } else {
        setError('Reset link is invalid or has expired. Please request a new one.');
      }
    };
    verify();
  }, []);

  const handleUpdate = async () => {
    setError('');
    if (!password || !confirm) {
      setError('Please fill in both fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        await supabase.auth.signOut();
        setTimeout(() => router.replace('/(auth)/login'), 2500);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!sessionReady && !error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ActivityIndicator color={ORANGE} size="large" />
        <Text style={{ color: '#9ca3af', fontSize: 15 }}>Verifying reset link...</Text>
      </View>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#14532d30', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark-circle" size={44} color="#22c55e" />
        </View>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>Password updated!</Text>
        <Text style={{ color: '#9ca3af', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
          Your password has been changed.{'\n'}Redirecting to login...
        </Text>
      </View>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#000', ...(Platform.OS === 'web' ? { minHeight: '100vh' } as any : {}) }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            hitSlop={12}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 }}
          >
            <Ionicons name="chevron-back" size={22} color={ORANGE} />
            <Text style={{ color: ORANGE, fontSize: 15, fontWeight: '600' }}>Back to login</Text>
          </Pressable>

          {/* Heading */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 }}>
              Set new password
            </Text>
            <Text style={{ fontSize: 15, color: '#9ca3af', lineHeight: 22 }}>
              Choose a strong password for your account.
            </Text>
          </View>

          {/* Error */}
          {!!error && (
            <View style={{ backgroundColor: '#7f1d1d30', borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 12, marginBottom: 20 }}>
              <Text style={{ color: '#ef4444', fontSize: 14 }}>{error}</Text>
              {!sessionReady && (
                <Pressable onPress={() => router.replace('/(auth)/forgot-password')} style={{ marginTop: 8 }}>
                  <Text style={{ color: ORANGE, fontSize: 13, fontWeight: '600' }}>Request a new link</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* New password */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: '#d1d5db', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>New password</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#111', borderWidth: 1.5,
              borderColor: passwordFocused ? ORANGE : '#2a2a2a',
              borderRadius: 12, paddingHorizontal: 16,
            }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="At least 6 characters"
                placeholderTextColor="#6b7280"
                secureTextEntry={!showPassword}
                style={{ flex: 1, paddingVertical: 13, color: '#fff', fontSize: 15 }}
              />
              <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
              </Pressable>
            </View>
          </View>

          {/* Confirm password */}
          <View style={{ marginBottom: 36 }}>
            <Text style={{ color: '#d1d5db', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Confirm password</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#111', borderWidth: 1.5,
              borderColor: confirmFocused ? ORANGE : '#2a2a2a',
              borderRadius: 12, paddingHorizontal: 16,
            }}>
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                placeholder="Repeat your password"
                placeholderTextColor="#6b7280"
                secureTextEntry={!showConfirm}
                style={{ flex: 1, paddingVertical: 13, color: '#fff', fontSize: 15 }}
              />
              <Pressable onPress={() => setShowConfirm(v => !v)} hitSlop={8}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#6b7280" />
              </Pressable>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleUpdate}
            disabled={isLoading || !sessionReady}
            activeOpacity={0.85}
            style={{
              backgroundColor: ORANGE,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              opacity: isLoading || !sessionReady ? 0.7 : 1,
            }}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Update password</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
