import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    Image,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import GoogleSignInButton from '@/components/GoogleSignInButton';

const ORANGE = '#f97316';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const handleLogin = async () => {
        setError('');
        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }
        try {
            setIsLoading(true);
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) setError(authError.message);
        } catch (e: any) {
            setError(e?.message ?? 'An unexpected error occurred.');
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
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Logo */}
                <View style={{ alignItems: 'center', marginBottom: 36 }}>
                    <Image
                        source={require('@/assets/images/icon.png')}
                        style={{ width: 100, height: 100 }}
                        resizeMode="contain"
                    />
                    <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 8, letterSpacing: -0.5 }}>
                        SoshoBird
                    </Text>
                </View>

                {/* Heading */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 }}>Log in</Text>
                    <Text style={{ fontSize: 15, color: '#9ca3af' }}>Enter your details to continue.</Text>
                </View>

                {/* Error */}
                {!!error && (
                    <View style={{ backgroundColor: '#7f1d1d30', borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                        <Text style={{ color: '#ef4444', fontSize: 14 }}>{error}</Text>
                    </View>
                )}

                {/* Email */}
                <View style={{ marginBottom: 14 }}>
                    <Text style={{ color: '#d1d5db', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Email address</Text>
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

                {/* Password */}
                <View style={{ marginBottom: 8 }}>
                    <Text style={{ color: '#d1d5db', fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Password</Text>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#111',
                        borderWidth: 1.5,
                        borderColor: passwordFocused ? ORANGE : '#2a2a2a',
                        borderRadius: 12,
                        paddingHorizontal: 16,
                    }}>
                        <TextInput
                            value={password}
                            onChangeText={setPassword}
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={() => setPasswordFocused(false)}
                            placeholder="Your password"
                            placeholderTextColor="#6b7280"
                            secureTextEntry={!showPassword}
                            style={{ flex: 1, paddingVertical: 13, color: '#fff', fontSize: 15 }}
                        />
                        <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#6b7280"
                            />
                        </Pressable>
                    </View>
                </View>

                {/* Forgot password */}
                <Pressable
                    onPress={() => router.push('/(auth)/forgot-password')}
                    style={{ alignSelf: 'flex-end', marginBottom: 24 }}
                >
                    <Text style={{ color: ORANGE, fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
                </Pressable>

                {/* Login button */}
                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.85}
                    style={{
                        backgroundColor: ORANGE,
                        borderRadius: 12,
                        paddingVertical: 14,
                        alignItems: 'center',
                        opacity: isLoading ? 0.7 : 1,
                        marginBottom: 20,
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                        {isLoading ? 'Logging in...' : 'Log in'}
                    </Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#2a2a2a' }} />
                    <Text style={{ color: '#6b7280', fontSize: 13 }}>or</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: '#2a2a2a' }} />
                </View>

                {/* Google */}
                <GoogleSignInButton />

                {/* Sign up link */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32, gap: 6 }}>
                    <Text style={{ color: '#9ca3af', fontSize: 15 }}>Don't have an account?</Text>
                    <Link href="/signup" asChild>
                        <Pressable>
                            <Text style={{ color: ORANGE, fontWeight: '700', fontSize: 15 }}>Sign up</Text>
                        </Pressable>
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
