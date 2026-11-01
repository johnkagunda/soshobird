import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Generate a unique username from the email prefix.
 * e.g. "john.doe@example.com" → "johndoe" or "johndoe4821" if taken.
 */
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

    if (!data) return username; // available

    // Taken — append random 4-digit number
    username = `${base}${Math.floor(Math.random() * 9000) + 1000}`;
  }

  // Fallback after 10 attempts
  return `${base}${Date.now().toString().slice(-6)}`;
}

export default function SignUpScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async () => {
        if (!email || !password) {
            Alert.alert('Please enter an email and password');
            return;
        }

        try {
            setIsLoading(true);

            const username = await generateUniqueUsername(email);

            const {
                data: { session },
                error,
            } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { username } },
            });

            if (error) Alert.alert(error.message);

            if (!session)
                Alert.alert('Please check your inbox for email verification!');
        } catch (error) {
            console.error('Login error:', error);
            // TODO: Add proper error handling
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <ScrollView className='mb-4'>
                <KeyboardAvoidingView
                    className="flex-1 bg-black"
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View className="flex-1 justify-center px-6">
                        {/* SoshoBird Logo and Title */}
                        <View className="items-center mb-10">
                            <Image
                                source={require('@/assets/images/icon.png')}
                                style={{ width: 120, height: 120 }}
                                resizeMode="contain"
                            />
                            <Text className="text-4xl font-black text-white tracking-tight mb-2">SoshoBird</Text>
                        </View>

                        <View className="w-full max-w-sm mx-auto">
                            <View className="mb-6">
                                <Text className="text-2xl font-bold text-white mb-2 text-center">Create an account</Text>
                                <Text className="text-neutral-400 text-base text-center">
                                    Enter your email and password to sign up.
                                </Text>
                            </View>

                            <View className="gap-4">
                                <View>
                                    <TextInput
                                        className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-500 text-base"
                                        placeholder="Email address"
                                        placeholderTextColor="#6B7280"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoFocus
                                    />
                                </View>

                                <View>
                                    <TextInput
                                        className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-500 text-base"
                                        placeholder="Password"
                                        placeholderTextColor="#6B7280"
                                        secureTextEntry
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                </View>

                                <TouchableOpacity
                                    className="w-full bg-white py-3 rounded-xl mt-4"
                                    activeOpacity={0.8}
                                    onPress={handleSignUp}
                                    disabled={isLoading}
                                >
                                    <Text className="text-black text-center font-semibold text-base">
                                        {isLoading ? 'Signing up...' : 'Sign up'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row justify-center mt-8">
                                <Text className="text-neutral-400 text-base">Already have an account? </Text>
                                <Link href="/login" asChild>
                                    <Pressable>
                                        <Text className="text-blue-400 font-semibold text-base">Sign in</Text>
                                    </Pressable>
                                </Link>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </ScrollView>
        </>
    );
}