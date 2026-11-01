import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import SupabaseImage from './SupabaseImage';
import PostMenu from './PostMenu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { likePost, unlikePost, getUserLike } from '@/services/posts';
import { useAuth } from '@/providers/AuthProvider';
import { useState, useEffect } from 'react';

dayjs.extend(relativeTime);

export default function PostDetails({
  post,
  onReplyPress,
}: {
  post: any;
  onReplyPress?: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: liked = false } = useQuery({
    queryKey: ['likes', post.id, user?.id],
    queryFn: () => getUserLike(post.id, user!.id),
    enabled: !!user,
    staleTime: 30_000, // cache for 30s — avoid constant refetches
  });

  const dbCount: number = post.likes_count ?? 0;
  const [optimisticOffset, setOptimisticOffset] = useState(0);
  const [localLiked, setLocalLiked] = useState<boolean | null>(null);

  // localLiked overrides the query result while pending
  const displayLiked = localLiked !== null ? localLiked : liked;
  const displayCount = dbCount + optimisticOffset;

  const { mutate: toggleLike, isPending } = useMutation({
    mutationFn: () =>
      liked ? unlikePost(post.id, user!.id) : likePost(post.id, user!.id),
    onMutate: async () => {
      // Cancel any in-flight refetches that would overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['likes', post.id, user?.id] });
      await queryClient.cancelQueries({ queryKey: ['posts', post.id] });
      const prevLiked = liked;
      const prevOffset = optimisticOffset;
      // Flip liked state and count immediately
      setLocalLiked(!liked);
      setOptimisticOffset(liked ? -1 : 1);
      return { prevLiked, prevOffset };
    },
    onError: (_err, _vars, ctx: any) => {
      // Roll back on error
      setLocalLiked(ctx?.prevLiked ?? null);
      setOptimisticOffset(ctx?.prevOffset ?? 0);
    },
    onSuccess: () => {
      // Update the likes cache with the correct value
      queryClient.setQueryData(['likes', post.id, user?.id], !liked);
    },
    onSettled: () => {
      setLocalLiked(null);
      setOptimisticOffset(0);
      // Only refetch this specific post, not the whole feed
      queryClient.invalidateQueries({ queryKey: ['likes', post.id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts', post.id] });
    },
  });

  const isOwnPost = user?.id === post.user_id;

  return (
    <View className="bg-surface p-4 border-b border-surface-border gap-3">
      {/* Author */}
      <View className="flex-row items-center gap-3">
        <SupabaseImage
          bucket="avatars"
          path={post.user?.avatar_url}
          className="w-12 h-12 rounded-full"
          transform={{ width: 50, height: 50 }}
        />
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{post.user?.full_name}</Text>
          <Text className="text-neutral-400 text-sm">
            @{(post.user?.username ?? '').toLowerCase()}
          </Text>
        </View>
        <Text className="text-neutral-600 text-xs">{dayjs(post.created_at).fromNow()}</Text>

        {/* Three-dot menu */}
        <PostMenu
          postId={post.id}
          postContent={post.content}
          authorName={post.user?.full_name}
          createdAt={post.created_at}
          isOwnPost={isOwnPost}
        />
      </View>

      {/* Content */}
      <Text className="text-neutral-100 text-base leading-relaxed">{post.content}</Text>

      {/* Images */}
      {Array.isArray(post.images) && post.images.length > 0 && (
        <View className="flex-row gap-2">
          {post.images.map((image: string) => (
            <SupabaseImage
              key={image}
              bucket="media"
              path={image}
              className="w-full aspect-square rounded-xl"
              transform={{ width: 800, height: 800 }}
            />
          ))}
        </View>
      )}

      {/* Stats */}
      <View className="flex-row gap-4 py-2 border-t border-b border-surface-border">
        <Text className="text-neutral-400 text-sm">
          <Text className="text-white font-semibold">{displayCount}</Text>
          {' likes'}
        </Text>
        <Text className="text-neutral-400 text-sm">
          <Text className="text-white font-semibold">
            {post?.replies_count ?? 0}
          </Text>
          {' replies'}
        </Text>
      </View>

      {/* Actions */}
      <View className="flex-row gap-8">
        <Pressable
          className="flex-row items-center gap-2"
          disabled={isPending}
          onPress={() => toggleLike()}
        >
          <Ionicons
            name={displayLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={displayLiked ? '#f97316' : '#6b7280'}
          />
          <Text className={displayLiked ? 'text-brand font-semibold' : 'text-neutral-400'}>
            {displayLiked ? 'Liked' : 'Like'}
          </Text>
        </Pressable>

        <Pressable className="flex-row items-center gap-2" onPress={onReplyPress}>
          <Ionicons name="chatbubble-outline" size={22} color="#6b7280" />
          <Text className="text-neutral-400">Reply</Text>
        </Pressable>
      </View>
    </View>
  );
}
