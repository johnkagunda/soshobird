import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const ORANGE = '#f97316';

/** Build the correct redirect URL for the current platform/environment */
function getResetRedirectUrl(): string {
  if (Platform.OS === 'web') {
    // On web, redirect back to the reset-password page on the same origin.
    // Works for localhost:8081 in dev and any production domain.
    return `${window.location.origin}/auth/reset-password`;
  }
  // On native, use the deep-link scheme
  return 'soshobird://auth/reset-password';
}

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [emailFocused, setEmailFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async () => {
        setError('');
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }

        try {
            setIsLoading(true);

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(
                email.trim(),
                { redirectTo: getResetRedirectUrl() }
            );

            if (resetError) {
                setError(resetError.message);
            } else {
                setSent(true);
            }
        } catch (e: any) {
            setError(e?.message ?? 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#000' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Back button */}
                <Pressable
                    onPress={() => router.back()}
                    hitSlop={12}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 }}
                >
                    <Ionicons name="chevron-back" size={22} color={ORANGE} />
                    <Text style={{ color: ORANGE, fontSize: 15, fontWeight: '600' }}>Back to login</Text>
                </Pressable>

                {/* Heading */}
                <View style={{ marginBottom: 32 }}>
                    <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 }}>
                        Forgot password?
                    </Text>
                    <Text style={{ fontSize: 15, color: '#9ca3af', lineHeight: 22 }}>
                        Enter the email address linked to your account and we'll send you a reset link.
                    </Text>
                </View>

                {/* Success state */}
                {sent ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 40 }}>
                        <View style={{
                            width: 72, height: 72, borderRadius: 36,
                            backgroundColor: '#f9731620',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Ionicons name="mail-outline" size={36} color={ORANGE} />
                        </View>
                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' }}>
                            Check your inbox
                        </Text>
                        <Text style={{ color: '#9ca3af', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
                            We've sent a password reset link to{'\n'}
                            <Text style={{ color: ORANGE, fontWeight: '600' }}>{email}</Text>
                        </Text>
                        <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
                            Didn't get it? Check your spam folder or try again.
                        </Text>

                        <TouchableOpacity
                            onPress={() => { setSent(false); setEmail(''); }}
                            style={{
                                marginTop: 16,
                                borderWidth: 1.5,
                                borderColor: ORANGE,
                                borderRadius: 12,
                                paddingVertical: 13,
                                paddingHorizontal: 32,
                            }}
                        >
                            <Text style={{ color: ORANGE, fontWeight: '700', fontSize: 15 }}>Try a different email</Text>
                        </TouchableOpacity>

                        <Pressable onPress={() => router.replace('/(auth)/login')} style={{ marginTop: 12 }}>
                            <Text style={{ color: '#6b7280', fontSize: 14 }}>Back to login</Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        {/* Error */}
                        {!!error && (
                            <View style={{
                                backgroundColor: '#7f1d1d30', borderWidth: 1,
                                borderColor: '#ef4444', borderRadius: 10, padding: 12, marginBottom: 20,
                            }}>
                                <Text style={{ color: '#ef4444', fontSize: 14 }}>{error}</Text>
                            </View>
                        )}

                        {/* Email input */}
                        <View style={{ marginBottom: 28 }}>
                            <Text style={{ color: '#d1d5db', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
                                Email address
                            </Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => setEmailFocused(false)}
                                placeholder="you@example.com"
                                placeholderTextColor="#6b7280"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoFocus
                                style={{
                                    backgroundColor: '#111',
                                    borderWidth: 1.5,
                                    borderColor: emailFocused ? ORANGE : '#2a2a2a',
                                    borderRadius: 12,
                                    paddingHorizontal: 16,
                                    paddingVertical: 13,
                                    color: '#fff',
                                    fontSize: 15,
                                }}
                            />
                        </View>

                        {/* Send reset link button */}
                        <TouchableOpacity
                            onPress={handleReset}
                            disabled={isLoading}
                            activeOpacity={0.85}
                            style={{
                                backgroundColor: ORANGE,
                                borderRadius: 12,
                                paddingVertical: 14,
                                alignItems: 'center',
                                opacity: isLoading ? 0.7 : 1,
                            }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                                {isLoading ? 'Sending...' : 'Send reset link'}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
