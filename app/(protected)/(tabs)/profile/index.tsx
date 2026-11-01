import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { getPostsByUserId } from '@/services/posts';
import PostListItem from '@/components/PostListItem';
import ProfileHeader from '@/components/ProfileHeader';

export default function ProfileScreen() {
  const { user } = useAuth();

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', { user_id: user?.id }],
    queryFn: () => getPostsByUserId(user!.id),
    enabled: !!user,
  });

  return (
    <View className="flex-1 bg-surface">
      <FlatList
        data={posts ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostListItem post={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={() => (
          <>
            <ProfileHeader />
            <Text className="text-white text-sm font-semibold px-4 py-3 border-b border-surface-border">
              Posts
            </Text>
          </>
        )}
        ListEmptyComponent={() =>
          isLoading ? (
            <ActivityIndicator color="#f97316" className="mt-10" />
          ) : (
            <Text className="text-neutral-500 text-center mt-10">No posts yet.</Text>
          )
        }
      />
    </View>
  );
}
