import { useQuery } from '@tanstack/react-query';
import { getProfileById } from '@/services/profile';
import { View, Text, ActivityIndicator, Pressable, Share } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { Link, router } from 'expo-router';
import SupabaseImage from './SupabaseImage';
import { Feather, Ionicons } from '@expo/vector-icons';

export default function ProfileHeader() {
  const { user } = useAuth();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getProfileById(user!.id),
    enabled: !!user,
  });

  if (isLoading) return <ActivityIndicator color="#f97316" />;
  if (error) return <Text className="text-red-400 p-4">Error: {error.message}</Text>;

  const handleShareProfile = async () => {
    try {
      await Share.share({ message: `Check out ${profile?.full_name ?? 'my profile'}!` });
    } catch (_) {}
  };

  return (
    <View className="bg-surface px-4 pt-6 pb-4">
      {/* Avatar + buttons */}
      <View className="flex-row items-center justify-between">
        <SupabaseImage
          bucket="avatars"
          path={profile?.avatar_url}
          className="w-20 h-20 rounded-full border-2 border-brand"
          transform={{ width: 80, height: 80 }}
        />
        <View className="flex-row gap-2">
          <Link href="/profile/edit" asChild>
            <Pressable className="px-4 py-2 rounded-full border border-surface-border bg-surface-raised">
              <Text className="text-white font-semibold text-sm">Edit Profile</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {/* Name + verified */}
      <View className="mt-4 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-2xl font-bold">
            {profile?.full_name || 'User'}
          </Text>
          {profile?.is_verified && (
            <Ionicons name="checkmark-circle" size={18} color="#f97316" />
          )}
        </View>
        <Text className="text-neutral-400 text-sm">
          @{profile?.username?.toLowerCase() || 'edit your profile'}
        </Text>
      </View>

      {/* Bio */}
      {profile?.bio ? (
        <Text className="text-neutral-200 mt-2 leading-snug text-sm">{profile.bio}</Text>
      ) : null}

      {/* Location / Website / Joined */}
      <View className="gap-1 mt-2">
        <View className="flex-row gap-4 flex-wrap">
          {profile?.location && (
            <View className="flex-row items-center gap-1">
              <Feather name="map-pin" size={13} color="#6b7280" />
              <Text className="text-neutral-400 text-xs">{profile.location}</Text>
            </View>
          )}
          {profile?.website && (
            <View className="flex-row items-center gap-1">
              <Feather name="link" size={13} color="#6b7280" />
              <Text className="text-brand text-xs">{profile.website}</Text>
            </View>
          )}
        </View>
        {profile?.created_at && (
          <View className="flex-row items-center gap-1">
            <Feather name="calendar" size={13} color="#6b7280" />
            <Text className="text-neutral-500 text-xs">
              Joined{' '}
              {new Date(profile.created_at).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}
      </View>

      {/* Followers / Following — tappable */}
      <View className="flex-row gap-6 mt-3">
        <Pressable
          onPress={() =>
            router.push(`/(protected)/(tabs)/profile/${user?.id}/followers`)
          }
        >
          <Text className="text-white font-bold text-sm">
            {profile?.followers_count ?? 0}{' '}
            <Text className="text-brand font-normal">Followers</Text>
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            router.push(`/(protected)/(tabs)/profile/${user?.id}/following`)
          }
        >
          <Text className="text-white font-bold text-sm">
            {profile?.following_count ?? 0}{' '}
            <Text className="text-brand font-normal">Following</Text>
          </Text>
        </Pressable>
      </View>

      {/* Share profile */}
      <Pressable
        onPress={handleShareProfile}
        className="mt-4 py-2 rounded-full border border-surface-border bg-surface-raised"
      >
        <Text className="text-center text-neutral-300 text-sm font-medium">
          Share Profile
        </Text>
      </Pressable>
    </View>
  );
}
