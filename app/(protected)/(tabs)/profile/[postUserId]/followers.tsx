import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getFollowers } from '@/services/profile';
import SupabaseImage from '@/components/SupabaseImage';

export default function FollowersScreen() {
  const { postUserId } = useLocalSearchParams<{ postUserId: string }>();

  const { data: followers = [], isLoading } = useQuery({
    queryKey: ['followers', postUserId],
    queryFn: () => getFollowers(postUserId),
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#f97316" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <FlatList
        data={followers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push(
                `/(protected)/(tabs)/profile/${item.id}?username=${encodeURIComponent(
                  item.username ?? ''
                )}`
              )
            }
            className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-border active:opacity-70"
          >
            <SupabaseImage
              bucket="avatars"
              path={item.avatar_url}
              className="w-12 h-12 rounded-full"
              transform={{ width: 48, height: 48 }}
            />
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">
                {item.full_name || 'User'}
              </Text>
              <Text className="text-neutral-400 text-sm">
                @{(item.username ?? '').toLowerCase() || 'unknown'}
              </Text>
              {item.bio ? (
                <Text className="text-neutral-500 text-xs mt-0.5" numberOfLines={1}>
                  {item.bio}
                </Text>
              ) : null}
            </View>
            <Text className="text-neutral-600 text-xs">›</Text>
          </Pressable>
        )}
        ListEmptyComponent={() => (
          <View className="items-center mt-16 gap-2">
            <Text className="text-neutral-300 text-base font-semibold">No followers yet</Text>
            <Text className="text-neutral-500 text-sm">When someone follows this account, they'll appear here.</Text>
          </View>
        )}
      />
    </View>
  );
}
