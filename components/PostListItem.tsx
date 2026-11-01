import { View, Text, Pressable, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import SupabaseImage from './SupabaseImage';
import PostMenu from './PostMenu';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { likePost, unlikePost, getUserLike } from '@/services/posts';
import { useAuth } from '@/providers/AuthProvider';
import { useState, useEffect } from 'react';

dayjs.extend(relativeTime);

const MAX_CHARS = 200;

export default function PostListItem({
  post,
  isLastInGroup = true,
  replyToUsername,
  onReplyPress,
}: {
  post: any;
  isLastInGroup?: boolean;
  replyToUsername?: string | null;
  onReplyPress?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [optimisticOffset, setOptimisticOffset] = useState(0);

  const { data: liked = false } = useQuery({
    queryKey: ['likes', post.id, user?.id],
    queryFn: () => getUserLike(post.id, user!.id),
    enabled: !!user,
    staleTime: 0,
  });

  const dbCount: number = post.likes_count ?? 0;

  // Clear the optimistic offset once the real dbCount catches up
  useEffect(() => {
    setOptimisticOffset(0);
  }, [dbCount]);

  const { mutate: toggleLike, isPending } = useMutation({
    mutationFn: () =>
      liked ? unlikePost(post.id, user!.id) : likePost(post.id, user!.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['likes', post.id, user?.id] });
      const prevLiked = queryClient.getQueryData<boolean>(['likes', post.id, user?.id]);
      queryClient.setQueryData(['likes', post.id, user?.id], !liked);
      // `liked` is the OLD value here → +1 for a like, -1 for an unlike
      setOptimisticOffset(liked ? -1 : 1);
      return { prevLiked };
    },
    onError: (_err, _vars, ctx: any) => {
      queryClient.setQueryData(['likes', post.id, user?.id], ctx?.prevLiked);
      setOptimisticOffset(0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likes', post.id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts', post.id] });
    },
  });

  const displayCount = dbCount + optimisticOffset;
  const isOwnPost = user?.id === post.user_id;

  const content: string = post.content ?? '';
  const isLong = content.length > MAX_CHARS;
  const displayedContent = isLong && !expanded
    ? content.slice(0, MAX_CHARS)
    : content;

  return (
    <View
      className={`flex-row px-3 pt-3 pb-2 bg-surface ${
        isLastInGroup ? 'border-b border-surface-border' : ''
      }`}
    >
      {/* Avatar + reply line */}
      <View className="mr-3 items-center" style={{ width: 44 }}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            router.push(
              `/(protected)/(tabs)/profile/${post.user?.id}?username=${encodeURIComponent(
                post.user?.username ?? ''
              )}`
            );
          }}
        >
          <SupabaseImage
            bucket="avatars"
            path={post.user?.avatar_url}
            className="w-11 h-11 rounded-full"
            transform={{ width: 44, height: 44 }}
          />
        </Pressable>
        {!isLastInGroup && (
          <View className="w-[2px] flex-1 mt-1 rounded-full bg-neutral-700" />
        )}
      </View>

      {/* Content */}
      <View className="flex-1 pb-1">
        {/* Header row: name + time + menu */}
        <View className="flex-row items-center">
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              router.push(
                `/(protected)/(tabs)/profile/${post.user?.id}?username=${encodeURIComponent(
                  post.user?.username ?? ''
                )}`
              );
            }}
          >
            <Text className="text-white font-semibold text-sm">
              {post.user?.full_name}
            </Text>
          </Pressable>
          {/* Push menu to the right */}
          <View className="flex-1" />
          {/* Three-dot menu carries the timestamp */}
          <PostMenu
            postId={post.id}
            postContent={post.content}
            authorName={post.user?.full_name}
            createdAt={post.created_at}
            isOwnPost={isOwnPost}
          />
        </View>

        {/* Reply-to indicator: orange line + @username tag */}
        {replyToUsername && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <View style={{ width: 2, height: 14, backgroundColor: '#f97316', borderRadius: 1 }} />
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>
              replying to{' '}
              <Text style={{ color: '#f97316', fontWeight: '600' }}>
                @{replyToUsername.toLowerCase()}
              </Text>
            </Text>
          </View>
        )}

        {/* Username */}
        <Text className="text-neutral-500 text-xs mb-1">
          @{(post.user?.username ?? '').toLowerCase()}
        </Text>

        {/* Caption with expand */}
        <Pressable onPress={() => router.push(`/posts/${post.id}`)}>
          <Text className="text-neutral-100 text-sm leading-snug">
            {displayedContent}
            {isLong && !expanded && (
              <Text
                className="text-neutral-500"
                onPress={(e) => { e.stopPropagation(); setExpanded(true); }}
              >
                {'... '}
                <Text className="text-brand font-semibold">more</Text>
              </Text>
            )}
          </Text>
        </Pressable>

        {/* Images */}
        {Array.isArray(post.images) && post.images.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 4, borderRadius: 12, overflow: 'hidden' }}>
            {post.images.map((image: string) => (
              <SupabaseImage
                key={image}
                bucket="media"
                path={image}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
                transform={{ width: 500, height: 500 }}
              />
            ))}
          </View>
        )}

        {/* Action row */}
        <View className="flex-row items-center gap-4 mt-2">
          <Pressable
            className="flex-row items-center gap-1"
            disabled={isPending}
            onPress={(e) => { e.stopPropagation(); toggleLike(); }}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={20}
              color={liked ? '#f97316' : '#6b7280'}
            />
            <Text className="text-neutral-400 text-xs">{displayCount}</Text>
          </Pressable>

          <Pressable
            className="flex-row items-center gap-1"
            onPress={(e) => { e.stopPropagation(); onReplyPress ? onReplyPress() : router.push(`/posts/${post.id}`); }}
          >
            <Ionicons name="chatbubble-outline" size={19} color="#6b7280" />
            <Text className="text-neutral-400 text-xs">
              {post?.replies_count ?? 0}
            </Text>
          </Pressable>

          <Pressable
            className="flex-row items-center gap-1"
            onPress={(e) => {
              e.stopPropagation();
              Share.share({
                message: `${post.user?.full_name ?? 'Someone'} on SoshoBird: "${post.content ?? ''}"`,
              });
            }}
          >
            <Ionicons name="paper-plane-outline" size={19} color="#6b7280" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
