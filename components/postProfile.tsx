import { View, Text, Pressable, Share } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { Link, router } from 'expo-router';
import SupabaseImage from './SupabaseImage';
import { Feather, Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getIsFollowing,
  followUser,
  unfollowUser,
  getProfileById,
} from '@/services/profile';

export default function PostProfileHeader({ profile: initialProfile }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwnProfile = user?.id === initialProfile?.id;

  // Always fetch fresh profile so counts are up-to-date
  const { data: profile } = useQuery({
    queryKey: ['profile', initialProfile?.id],
    queryFn: () => getProfileById(initialProfile!.id),
    initialData: initialProfile,
    enabled: !!initialProfile?.id,
  });

  // DB-backed follow state — always accurate on mount
  const { data: isFollowing = false } = useQuery({
    queryKey: ['follows', user?.id, profile?.id],
    queryFn: () => getIsFollowing(user!.id, profile!.id),
    enabled: !!user && !!profile?.id && !isOwnProfile,
  });

  const { mutate: toggleFollow, isPending } = useMutation({
    mutationFn: () =>
      isFollowing
        ? unfollowUser(user!.id, profile!.id)
        : followUser(user!.id, profile!.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['follows', user?.id, profile?.id] });
      await queryClient.cancelQueries({ queryKey: ['profile', profile?.id] });

      const prevFollow = queryClient.getQueryData<boolean>(['follows', user?.id, profile?.id]);
      const prevProfile = queryClient.getQueryData<any>(['profile', profile?.id]);

      // Optimistic: flip follow state
      queryClient.setQueryData(['follows', user?.id, profile?.id], !isFollowing);

      // Optimistic: update follower count in profile cache
      queryClient.setQueryData(['profile', profile?.id], (old: any) =>
        old
          ? { ...old, followers_count: old.followers_count + (isFollowing ? -1 : 1) }
          : old
      );

      return { prevFollow, prevProfile };
    },
    onError: (_e, _v, ctx: any) => {
      queryClient.setQueryData(['follows', user?.id, profile?.id], ctx?.prevFollow);
      queryClient.setQueryData(['profile', profile?.id], ctx?.prevProfile);
    },
    onSettled: () => {
      // Refetch both to get the real DB value
      queryClient.invalidateQueries({ queryKey: ['follows', user?.id, profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['followers', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate('/(auth)/login');
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${profile?.full_name ?? 'this'}!`,
      });
    } catch (_) {}
  };

  if (!profile) return null;

  return (
    <View className="bg-surface px-4 pt-6 pb-4">
      {/* Avatar + action button */}
      <View className="flex-row items-center justify-between">
        <SupabaseImage
          bucket="avatars"
          path={profile.avatar_url}
          className="w-20 h-20 rounded-full border-2 border-brand"
          transform={{ width: 80, height: 80 }}
        />

        {isOwnProfile ? (
          <View className="flex-row gap-2">
            <Link href="/profile/edit" asChild>
              <Pressable className="px-4 py-2 rounded-full border border-surface-border bg-surface-raised">
                <Text className="text-white font-semibold text-sm">Edit Profile</Text>
              </Pressable>
            </Link>
            <Pressable
              onPress={handleLogout}
              className="px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40"
            >
              <Text className="text-red-400 font-semibold text-sm">Log out</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            disabled={isPending}
            onPress={() => toggleFollow()}
            className={`px-6 py-2 rounded-full border ${
              isFollowing
                ? 'bg-surface-raised border-surface-border'
                : 'bg-brand border-brand'
            } ${isPending ? 'opacity-50' : ''}`}
          >
            <Text
              className={`font-semibold text-sm ${
                isFollowing ? 'text-neutral-300' : 'text-white'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Name + verified */}
      <View className="mt-4 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-white text-2xl font-bold">
            {profile.full_name || 'User'}
          </Text>
          {profile.is_verified && (
            <Ionicons name="checkmark-circle" size={18} color="#f97316" />
          )}
        </View>
        <Text className="text-neutral-400 text-sm">
          @{profile.username?.toLowerCase() || 'unknown'}
        </Text>
      </View>

      {/* Bio */}
      {profile.bio ? (
        <Text className="text-neutral-200 mt-2 leading-snug text-sm">{profile.bio}</Text>
      ) : null}

      {/* Location / Website / Joined */}
      <View className="gap-1 mt-2">
        <View className="flex-row gap-4 flex-wrap">
          {profile.location ? (
            <View className="flex-row items-center gap-1">
              <Feather name="map-pin" size={13} color="#6b7280" />
              <Text className="text-neutral-400 text-xs">{profile.location}</Text>
            </View>
          ) : null}
          {profile.website ? (
            <View className="flex-row items-center gap-1">
              <Feather name="link" size={13} color="#6b7280" />
              <Text className="text-brand text-xs">{profile.website}</Text>
            </View>
          ) : null}
        </View>
        {profile.created_at ? (
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
        ) : null}
      </View>

      {/* Followers / Following — tappable, sourced from live profile query */}
      <View className="flex-row gap-6 mt-3">
        <Pressable
          onPress={() =>
            router.push(`/(protected)/(tabs)/profile/${profile.id}/followers`)
          }
        >
          <Text className="text-white font-bold text-sm">
            {profile.followers_count ?? 0}{' '}
            <Text className="text-brand font-normal">Followers</Text>
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push(`/(protected)/(tabs)/profile/${profile.id}/following`)
          }
        >
          <Text className="text-white font-bold text-sm">
            {profile.following_count ?? 0}{' '}
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
