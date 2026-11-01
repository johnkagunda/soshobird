import { View, Pressable, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import SupabaseImage from './SupabaseImage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/providers/AuthProvider';

export default function UserAvatarPicker({
  currentAvatar,
  onUpload,
}: {
  currentAvatar: string;
  onUpload: (path: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  async function uploadAvatar() {
    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const image = result.assets[0];
      if (!image.uri) throw new Error('No image URI returned');

      const mimeType = image.mimeType ?? 'image/jpeg';
      // Derive extension from mimeType — blob: URIs on web don't have file extensions
      const fileExt = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      const path = `${user?.id ?? 'anon'}/${Date.now()}.${fileExt}`;

      const arrayBuffer = await fetch(image.uri).then((r) => r.arrayBuffer());

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) throw error;
      onUpload(data.path);
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Could not upload avatar');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Pressable onPress={uploadAvatar} disabled={uploading} className="self-center">
      <View className="relative">
        <SupabaseImage
          bucket="avatars"
          path={currentAvatar}
          className="w-24 h-24 rounded-full"
          transform={{ width: 96, height: 96 }}
        />
        {/* Edit overlay */}
        <View className="absolute bottom-0 right-0 bg-brand rounded-full p-1.5 border-2 border-surface">
          {uploading
            ? <ActivityIndicator size={14} color="#fff" />
            : <Ionicons name="camera" size={14} color="#fff" />
          }
        </View>
      </View>
    </Pressable>
  );
}
