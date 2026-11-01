import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/providers/AuthProvider';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { createPost } from '@/services/posts';
import * as ImagePicker from 'expo-image-picker';
import SupabaseImage from '@/components/SupabaseImage';

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  // On web the URI is already a blob/data URL — fetch handles it fine.
  // On native it's a file:// URI — fetch also handles it.
  const response = await fetch(uri);
  return response.arrayBuffer();
}

export default function NewPostScreen() {
  const [text, setText] = useState('');
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const uploadImage = async (): Promise<string | undefined> => {
    if (!image) return;

      const mimeType = image.mimeType ?? 'image/jpeg';
      // Derive extension from mimeType — blob: URIs don't have file extensions
      const fileExt = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      const path = `${user!.id}/${Date.now()}.${fileExt}`;

    const arrayBuffer = await uriToArrayBuffer(image.uri);

    const { data, error } = await supabase.storage
      .from('media')
      .upload(path, arrayBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) throw error;
    return data.path;
  };

  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const imagePath = image ? await uploadImage() : undefined;
      return createPost({
        content: text.trim(),
        user_id: user.id,
        images: imagePath ? [imagePath] : [],
      });
    },
    onSuccess: () => {
      setText('');
      setImage(null);
      router.back();
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (err: Error) => {
      Alert.alert('Error posting', err.message);
    },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} className="flex-1 bg-surface px-5">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 140 : 0}
      >
        {/* Header — close + title + post button */}
        <View className="flex-row items-center justify-between py-3 border-b border-surface-border">
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
            <Text className="text-white text-lg font-bold">New Sosho</Text>
          </View>
          <Pressable
            onPress={() => mutate()}
            disabled={isPending || !text.trim()}
            className={`px-5 py-2 rounded-full ${
              isPending || !text.trim() ? 'bg-brand/40' : 'bg-brand'
            }`}
          >
            <Text className="text-white font-bold text-sm">
              {isPending ? 'Posting…' : 'Post'}
            </Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 mt-4" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="flex-row gap-3">
            <SupabaseImage
              bucket="avatars"
              path={profile?.avatar_url}
              className="w-11 h-11 rounded-full"
              transform={{ width: 44, height: 44 }}
            />
            <View className="flex-1">
              <Text className="text-white font-bold text-base mb-1">
                {profile?.full_name ?? 'You'}
              </Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="What's on your mind?"
                placeholderTextColor="#6b7280"
                className="text-white text-base"
                multiline
                autoFocus
                style={{ textAlignVertical: 'top', maxHeight: 200, minHeight: 80, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}
              />

              {/* Selected image preview */}
              {image && (
                <View className="mt-2 mb-3">
                  <Image
                    source={{ uri: image.uri }}
                    className="w-full rounded-xl"
                    style={{
                      aspectRatio: image.width && image.height
                        ? image.width / image.height
                        : 1,
                      maxHeight: 260,
                      backgroundColor: '#1a1a1a',
                    }}
                  />
                  <Pressable
                    onPress={() => setImage(null)}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </Pressable>
                </View>
              )}

              {/* Toolbar */}
              <View className="flex-row items-center gap-3 mt-2">
                <Pressable
                  onPress={pickImage}
                  className="flex-row items-center gap-1 p-2 rounded-full bg-surface-raised"
                >
                  <Entypo name="images" size={20} color="#f97316" />
                  <Text className="text-neutral-400 text-xs">Photo</Text>
                </Pressable>
              </View>

              {error && (
                <Text className="text-red-400 text-sm mt-2">{error.message}</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
