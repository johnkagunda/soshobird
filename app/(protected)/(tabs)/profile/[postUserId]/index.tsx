import { useLocalSearchParams } from 'expo-router';
import { View, Text, ActivityIndicator, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import PostListItem from '@/components/PostListItem';
import { getProfileById } from '@/services/profile';
import { getPostsByUserId } from '@/services/posts';
import PostProfileHeader from '@/components/postProfile';

export default function UserProfileScreen() {
  const { postUserId } = useLocalSearchParams<{ postUserId: string }>();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', postUserId],
    queryFn: () => getProfileById(postUserId),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['posts', { user_id: postUserId }],
    queryFn: () => getPostsByUserId(postUserId),
  });

  if (profileLoading || postsLoading) {
    return <ActivityIndicator color="#f97316" className="mt-10" />;
  }

  return (
    <View className="flex-1 bg-surface">
      <FlatList
        data={posts ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostListItem post={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={() => (
          <>
            <PostProfileHeader profile={profile} />
            <Text className="text-white text-sm font-semibold px-4 py-3 border-b border-surface-border">
              Posts
            </Text>
          </>
        )}
        ListEmptyComponent={() => (
          <Text className="text-neutral-500 text-center mt-10">No posts yet.</Text>
        )}
      />
    </View>
  );
}
