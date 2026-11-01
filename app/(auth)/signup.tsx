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
import { Link } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import GoogleSignInButton from '@/components/GoogleSignInButton';

const ORANGE = '#f97316';

async function generateUniqueUsername(email: string): Promise<string> {
    const base = email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);

    if (!base) return `user${Math.floor(Math.random() * 90000) + 10000}`;

    let username = base;
    for (let i = 0; i < 10; i++) {
        const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle();
        if (!data) return username;
        username = `${base}${Math.floor(Math.random() * 9000) + 1000}`;
    }
    return `${base}${Date.now().toString().slice(-6)}`;
}

export default function SignUpScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    const handleSignUp = async () => {
        setError('');
        setSuccess('');
        if (!email || !password) {
            setError('Please enter your email and password.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        try {
            setIsLoading(true);
            const username = await generateUniqueUsername(email);
            const { data: { session }, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { username } },
            });
            if (authError) {
                setError(authError.message);
            } else if (!session) {
                setSuccess('Check your inbox to verify your email before logging in.');
            }
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
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4, textAlign: 'center' }}>
                        Create an account
                    </Text>
                    <Text style={{ fontSize: 15, color: '#9ca3af', textAlign: 'center' }}>
                        Join SoshoBird today.
                    </Text>
                </View>

                {/* Error */}
                {!!error && (
                    <View style={{ backgroundColor: '#7f1d1d30', borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                        <Text style={{ color: '#ef4444', fontSize: 14 }}>{error}</Text>
                    </View>
                )}

                {/* Success */}
                {!!success && (
                    <View style={{ backgroundColor: '#14532d30', borderWidth: 1, borderColor: '#22c55e', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                        <Text style={{ color: '#22c55e', fontSize: 14 }}>{success}</Text>
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
                <View style={{ marginBottom: 28 }}>
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
                            placeholder="At least 6 characters"
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

                {/* Sign up button */}
                <TouchableOpacity
                    onPress={handleSignUp}
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
                        {isLoading ? 'Creating account...' : 'Sign up'}
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

                {/* Login link */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32, gap: 6 }}>
                    <Text style={{ color: '#9ca3af', fontSize: 15 }}>Already have an account?</Text>
                    <Link href="/login" asChild>
                        <Pressable>
                            <Text style={{ color: ORANGE, fontWeight: '700', fontSize: 15 }}>Log in</Text>
                        </Pressable>
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
