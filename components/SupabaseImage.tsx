import { supabase } from '@/lib/supabase';
import { Image, ImageStyle, StyleProp, View, Text } from 'react-native';

function isDirectUri(path: string): boolean {
  return (
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('file://')
  );
}

function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export default function SupabaseImage({
  bucket,
  path,
  className,
  style,
  transform: _transform,
}: {
  bucket: string;
  path?: string | null;
  className?: string;
  style?: StyleProp<ImageStyle>;
  transform?: { width: number; height: number };
}) {
  if (!path) {
    // For avatars with no image, show a bird emoji placeholder
    if (bucket === 'avatars') {
      const emojiSize = _transform ? _transform.width * 0.5 : 22;
      return (
        <View
          className={className}
          style={[
            { backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
            style,
          ]}
        >
          <Text style={{ fontSize: emojiSize }}>🐦</Text>
        </View>
      );
    }
    return (
      <Image
        source={undefined}
        className={className ? `${className} bg-neutral-900` : undefined}
        style={[{ backgroundColor: '#1a1a1a' }, style]}
      />
    );
  }

  const uri = isDirectUri(path) ? path : getPublicUrl(bucket, path);

  return (
    <Image
      source={{ uri }}
      className={className ? `${className} bg-neutral-900` : undefined}
      style={[{ backgroundColor: '#1a1a1a' }, style]}
    />
  );
}
