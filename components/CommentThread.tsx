import { View, Text, Pressable, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SupabaseImage from './SupabaseImage';
import PostMenu from './PostMenu';
import { likePost, unlikePost, getUserLike } from '@/services/posts';
import { useAuth } from '@/providers/AuthProvider';

dayjs.extend(relativeTime);

const MAX_INITIAL_REPLIES = 1; // show first reply, rest behind "more replies"

// ─── Action row shared by all rows ───────────────────────────────────────────

function ActionRow({
  post,
  onReplyPress,
}: {
  post: any;
  onReplyPress: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [optimisticOffset, setOptimisticOffset] = useState(0);

  const { data: liked = false } = useQuery({
    queryKey: ['likes', post.id, user?.id],
    queryFn: () => getUserLike(post.id, user!.id),
    enabled: !!user,
    staleTime: 0,
  });

  const dbCount: number = post.likes_count ?? 0;

  useEffect(() => {
    setOptimisticOffset(0);
  }, [dbCount]);

  const { mutate: toggleLike, isPending } = useMutation({
    mutationFn: () =>
      liked ? unlikePost(post.id, user!.id) : likePost(post.id, user!.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['likes', post.id, user?.id] });
      const prev = queryClient.getQueryData<boolean>(['likes', post.id, user?.id]);
      queryClient.setQueryData(['likes', post.id, user?.id], !liked);
      setOptimisticOffset(liked ? -1 : 1);
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      queryClient.setQueryData(['likes', post.id, user?.id], ctx?.prev);
      setOptimisticOffset(0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['likes', post.id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const displayCount = dbCount + optimisticOffset;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8 }}>
      <Pressable
        onPress={() => toggleLike()}
        disabled={isPending}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={16}
          color={liked ? '#f97316' : '#6b7280'}
        />
        <Text style={{ color: '#6b7280', fontSize: 12 }}>{displayCount}</Text>
      </Pressable>

      <Pressable
        onPress={onReplyPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Ionicons name="chatbubble-outline" size={15} color="#6b7280" />
        <Text style={{ color: '#6b7280', fontSize: 12 }}>{post.replies_count ?? 0}</Text>
      </Pressable>

      <Pressable
        onPress={() =>
          Share.share({
            message: `${post.user?.full_name ?? 'Someone'} on SoshoBird: "${post.content ?? ''}"`,
          })
        }
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      >
        <Ionicons name="paper-plane-outline" size={15} color="#6b7280" />
      </Pressable>
    </View>
  );
}

// ─── One comment/reply row ────────────────────────────────────────────────────
// Single source of truth for layout — avatar rendered HERE only, never duplicated.

function CommentRow({
  post,
  postAuthorId,
  replyTargetName,   // name of the person being replied to (for @tag)
  onReplyPress,
  showLine = false,  // draw vertical line below avatar
}: {
  post: any;
  postAuthorId: string;
  replyTargetName?: string | null;
  onReplyPress: () => void;
  showLine?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const isAuthor = post.user_id === postAuthorId;
  const isOwnPost = user?.id === post.user_id;

  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {/* Avatar + optional vertical line */}
      <View style={{ alignItems: 'center', width: 36 }}>
        <Pressable
          onPress={() =>
            router.push(
              `/(protected)/(tabs)/profile/${post.user?.id}?username=${encodeURIComponent(
                post.user?.username ?? ''
              )}`
            )
          }
        >
          <SupabaseImage
            bucket="avatars"
            path={post.user?.avatar_url}
            style={{ width: 36, height: 36, borderRadius: 18 }}
            transform={{ width: 36, height: 36 }}
          />
        </Pressable>
        {showLine && (
          <View style={{
            width: 2,
            flex: 1,
            minHeight: 12,
            marginTop: 4,
            backgroundColor: '#374151',
            borderRadius: 1,
          }} />
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, paddingBottom: 4 }}>
        {/* Name row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginBottom: 1 }}>
          <Pressable
            onPress={() =>
              router.push(
                `/(protected)/(tabs)/profile/${post.user?.id}?username=${encodeURIComponent(
                  post.user?.username ?? ''
                )}`
              )
            }
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {post.user?.full_name ?? 'User'}
            </Text>
          </Pressable>

          {isAuthor && (
            <View style={{
              backgroundColor: '#1d4ed8',
              borderRadius: 4,
              paddingHorizontal: 5,
              paddingVertical: 1,
            }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Author</Text>
            </View>
          )}

          <Text style={{ color: '#6b7280', fontSize: 12 }}>
            {dayjs(post.created_at).fromNow(true)}
          </Text>

          <View style={{ flex: 1 }} />

          <PostMenu
            postId={post.id}
            postContent={post.content}
            authorName={post.user?.full_name}
            createdAt={post.created_at}
            isOwnPost={isOwnPost}
          />
        </View>

        {/* @username */}
        <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>
          @{(post.user?.username ?? '').toLowerCase()}
        </Text>

        {/* Reply-to @mention tag */}
        {replyTargetName && (
          <Text style={{ color: '#f97316', fontSize: 13, marginBottom: 4 }}>
            @{replyTargetName.toLowerCase()}
          </Text>
        )}

        {/* Post content */}
        {!!post.content && (
          <Text style={{ color: '#e5e7eb', fontSize: 14, lineHeight: 20 }}>
            {post.content}
          </Text>
        )}

        {/* Images */}
        {Array.isArray(post.images) && post.images.length > 0 && (
          <View style={{ marginTop: 6, borderRadius: 10, overflow: 'hidden' }}>
            {post.images.map((img: string) => (
              <SupabaseImage
                key={img}
                bucket="media"
                path={img}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 10 }}
                transform={{ width: 400, height: 400 }}
              />
            ))}
          </View>
        )}

        <ActionRow post={post} onReplyPress={onReplyPress} />
      </View>
    </View>
  );
}

// ─── Full comment card with nested replies ────────────────────────────────────

export default function CommentThread({
  comment,
  allReplies,
  postAuthorId,
  onReplyToComment,
}: {
  comment: any;
  allReplies: any[];      // all nested replies across all top-level comments
  postAuthorId: string;
  onReplyToComment: (commentId: string, username: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Nested replies that target this comment
  const nested = allReplies.filter(
    (r) => r.reply_to_id === comment.id
  );

  // Build a lookup: reply.id → the name of who it's replying to
  // (the comment itself for direct replies, or another reply's author for chained ones)
  const replyTargetMap = new Map<string, string>();
  nested.forEach((r) => {
    if (r.reply_to_id === comment.id) {
      replyTargetMap.set(r.id, comment.user?.username ?? '');
    } else {
      const target = nested.find((n) => n.id === r.reply_to_id);
      if (target) replyTargetMap.set(r.id, target.user?.username ?? '');
    }
  });

  const visibleReplies = expanded ? nested : nested.slice(0, MAX_INITIAL_REPLIES);
  const hiddenCount = nested.length - MAX_INITIAL_REPLIES;

  return (
    <View style={{
      backgroundColor: '#141414',
      borderRadius: 16,
      marginHorizontal: 12,
      marginBottom: 10,
      paddingTop: 12,
      paddingHorizontal: 12,
      paddingBottom: 8,
      borderWidth: 1,
      borderColor: '#262626',
    }}>
      {/* Top-level comment — line drawn only when there are nested replies */}
      <CommentRow
        post={comment}
        postAuthorId={postAuthorId}
        onReplyPress={() => onReplyToComment(comment.id, comment.user?.username ?? 'user')}
        showLine={nested.length > 0}
      />

      {/* Nested replies */}
      {visibleReplies.map((reply, idx) => (
        <View key={reply.id} style={{ flexDirection: 'row', marginTop: 10 }}>
          {/* Indent + optional continuing line */}
          <View style={{ width: 36, marginRight: 10, alignItems: 'center' }}>
            {idx < visibleReplies.length - 1 && (
              <View style={{
                position: 'absolute',
                top: 0, bottom: 0,
                width: 2,
                backgroundColor: '#374151',
                borderRadius: 1,
              }} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <CommentRow
              post={reply}
              postAuthorId={postAuthorId}
              replyTargetName={replyTargetMap.get(reply.id)}
              onReplyPress={() => onReplyToComment(comment.id, comment.user?.username ?? 'user')}
              showLine={false}
            />
          </View>
        </View>
      ))}

      {/* "X more replies" / "Hide replies" toggle */}
      {nested.length > MAX_INITIAL_REPLIES && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 46 }}
        >
          <View style={{ width: 20, height: 1.5, backgroundColor: '#374151', borderRadius: 1 }} />
          <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '600' }}>
            {expanded
              ? 'Hide replies'
              : `${hiddenCount} more repl${hiddenCount === 1 ? 'y' : 'ies'}`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
