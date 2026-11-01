import PostReplyInput, { PostReplyInputRef } from '@/components/PostReplyInput';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { View, Text, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPostById, getPostsReplies } from '@/services/posts';
import PostDetails from '@/components/PostDetails';
import CommentThread from '@/components/CommentThread';
import PostListItem from '@/components/PostListItem';
import { useRef, useState, useCallback, useMemo } from 'react';

export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const replyInputRef = useRef<PostReplyInputRef>(null);
  const insets = useSafeAreaInsets();

  const [replyTo, setReplyTo] = useState<{ postId: string; username: string } | null>(null);

  const focusReply = useCallback((commentId: string, username: string) => {
    setReplyTo({ postId: commentId, username });
    replyInputRef.current?.focus();
  }, []);

  const clearReplyTo = useCallback(() => setReplyTo(null), []);

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['posts', id],
    queryFn: () => getPostById(id),
    staleTime: 1000 * 60 * 5,
  });

  const { data: parent } = useQuery({
    queryKey: ['posts', post?.parent_id],
    queryFn: () => getPostById(post?.parent_id || ''),
    enabled: !!post?.parent_id,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ['posts', id, 'replies'],
    queryFn: () => getPostsReplies(id),
  });

  // Split replies into top-level comments and nested replies
  // A "top-level" reply has parent_id === post.id and no reply_to_id
  // (or reply_to_id === post.id, meaning it replies to the root post)
  const { topLevel, nestedIds } = useMemo(() => {
    const replyIds = new Set((replies ?? []).map((r: any) => r.id));
    const top: any[] = [];
    const nested = new Set<string>();

    (replies ?? []).forEach((r: any) => {
      // If reply_to_id points to another reply (not the root post), it's nested
      if (r.reply_to_id && replyIds.has(r.reply_to_id)) {
        nested.add(r.id);
      } else {
        top.push(r);
      }
    });

    return { topLevel: top, nestedIds: nested };
  }, [replies]);

  // All replies that are nested under any top-level comment
  const allNestedReplies = useMemo(
    () => (replies ?? []).filter((r: any) => nestedIds.has(r.id)),
    [replies, nestedIds]
  );

  if (isLoading) return <ActivityIndicator color="#f97316" style={{ flex: 1 }} />;
  if (error) return <Text style={{ color: '#fff', padding: 16 }}>{(error as Error).message}</Text>;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0f0f0f' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={topLevel}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        renderItem={({ item }) => (
          <CommentThread
            comment={item}
            allReplies={allNestedReplies}
            postAuthorId={post?.user_id ?? ''}
            onReplyToComment={focusReply}
          />
        )}
        ListHeaderComponent={
          <View>
            {parent && <PostListItem post={parent} isLastInGroup={false} />}
            <PostDetails
              post={post}
              onReplyPress={() => {
                clearReplyTo();
                replyInputRef.current?.focus();
              }}
            />
            <View style={{
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                Comments
              </Text>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>
                {topLevel.length}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={() => (
          <View style={{ alignItems: 'center', paddingTop: 32, gap: 8 }}>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>No comments yet.</Text>
            <Text style={{ color: '#374151', fontSize: 13 }}>Be the first to reply</Text>
          </View>
        )}
      />
      <PostReplyInput
        ref={replyInputRef}
        postId={id}
        replyTo={replyTo}
        onReplyToClear={clearReplyTo}
      />
    </KeyboardAvoidingView>
  );
}
